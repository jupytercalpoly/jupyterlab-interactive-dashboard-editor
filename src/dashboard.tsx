import {
  INotebookModel,
  NotebookPanel,
  StaticNotebook
} from '@jupyterlab/notebook';

import { CodeCell, MarkdownCell, Cell } from '@jupyterlab/cells';

import { map, toArray, each } from '@lumino/algorithm';

import * as React from 'react';

import {
  WidgetTracker,
  CommandToolbarButton,
  IWidgetTracker,
  Toolbar,
  ReactWidget,
  InputDialog
} from '@jupyterlab/apputils';

import { CommandRegistry } from '@lumino/commands';

import { Token } from '@lumino/coreutils';

import { Panel, Widget } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { IDragEvent } from '@lumino/dragdrop';

import { DashboardLayout, NewDashboardLayout } from './layout';

import { DashboardWidget, OutputWidget } from './widget';

import { Widgetstore, WidgetInfo, WidgetPosition } from './widgetstore';

import {
  addCellId,
  addNotebookId,
  getNotebookById,
  getCellId,
  getMetadata,
  addMetadataView
} from './utils';

import {
  DocumentWidget,
  DocumentRegistry,
  ABCWidgetFactory,
  IDocumentWidget
} from '@jupyterlab/docregistry';

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { IObservableJSON } from '@jupyterlab/observables';

import { IDashboardModel, DashboardModel, NewDashboardModel } from './model';

import { CommandIDs } from './commands';

import { HTMLSelect } from '@jupyterlab/ui-components';

import { UUID } from '@lumino/coreutils';

import { DashboardIcons } from './icons';

import * as dbformat from './dbformat';

import { UndoManager, IUndoableAction } from './undo';

// HTML element classes

export const DASHBOARD_CLASS = 'pr-JupyterDashboard';

export const DROP_TARGET_CLASS = 'pr-DropTarget';

export const TOOLBAR_MODE_SWITCHER_CLASS = 'pr-ToolbarModeSwitcher';

export const TOOLBAR_SELECT_CLASS = 'pr-ToolbarSelector';

export const TOOLBAR_CLASS = 'pr-DashboardToolbar';

export const IDashboardTracker = new Token<IDashboardTracker>(
  'jupyterlab-interactive-dashboard-editor'
);

export type IDashboardTracker = IWidgetTracker<Dashboard>;

export class DashboardTracker extends WidgetTracker<Dashboard> {}

/**
 * Main content widget for the Dashboard widget.
 */
export class Dashboard extends Widget {
  constructor(options: Dashboard.IOptions) {
    super(options);

    this.id = UUID.uuid4();

    const { outputTracker, model } = options;
    this._model = model;
    if (options.context !== undefined) {
      this._context = options.context;
    }
    const { widgetstore, mode } = model;

    this.layout = new DashboardLayout({
      widgetstore,
      outputTracker,
      model,
      mode,
      width: options.dashboardWidth || window.innerWidth,
      height: options.dashboardHeight || window.innerHeight
    });

    widgetstore.connectDashboard(this);

    this._model.loaded.connect(this.updateLayoutFromWidgetstore, this);

    this.addClass(DASHBOARD_CLASS);
  }

  /**
   * Create click listeners on attach
   */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('lm-dragenter', this, true);
    this.node.addEventListener('lm-dragleave', this, true);
    this.node.addEventListener('lm-dragover', this, true);
    this.node.addEventListener('lm-drop', this, true);
    this.node.addEventListener('scroll', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('lm-dragenter', this, true);
    this.node.removeEventListener('lm-dragleave', this, true);
    this.node.removeEventListener('lm-dragover', this, true);
    this.node.removeEventListener('lm-drop', this, true);
    this.node.removeEventListener('scroll', this);
  }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'lm-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
    this.removeClass(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'lm-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    this.addClass(DROP_TARGET_CLASS);
    event.dropAction = 'copy';
    const source = event.source as DashboardWidget;
    const pos = source?.pos;
    if (pos && source.mode === 'grid-edit') {
      pos.left = event.offsetX + this.node.scrollLeft;
      pos.top = event.offsetY + this.node.scrollTop;
      (this.layout as DashboardLayout).drawDropZone(pos, '#2b98f0');
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const left = event.offsetX + this.node.scrollLeft;
    const top = event.offsetY + this.node.scrollTop;

    if (event.proposedAction === 'move') {
      const widget = event.source as DashboardWidget;
      const oldDashboard = widget.parent as Dashboard;
      const width = widget.node.offsetWidth;
      const height = widget.node.offsetHeight;
      const pos = { left, top, width, height };

      if (oldDashboard === this) {
        // dragging in same dashboard.
        this.updateWidget(widget, { pos });
      } else {
        // dragging between dashboards
        const info: Widgetstore.WidgetInfo = {
          widgetId: DashboardWidget.createDashboardWidgetId(),
          notebookId: widget.notebookId,
          cellId: widget.cellId,
          pos,
          removed: false
        };

        const newWidget = this.createWidget(info);
        this.addWidget(newWidget, pos);
        oldDashboard.deleteWidget(widget);
      }

      // dragging from notebook -> dashboard.
    } else if (event.proposedAction === 'copy') {
      const notebook = event.source.parent as NotebookPanel;
      let cell: Cell;
      if (event.source.activeCell instanceof MarkdownCell) {
        cell = notebook.content.activeCell as MarkdownCell;
      } else {
        cell = notebook.content.activeCell as CodeCell;
      }

      const info: Widgetstore.WidgetInfo = {
        widgetId: DashboardWidget.createDashboardWidgetId(),
        notebookId: addNotebookId(notebook),
        cellId: addCellId(cell),
        pos: {
          left,
          top,
          width: DashboardWidget.DEFAULT_WIDTH,
          height: DashboardWidget.DEFAULT_HEIGHT
        },
        removed: false
      };

      const newWidget = this.createWidget(info, true);
      this.addWidget(newWidget, info.pos);
    } else {
      return;
    }

    this.removeClass(DROP_TARGET_CLASS);
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'scroll':
        this._evtScroll(event);
        break;
      case 'lm-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'lm-drop':
        this._evtDrop(event as IDragEvent);
        break;
    }
  }

  private _evtScroll(_event: Event): void {
    const model = this.model;

    if (model.scrollMode !== 'infinite') {
      return;
    }

    // Changed to only "infinitely" scroll on the vertical

    const elem = this.node;
    // const rightEdge = elem.offsetWidth + elem.scrollLeft;
    const bottomEdge = elem.offsetHeight + elem.scrollTop;

    // if (rightEdge >= model.width && rightEdge > this._oldRightEdge) {
    //   model.width += 200;
    // }
    if (bottomEdge >= model.height && bottomEdge > this._oldBottomEdge) {
      model.height += (this.layout as DashboardLayout).tileSize;
    }

    this._oldBottomEdge = bottomEdge;
    // this._oldRightEdge = rightEdge;
  }

  /**
   * Add a widget to the layout.
   *
   * @param widget - the widget to add.
   */
  addWidget(widget: DashboardWidget, pos: Widgetstore.WidgetPosition): void {
    (this.layout as DashboardLayout).addWidget(widget, pos);
  }

  updateWidget(widget: DashboardWidget, newInfo: Partial<WidgetInfo>): boolean {
    return (this.layout as DashboardLayout).updateWidget(widget, newInfo);
  }

  /**
   * Remove a widget from the layout.
   *
   * @param widget - the widget to remove.
   *
   * ### Notes
   * This is basically the same as deleteWidget but fulfills the type
   * signature requirements of the extended class.
   */
  removeWidget(widget: DashboardWidget): void {
    (this.layout as DashboardLayout).removeWidget(widget);
  }

  /**
   * Remove a widget from the layout.
   *
   * @param widget - the widget to remove.
   *
   */
  deleteWidget(widget: DashboardWidget): boolean {
    return (this.layout as DashboardLayout).deleteWidget(widget);
  }

  /**
   * Adds a dashboard widget's information to the widgetstore.
   *
   * @param info - the information to add to the widgetstore.
   */
  updateWidgetInfo(info: Widgetstore.WidgetInfo): void {
    (this.layout as DashboardLayout).updateWidgetInfo(info);
  }

  /**
   * Mark a widget as deleted in the widgetstore.
   *
   * @param widget - the widget to mark as deleted.
   */
  deleteWidgetInfo(widget: DashboardWidget): void {
    (this.layout as DashboardLayout).deleteWidgetInfo(widget);
  }

  /**
   * Update a widgetstore entry for a widget given that widget.
   *
   * @param widget - the widget to update from.
   */
  updateInfoFromWidget(widget: DashboardWidget): void {
    (this.layout as DashboardLayout).updateInfoFromWidget(widget);
  }

  /**
   * Updates the layout based on the state of the datastore.
   */
  updateLayoutFromWidgetstore(): void {
    (this.layout as DashboardLayout).updateLayoutFromWidgetstore();
  }

  /**
   * Undo the last change to the layout.
   */
  undo(): void {
    (this.layout as DashboardLayout).undo();
  }

  /**
   * Redo the last change to the layout.
   */
  redo(): void {
    (this.layout as DashboardLayout).redo();
  }

  createWidget(info: Widgetstore.WidgetInfo, fit?: boolean): DashboardWidget {
    return (this.layout as DashboardLayout).createWidget(info, fit);
  }

  saveToNotebookMetadata(name = 'default'): void {
    // Get a list of all notebookIds used in the dashboard.
    const widgets = toArray(this.model.widgetstore.getWidgets());

    const notebookIds = toArray(map(widgets, record => record.notebookId));

    if (!notebookIds.every(v => v === notebookIds[0])) {
      throw new Error(
        'Only single notebook dashboards can be saved to metadata.'
      );
    }

    const notebookId = notebookIds[0];
    const notebookTracker = this.model.notebookTracker;
    const notebook = getNotebookById(notebookId, notebookTracker);

    const oldDashboardMetadata = getMetadata(notebook);
    let dashboardId: string;

    // eslint-disable-next-line no-prototype-builtins
    if ((oldDashboardMetadata as Record<string, any>).hasOwnProperty('views')) {
      const dashboardIds = Object.keys(oldDashboardMetadata.views);
      const names = new Map<string, string>(
        dashboardIds.map(id => [oldDashboardMetadata.views[id].name, id])
      );
      dashboardId = names.get(name) || UUID.uuid4();
    } else {
      dashboardId = UUID.uuid4();
    }

    const cellWidth = (this.layout as DashboardLayout).tileSize;
    // Only square dimensions are currently supported.
    const cellHeight = cellWidth;

    const dashboardView = {
      name,
      cellWidth,
      cellHeight,
      dashboardWidth: this.model.width,
      dashboardHeight: this.model.height
    };
    addMetadataView(notebook, dashboardId, dashboardView);

    const cells = notebook.content.widgets;

    const widgetMap = new Map<string, WidgetInfo>(
      widgets.map(widget => [widget.cellId, widget])
    );

    each(cells, cell => {
      const cellId = getCellId(cell);
      const info = widgetMap.get(cellId);
      let view: Partial<dbformat.ICellView> = { hidden: true };

      if (info != null) {
        const { pos, snapToGrid } = info;
        const { left, top, width, height } = pos;
        const adjustedPos = !snapToGrid
          ? pos
          : {
              left: left / cellWidth,
              top: top / cellHeight,
              width: width / cellWidth,
              height: height / cellHeight
            };

        view = {
          hidden: false,
          name,
          pos: adjustedPos,
          snapToGrid: snapToGrid
        };
      }

      addMetadataView(cell, dashboardId, view);
    });

    notebook.context.save();
  }

  get model(): IDashboardModel {
    return this._model;
  }

  get context(): DocumentRegistry.IContext<DocumentRegistry.IModel> {
    return this._context;
  }

  private _model: IDashboardModel;
  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  // private _oldRightEdge = 0;
  private _oldBottomEdge = 0;
}

/**
 * Namespace for DashboardArea options.
 */
export namespace Dashboard {
  export type Mode = 'free-edit' | 'present' | 'grid-edit';

  export type ScrollMode = 'infinite' | 'constrained';

  export interface IOptions extends Widget.IOptions {
    /**
     * Tracker for child widgets.
     */
    outputTracker: WidgetTracker<DashboardWidget>;

    /**
     * Dashboard name.
     */
    name?: string;

    store?: Widgetstore;

    dashboardWidth?: number;

    dashboardHeight?: number;

    model: IDashboardModel;

    context?: DocumentRegistry.IContext<DocumentRegistry.IModel>;
  }
}

export class DashboardDocument extends DocumentWidget<Dashboard> {
  constructor(options: DashboardDocument.IOptions) {
    let { content, reveal } = options;
    const { context, commandRegistry } = options;
    const model = context.model as DashboardModel;
    model.path = context.path;
    content = content || new Dashboard({ ...options, model, context });
    reveal = Promise.all([reveal, context.ready]);
    super({
      ...options,
      content: content as Dashboard,
      reveal
    });

    // Build the toolbar
    this.toolbar.addClass(TOOLBAR_CLASS);

    const commands = commandRegistry;
    const { save, undo, redo, cut, copy, paste } = CommandIDs;

    const args = { toolbar: true, dashboardId: content.id };

    const makeToolbarButton = (
      id: string,
      tooltip: string
    ): CommandToolbarButton => {
      const button = new CommandToolbarButton({ args, commands, id });
      button.node.title = tooltip;
      return button;
    };

    const saveButton = makeToolbarButton(save, 'Save');
    const undoButton = makeToolbarButton(undo, 'Undo');
    const redoButton = makeToolbarButton(redo, 'Redo');
    const cutButton = makeToolbarButton(cut, 'Cut the selected outputs');
    const copyButton = makeToolbarButton(copy, 'Copy the selected outputs');
    const pasteButton = makeToolbarButton(
      paste,
      'Paste outputs from the clipboard'
    );

    this.toolbar.addItem(save, saveButton);
    this.toolbar.addItem(undo, undoButton);
    this.toolbar.addItem(redo, redoButton);
    this.toolbar.addItem(cut, cutButton);
    this.toolbar.addItem(copy, copyButton);
    this.toolbar.addItem(paste, pasteButton);
    this.toolbar.addItem('spacer', Toolbar.createSpacerItem());
    this.toolbar.addItem(
      'switchMode',
      new DashboardDocument.DashboardModeSwitcher(content as Dashboard)
    );
  }
}

export namespace DashboardDocument {
  export interface IOptions extends DocumentWidget.IOptionsOptionalContent {
    /**
     * Tracker for child widgets.
     */
    outputTracker: WidgetTracker<DashboardWidget>;

    /**
     * Command registry for building the toolbar.
     */
    commandRegistry: CommandRegistry;

    /**
     * Dashboard name.
     */
    name?: string;

    /**
     * Optional widgetstore to restore from.
     */
    store?: Widgetstore;

    /**
     * Dashboard canvas width (default is 1280).
     */
    dashboardWidth?: number;

    /**
     * Dashboard canvas height (default is 720).
     */
    dashboardHeight?: number;
  }

  export class DashboardModeSwitcher extends ReactWidget {
    constructor(dashboard: Dashboard) {
      super();
      this.addClass(TOOLBAR_MODE_SWITCHER_CLASS);
      this._dashboard = dashboard;

      if (dashboard.model) {
        this.update();
      }

      dashboard.model.stateChanged.connect((_sender, change) => {
        if (change.name === 'mode') {
          this.update();
        }
      }, this);
    }

    private _handleChange(
      that: DashboardModeSwitcher
    ): (event: React.ChangeEvent<HTMLSelectElement>) => void {
      return (event: React.ChangeEvent<HTMLSelectElement>): void => {
        that.dashboard.model.mode = event.target.value as Dashboard.Mode;
      };
    }

    render(): JSX.Element {
      const value = this._dashboard.model.mode;
      return (
        <HTMLSelect
          className={TOOLBAR_SELECT_CLASS}
          onChange={this._handleChange(this)}
          value={value}
          aria-label={'Mode'}
        >
          <option value="present">Present</option>
          {/* <option value="free-edit">Free Layout</option> */}
          <option value="grid-edit">Edit</option>
        </HTMLSelect>
      );
    }

    get dashboard(): Dashboard {
      return this._dashboard;
    }

    private _dashboard: Dashboard;
  }
}

export class DashboardDocumentFactory extends ABCWidgetFactory<
  DashboardDocument
> {
  constructor(options: DashboardDocumentFactory.IOptions) {
    super(options);
    this._commandRegistry = options.commandRegistry;
    this._outputTracker = options.outputTracker;
  }

  createNewWidget(context: DocumentRegistry.Context): DashboardDocument {
    return new DashboardDocument({
      context,
      commandRegistry: this._commandRegistry,
      outputTracker: this._outputTracker
    });
  }

  private _commandRegistry: CommandRegistry;
  private _outputTracker: WidgetTracker<DashboardWidget>;
}

export namespace DashboardDocumentFactory {
  export interface IOptions
    extends DocumentRegistry.IWidgetFactoryOptions<IDocumentWidget> {
    commandRegistry: CommandRegistry;
    outputTracker: WidgetTracker<DashboardWidget>;
  }
}

// NEWNEW

/**
 * A `DashboardDocumentWidget` to host the dashboard and toolbar.
 */
export class NewDashboardDocumentWidget extends DocumentWidget<
  DashboardPanel,
  INotebookModel
> {
  /**
   * Construct a `DashboardDocumentWidget`.
   *
   * @param options - The options to construct a `DashboardDocumentWidget`
   */
  constructor(options: NewDashboardDocumentWidget.IOptions) {
    const { context, content, commands } = options;
    super({ context, content });
    this.id = '@jupytercalpoly/jupyterlab-interactive-dashboard-editor:widget';
    this.title.label = context.localPath;
    this.title.closable = true;
    this.title.icon = DashboardIcons.tealDashboard;
    this.title.iconClass = 'jp-MaterialIcon';
    this.title.iconLabel = 'Dashboard';
    console.log(commands); // silence unused warning. should be used to make toolbar in future.
  }
}

export namespace NewDashboardDocumentWidget {
  export interface IOptions {
    /**
     * The notebook context
     */
    context: DocumentRegistry.IContext<INotebookModel>;

    /**
     * The `DashboardPanel` to render
     */
    content: DashboardPanel;

    /**
     * The command registry to build the toolbar from
     */
    commands: CommandRegistry;
  }
}

export type OutputRemove = {
  type: 'remove';
  id: string;
};

export type OutputAdd = {
  type: 'add';
  id: string;
  info: dbformat.ICellView;
};

export type OutputModify = {
  type: 'modify';
  id: string;
  info: Partial<dbformat.ICellView>;
};

export type OutputChange = OutputAdd | OutputRemove | OutputModify;

export type OutputChangeType = 'remove' | 'add' | 'modify';

/**
 * A dashboard widget to host the `DashboardOutput`s.
 */
export class NewDashboard extends Widget {
  /**
   * Construct a `Dashboard`.
   */
  constructor(model: NewDashboardModel) {
    super();
    this.addClass(DASHBOARD_CLASS);
    this._model = model;
    this._inBatch = false;
    this._changes = { do: [], undo: [] };

    this._undoManager = new UndoManager(
      this.handleDashboardChanges.bind(this),
      20
    );
    this._canvas = document.createElement('canvas');
    this._canvas.classList.add('pr-Canvas');
    this._canvas.classList.add('pr-TiledLayout');
    this.node.appendChild(this._canvas);

    this.layout = new NewDashboardLayout(model, this._canvas);
  }

  /**
   * Create click listeners on attach
   */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('lm-dragenter', this, true);
    this.node.addEventListener('lm-dragleave', this, true);
    this.node.addEventListener('lm-dragover', this, true);
    this.node.addEventListener('lm-drop', this, true);
    this.node.addEventListener('scroll', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('lm-dragenter', this, true);
    this.node.removeEventListener('lm-dragleave', this, true);
    this.node.removeEventListener('lm-dragover', this, true);
    this.node.removeEventListener('lm-drop', this, true);
    this.node.removeEventListener('scroll', this);
  }

  handleEvent(event: Event): void {
    switch (event.type) {
      case 'scroll':
        this._evtScroll(event);
        break;
      case 'lm-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'lm-drop':
        this._evtDrop(event as IDragEvent);
        break;
    }
  }

  private _evtScroll(_event: Event): void {
    // no-op for now
  }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'lm-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Gets the `WidgetPosition` contained in an `ICellView` in terms of absolute pixel positions.
   *
   * @param info - The `ICellView` containing the position data.
   */
  public getPixelPos(info: dbformat.ICellView): WidgetPosition {
    const { pos, snapToGrid } = info;
    if (!snapToGrid) {
      return pos;
    }

    const { cellWidth, cellHeight } = this.model.info;
    let { left, top, width, height } = pos;

    left *= cellWidth;
    top *= cellHeight;
    width *= cellWidth;
    height *= cellHeight;
    return { left, top, width, height };
  }

  /**
   * Gets the `WidgetPosition` contained in an `ICellView` in terms of grid positions.
   *
   * @param info - The `ICellView` containing the position data.
   *
   * @param round - Whether to round the cell positions `up`, `down`, or to the `nearest` number.
   * Default `nearest`.
   */
  public getGridPos(
    info: dbformat.ICellView,
    round: 'up' | 'down' | 'nearest' = 'nearest'
  ): WidgetPosition {
    const { pos, snapToGrid } = info;
    if (snapToGrid) {
      return pos;
    }

    const { cellWidth, cellHeight } = this.model.info;
    const { left, top, width, height } = pos;

    let roundFn: (n: number) => number;
    switch (round) {
      case 'nearest':
        roundFn = Math.round;
        break;
      case 'up':
        roundFn = Math.ceil;
        break;
      case 'down':
        roundFn = Math.floor;
        break;
    }

    return {
      left: roundFn(left / cellWidth),
      top: roundFn(top / cellHeight),
      width: roundFn(width / cellWidth),
      height: roundFn(height / cellHeight)
    };
  }

  /**
   * Handle the `'lm-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = 'copy';
    const widget = event.source as OutputWidget;

    if (widget.viewId == null) {
      return;
    }

    const cellModel = this._model.getCellModel(widget.cellId);
    const metadata = cellModel.metadata.get('presto') as Record<string, any>;
    const info = metadata.views[widget.viewId];
    const { pos, snapToGrid } = info;

    if (pos != null && snapToGrid) {
      const pixelPos = this.getPixelPos(info);
      pixelPos.left = event.offsetX + this.node.scrollLeft;
      pixelPos.top = event.offsetY + this.node.scrollTop;
      console.log('pos', pixelPos);
      this.drawDropZone(pixelPos, snapToGrid);
    }
  }

  public clearCanvas(): CanvasRenderingContext2D {
    const canvas = this._canvas;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    return context;
  }

  public drawDropZone(pos: WidgetPosition, alignToGrid: boolean): void {
    const context = this.clearCanvas();

    context.setLineDash([5]);
    context.strokeStyle = '#2b98f0';
    context.fillStyle = '#2b98f066';

    let { left, top, width, height } = pos;
    const { cellWidth, cellHeight } = this._model.info;

    if (alignToGrid) {
      left = Private.mround(left, cellWidth);
      top = Private.mround(top, cellHeight);
      width = Math.max(Private.mround(width, cellWidth), cellWidth);
      height = Math.max(Private.mround(height, cellHeight), cellHeight);
    }

    context.strokeRect(left, top, width, height);
    context.fillRect(left, top, width, height);
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const left = event.offsetX + this.node.scrollLeft;
    const top = event.offsetY + this.node.scrollTop;

    if (event.proposedAction === 'move') {
      const widget = event.source as OutputWidget;
      const { cellWidth, cellHeight } = this.model.info;
      const { pos, snapToGrid } = this.model.getCellInfo(widget.cellId);
      if (snapToGrid) {
        pos.left = Math.round(left / cellWidth);
        pos.top = Math.round(top / cellHeight);
      }
      this.modifyOutput({ pos, hidden: false }, widget.cellId);
    } else if (event.proposedAction === 'copy') {
      const notebook = event.source.parent as NotebookPanel;
      // if (notebook.model !== this._model.context.model) {
      //   console.warn('Outputs can only be added from the same notebook');
      //   return;
      // }
      const cellModel = notebook.content.activeCell.model;
      const { name, cellHeight, cellWidth } = this._model.info;
      const pos = {
        left: Math.round(left / cellWidth),
        top: Math.round(top / cellHeight),
        width: 3,
        height: 2
      };

      const info = {
        name,
        pos,
        snapToGrid: true,
        hidden: false
      };

      this.modifyOutput(info, cellModel.id);
    } else {
      return;
    }
  }

  /**
   * Whether or not the dashboard is in the middle of a batch of changes.
   */
  get inBatch(): boolean {
    return this._inBatch;
  }

  /**
   * Begin a batch of actions. Actions won't be performed until the batch ends.
   */
  public beginBatch(): void {
    this._inBatch = true;
  }

  /**
   * End a batch of actions and perform all actions queued since the batch began.
   */
  public endBatch(): void {
    if (!this.inBatch) {
      return;
    }
    this._inBatch = false;
    this._doChanges();
  }

  /**
   * Performs all queued actions.
   */
  private _doChanges(): void {
    this._undoManager.do(this._changes);
    this._changes = { do: [], undo: [] };
  }

  /**
   * Self-explanatory (if wordy) function name.
   *
   * @param action - the action to push or peform.
   */
  private _pushActionAndDoIfNotBatch(
    action: IUndoableAction<OutputChange>
  ): void {
    this._changes.do.push(action.do);
    this._changes.undo.push(action.undo);
    if (!this.inBatch) {
      this._doChanges();
    }
  }

  /**
   * Performs the changes described in an array of `IDashboardChanges`.
   * Meant to be passed to an `UndoManager`.
   *
   * @param actions - An array of actions to handle.
   */
  public handleDashboardChanges(changes: OutputChange[]): void {
    this._model.beginBatch();
    changes.forEach(change => this._handleDashboardChange(change));
    this._model.endBatch();
  }

  /**
   * Performs a change described in an `IDashboardChange`.
   *
   * @param action - An action to handle.
   */
  private _handleDashboardChange(change: OutputChange): void {
    // Add overlap resolution
    switch (change.type) {
      case 'add':
        this._model.setCellInfo(change.id, change.info);
        break;
      case 'remove':
        this._model.hideCell(change.id);
        break;
      case 'modify':
        this._model.setPartialCellInfo(change.id, change.info);
        break;
    }
  }

  modifyOutput(info: Partial<dbformat.ICellView>, id: string): void {
    const oldInfo = this._model.getCellInfo(id);
    const doChange: OutputModify = {
      type: 'modify',
      info,
      id
    };
    const undoChange: OutputModify = {
      type: 'modify',
      info: oldInfo,
      id
    };
    const action = {
      do: doChange,
      undo: undoChange
    };
    this._pushActionAndDoIfNotBatch(action);
  }

  removeOutput(id: string): void {
    const info = this._model.getCellInfo(id);
    const doChange: OutputRemove = {
      type: 'remove',
      id
    };
    const undoChange: OutputAdd = {
      type: 'add',
      id,
      info
    };
    const action = {
      do: doChange,
      undo: undoChange
    };
    this._pushActionAndDoIfNotBatch(action);
  }

  addOutput(info: dbformat.ICellView, id: string): void {
    const doChange: OutputAdd = {
      type: 'add',
      id,
      info
    };
    const undoChange: OutputRemove = {
      type: 'remove',
      id
    };
    const action = {
      do: doChange,
      undo: undoChange
    };
    this._pushActionAndDoIfNotBatch(action);
  }

  /**
   * Undo the last change made to the dashboard.
   */
  undo(): void {
    this._undoManager.undo();
  }

  /**
   * Redo the last undone change to the dashboard.
   */
  redo(): void {
    this._undoManager.redo();
  }

  /**
   * The model for the `Dashboard`.
   */
  get model(): NewDashboardModel {
    return this._model;
  }

  private _model: NewDashboardModel;
  private _undoManager: UndoManager<OutputChange[]>;
  private _changes: IUndoableAction<OutputChange[]>;
  private _inBatch: boolean;
  private _canvas: HTMLCanvasElement;
  // Using a public variable because `Widget`s have to have a layout of type `Layout`.
  public layout: NewDashboardLayout;
}

/**
 * A Widget to host a Dashboard
 */
export class DashboardPanel extends Panel {
  /**
   * Construct a new `Dashboard`
   *
   * @param options - The options to construct a `Dashboard`
   */
  constructor(options: DashboardPanel.IOptions) {
    super();

    const {
      context,
      rendermime,
      contentFactory,
      mimeTypeService,
      editorConfig,
      notebookConfig
    } = options;

    this._context = context;
    this.rendermime = rendermime;
    this.contentFactory = contentFactory;
    this.mimeTypeService = mimeTypeService;
    this._editorConfig = editorConfig;
    this._notebookConfig = notebookConfig;

    DashboardPanel.selectDashboard(context.model.metadata).then(dashboardId => {
      const dashboardModel = new NewDashboardModel({
        dashboardId,
        context,
        rendermime,
        contentFactory,
        mimeTypeService,
        editorConfig,
        notebookConfig
      });
      this._dashboard = new NewDashboard(dashboardModel);
      this.addWidget(this._dashboard);
    });
  }

  /**
   * The rendermime instance for this context.
   */
  readonly rendermime: IRenderMimeRegistry;

  /**
   * A `NotebookPanel` content factory.
   */
  readonly contentFactory: NotebookPanel.IContentFactory;

  /**
   * The service used to look up mime types.
   */
  readonly mimeTypeService: IEditorMimeTypeService;

  /**
   * Getter for the notebook cell editor configuration.
   */
  get editorConfig(): StaticNotebook.IEditorConfig {
    return this._editorConfig;
  }
  /**
   * Setter for the notebook cell editor configuration.
   *
   * @param value - The `EditorConfig` of the notebook.
   */
  set editorConfig(value: StaticNotebook.IEditorConfig) {
    this._editorConfig = value;
  }
  /**
   * Getter for the notebook configuration.
   */
  get notebookConfig(): StaticNotebook.INotebookConfig {
    return this._notebookConfig;
  }
  /**
   * Setter for the notebook configuration.
   *
   * @param value - The configuration of the notebook.
   */
  set notebookConfig(value: StaticNotebook.INotebookConfig) {
    this._notebookConfig = value;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._dashboard = undefined;
    super.dispose();
  }

  /**
   * Save the dashboard to the notebook metadata.
   */
  save(): void {
    this._context.save();
  }

  /**
   * The `Dashboard` hosted by the panel.
   */
  get dashboard(): NewDashboard {
    return this._dashboard;
  }

  private _context: DocumentRegistry.IContext<INotebookModel>;
  private _editorConfig: StaticNotebook.IEditorConfig;
  private _notebookConfig: StaticNotebook.INotebookConfig;
  private _dashboard: NewDashboard;
}

export namespace DashboardPanel {
  export type IOptions = NewDashboardModel.IOptions;

  /**
   * Resolves which dashboard should be rendered from a notebook's metadata.
   *
   * @param metadata - the notebook metadata containing the dashboard info.
   *
   * @returns the selected dashboard id and name, or undefined if there are none or
   * none are selected.
   */
  export async function selectDashboard(
    metadata: IObservableJSON
  ): Promise<string | undefined> {
    const data = metadata.get('presto') as Record<string, any>;
    if (data == null || data.views == null) {
      return undefined;
    }

    const dashboardIds = Object.keys(data.views);
    const dashboardMap = new Map<string, string>(
      dashboardIds.map(id => [data.views[id].name, id])
    );
    console.log('dashboardMap', dashboardMap.entries());
    if (dashboardIds.length === 1) {
      return dashboardIds[0];
    }

    InputDialog.getItem({
      title: 'Select a Dashboard',
      current: 0,
      items: Array.from(dashboardMap.keys())
    }).then(v => {
      if (v.value == null) {
        return undefined;
      }
      return dashboardMap.get(v.value);
    });
  }
}

/**
 * A namespace for private functionality
 */
namespace Private {
  /**
   * Rounds `num` to the nearest integer multiple of `roundTo`.
   */
  export function mround(num: number, roundTo: number): number {
    return roundTo * Math.round(num / roundTo);
  }
}
