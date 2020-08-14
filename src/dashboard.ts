import { NotebookPanel } from '@jupyterlab/notebook';

import { CodeCell, MarkdownCell, Cell } from '@jupyterlab/cells';

import { WidgetTracker, CommandToolbarButton } from '@jupyterlab/apputils';

import { CommandRegistry } from '@lumino/commands';

import { Widget } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { IDragEvent } from '@lumino/dragdrop';

import { DashboardLayout } from './custom_layout';

import { DashboardWidget } from './widget';

import { Widgetstore } from './widgetstore';

import { addCellId, addNotebookId } from './utils';

import { DocumentWidget, DocumentRegistry, ABCWidgetFactory, IDocumentWidget } from '@jupyterlab/docregistry';

import { IDashboardModel, DashboardModel } from './model';

import { CommandIDs } from './commands'; 


// HTML element classes

const DASHBOARD_CLASS = 'pr-JupyterDashboard';

const DROP_TARGET_CLASS = 'pr-DropTarget';


/**
 * Main content widget for the Dashboard widget.
 */
export class Dashboard extends Widget {
  constructor(options: Dashboard.IOptions) {
    super(options);

    const { outputTracker, model, context } = options;
    this._model = model;
    this._context = context;
    const store = model.widgetstore;

    this.layout = new DashboardLayout({
      store,
      outputTracker,
      model,
      width: options.dashboardWidth || Dashboard.DEFAULT_WIDTH,
      height: options.dashboardHeight || Dashboard.DEFAULT_HEIGHT,
      mode: 'edit'
    });

    store.connectDashboard(this);

    this._context.ready.then(() => {
      this._model.loaded.connect(this.updateLayoutFromWidgetstore, this);
    });
    
    this.addClass(DASHBOARD_CLASS);
  }

  /**
   * Create click listeners on attach
   */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('lm-dragenter', this);
    this.node.addEventListener('lm-dragleave', this);
    this.node.addEventListener('lm-dragover', this);
    this.node.addEventListener('lm-drop', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('lm-dragenter', this);
    this.node.removeEventListener('lm-dragleave', this);
    this.node.removeEventListener('lm-dragover', this);
    this.node.removeEventListener('lm-drop', this);
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
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
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
        this.updateWidget(widget, pos);
      } else {
        // dragging between dashboards
        const info: Widgetstore.WidgetInfo = {
          widgetId: DashboardWidget.createDashboardWidgetId(),
          notebookId: widget.notebookId,
          cellId: widget.cellId,
          pos,
          removed: false,
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
          height: DashboardWidget.DEFAULT_HEIGHT,
        },
        removed: false,
      };

      const newWidget = this.createWidget(info, true);
      this.addWidget(newWidget, info.pos);
    } else {
      return;
    }

    this.removeClass(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();
  }

  handleEvent(event: Event): void {
    switch (event.type) {
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

  /**
   * Add a widget to the layout.
   *
   * @param widget - the widget to add.
   */
  addWidget(widget: DashboardWidget, pos: Widgetstore.WidgetPosition): void {
    (this.layout as DashboardLayout).addWidget(widget, pos);
  }

  updateWidget(
    widget: DashboardWidget,
    pos: Widgetstore.WidgetPosition
  ): boolean {
    return (this.layout as DashboardLayout).updateWidget(widget, pos);
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

  get model(): IDashboardModel {
    return this._model;
  }

  get context(): DocumentRegistry.IContext<DocumentRegistry.IModel> {
    return this._context;
  }

  private _model: IDashboardModel;
  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
}

/**
 * Namespace for DashboardArea options.
 */
export namespace Dashboard {

  export type Mode = 'edit' | 'present';

  export const DEFAULT_WIDTH = 1270;

  export const DEFAULT_HEIGHT = 720;

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

    context: DocumentRegistry.IContext<DocumentRegistry.IModel>;
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
     * Dashboard canvas width (default is 1280).
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
}

export class DashboardDocument extends DocumentWidget<Dashboard> {
  constructor(options: DashboardDocument.IOptions) {
    let { content, reveal, commandRegistry } = options;
    const { context } = options;
    const model = context.model as DashboardModel;
    content = content || new Dashboard({...options, model, context });
    reveal = Promise.all([reveal, context.ready]);
    super({
       ...options,
       content: content as Dashboard,
       reveal
    });

    // Build the toolbar

    const commands = commandRegistry;
    const {
      save,
      undo,
      redo,
      cut,
      copy,
      paste,
      runOutput,
      startFullscreen,
      toggleMode
    } = CommandIDs;

    this.toolbar.addItem(
      'save',
      new CommandToolbarButton({ commands, id: save })
    );
    this.toolbar.addItem(
      'undo',
      new CommandToolbarButton({ commands, id: undo })
    );
    this.toolbar.addItem(
      'redo',
      new CommandToolbarButton({ commands, id: redo })
    );
    this.toolbar.addItem(
      'cut',
      new CommandToolbarButton({ commands, id: cut })
    );
    this.toolbar.addItem(
      'copy',
      new CommandToolbarButton({ commands, id: copy })
    );
    this.toolbar.addItem(
      'paste',
      new CommandToolbarButton({ commands, id: paste })
    );
    this.toolbar.addItem(
      'runOutput',
      new CommandToolbarButton({ commands, id: runOutput })
    );
    this.toolbar.addItem(
      'startFullscreen',
      new CommandToolbarButton({ commands, id: startFullscreen })
    );
    this.toolbar.addItem(
      'toggleMode',
      new CommandToolbarButton({ commands, id: toggleMode })
    );
  }
}

export class DashboardDocumentFactory extends ABCWidgetFactory<DashboardDocument> {
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
  export interface IOptions extends DocumentRegistry.IWidgetFactoryOptions<IDocumentWidget> {
    commandRegistry: CommandRegistry;
    outputTracker: WidgetTracker<DashboardWidget>;
  }
}