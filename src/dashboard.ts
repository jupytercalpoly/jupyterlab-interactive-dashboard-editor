import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';

import { CodeCell } from '@jupyterlab/cells';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { IDragEvent } from '@lumino/dragdrop';

import { UUID } from '@lumino/coreutils';

import { DashboardLayout } from './custom_layout';

import { DashboardWidget } from './widget';

import { Icons } from './icons';

import { createSaveButton } from './toolbar';

import { Widgetstore } from './widgetstore';

import { addCellId, addNotebookId } from './utils';

// HTML element classes

const DASHBOARD_CLASS = 'pr-JupyterDashboard';

const DASHBOARD_AREA_CLASS = 'pr-DashboardArea';

const DROP_TARGET_CLASS = 'pr-DropTarget';

/**
 * Namespace for DashboardArea options.
 */
export namespace DashboardArea {
  export interface IOptions extends Widget.IOptions {
    /**
     * Tracker for child widgets.
     */
    outputTracker: WidgetTracker<DashboardWidget>;

    layout: DashboardLayout;

    // /**
    //  * Dashboard used for position.
    //  */
    // dashboard: Dashboard;
  }
}

/**
 * Main content widget for the Dashboard widget.
 */
export class DashboardArea extends Widget {
  constructor(options: DashboardArea.IOptions) {
    super(options);
    this.layout = options.layout;
    this._dbLayout = options.layout as DashboardLayout;
    this.addClass(DASHBOARD_AREA_CLASS);
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
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = 'copy';
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    // dragging from dashboard -> dashboard.
    if (event.proposedAction === 'move') {
      const widget = event.source as DashboardWidget;

      const pos: Widgetstore.WidgetPosition = {
        left: event.offsetX,
        top: event.offsetY,
        width: widget.node.offsetWidth,
        height: widget.node.offsetHeight,
      };

      this._dbLayout.updateWidget(widget, pos);
      this._dbLayout.updateInfoFromWidget(widget);

      // dragging from notebook -> dashboard.
    } else if (event.proposedAction === 'copy') {
      const notebook = event.source.parent as NotebookPanel;
      const cell = notebook.content.activeCell as CodeCell;

      const info: Widgetstore.WidgetInfo = {
        widgetId: DashboardWidget.createDashboardWidgetId(),
        notebookId: addNotebookId(notebook),
        cellId: addCellId(cell),
        left: event.offsetX,
        top: event.offsetY,
        width: Widgetstore.DEFAULT_WIDTH,
        height: Widgetstore.DEFAULT_HEIGHT,
        removed: false,
      };

      const widget = this._dbLayout.createWidget(info);
      this._dbLayout.addWidget(widget, info);
      this._dbLayout.updateWidgetInfo(info);
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
    this._dbLayout.addWidget(widget, pos);
  }

  updateWidget(
    widget: DashboardWidget,
    pos: Widgetstore.WidgetPosition
  ): boolean {
    return this._dbLayout.updateWidget(widget, pos);
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
    this._dbLayout.removeWidget(widget);
  }

  /**
   * Remove a widget from the layout.
   *
   * @param widget - the widget to remove.
   *
   */
  deleteWidget(widget: DashboardWidget): boolean {
    return this._dbLayout.deleteWidget(widget);
  }

  /**
   * Adds a dashboard widget's information to the widgetstore.
   *
   * @param info - the information to add to the widgetstore.
   */
  updateWidgetInfo(info: Widgetstore.WidgetInfo): void {
    this._dbLayout.updateWidgetInfo(info);
  }

  /**
   * Gets information from a widget.
   *
   * @param widget - the widget to collect information from.
   */
  getWidgetInfo(widget: DashboardWidget): Widgetstore.WidgetInfo {
    return this._dbLayout.getWidgetInfo(widget);
  }

  /**
   * Mark a widget as deleted in the widgetstore.
   *
   * @param widget - the widget to mark as deleted.
   */
  deleteWidgetInfo(widget: DashboardWidget): void {
    this._dbLayout.deleteWidgetInfo(widget);
  }

  /**
   * Update a widgetstore entry for a widget given that widget.
   *
   * @param widget - the widget to update from.
   */
  updateInfoFromWidget(widget: DashboardWidget): void {
    this._dbLayout.updateInfoFromWidget(widget);
  }

  /**
   * Updates the layout based on the state of the datastore.
   */
  updateLayoutFromWidgetstore(): void {
    this._dbLayout.updateLayoutFromWidgetstore();
  }

  /**
   * Undo the last change to the layout.
   */
  undo(): void {
    this._dbLayout.undo();
  }

  /**
   * Redo the last change to the layout.
   */
  redo(): void {
    this._dbLayout.redo();
  }

  // Convenient alias for layout so I don't have to type
  // (this.layout as DashboardLayout) every time.
  private _dbLayout: DashboardLayout;
}

/**
 * Main Dashboard display widget. Currently extends MainAreaWidget (May change)
 */
export class Dashboard extends MainAreaWidget<Widget> {
  // Generics??? Would love to further constrain this to DashboardWidgets but idk how
  constructor(options: Dashboard.IOptions) {
    const { notebookTracker, content, outputTracker, panel } = options;
    const store = options.store || new Widgetstore({ id: 0, notebookTracker });

    const dashboardArea = new DashboardArea({
      outputTracker,
      layout: new DashboardLayout({
        store,
        outputTracker,
        width: 1000,
        height: 1000,
      }),
    });
    super({
      ...options,
      content: content || dashboardArea,
    });
    this._dbArea = this.content as DashboardArea;

    // Having all widgetstores across dashboards have the same id might cause issues.
    this._store = store;
    this._name = options.name || 'Unnamed Dashboard';
    this.id = `JupyterDashboard-${UUID.uuid4()}`;
    this.title.label = this._name;
    this.title.icon = Icons.blueDashboard;
    // Add caption?

    this.addClass(DASHBOARD_CLASS);
    this.node.setAttribute('style', 'overflow:auto');

    // Adds save button to dashboard toolbar.
    this.toolbar.addItem('save', createSaveButton(this, panel));

    // TODO: Figure out if this is worth it. Right now it's disabled to prevent
    // double updating, and I figure manually calling this.update() whenever the
    // widgetstore is modified isn't so bad.
    //
    // Attach listener to update on table changes.
    // this._store.listenTable(
    //   { schema: Widgetstore.WIDGET_SCHEMA },
    //   this.update,
    //   this
    // );
  }

  /**
   * Add a widget to the layout.
   *
   * @param widget - the widget to add.
   */
  addWidget(widget: DashboardWidget, pos: Widgetstore.WidgetPosition): void {
    this._dbArea.addWidget(widget, pos);
  }

  updateWidget(
    widget: DashboardWidget,
    pos: Widgetstore.WidgetPosition
  ): boolean {
    return this._dbArea.updateWidget(widget, pos);
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
    this._dbArea.removeWidget(widget);
  }

  /**
   * Remove a widget from the layout.
   *
   * @param widget - the widget to remove.
   *
   */
  deleteWidget(widget: DashboardWidget): boolean {
    return this._dbArea.deleteWidget(widget);
  }

  /**
   * Adds a dashboard widget's information to the widgetstore.
   *
   * @param info - the information to add to the widgetstore.
   */
  updateWidgetInfo(info: Widgetstore.WidgetInfo): void {
    this._dbArea.updateWidgetInfo(info);
  }

  /**
   * Gets information from a widget.
   *
   * @param widget - the widget to collect information from.
   */
  getWidgetInfo(widget: DashboardWidget): Widgetstore.WidgetInfo {
    return this._dbArea.getWidgetInfo(widget);
  }

  /**
   * Mark a widget as deleted in the widgetstore.
   *
   * @param widget - the widget to mark as deleted.
   */
  deleteWidgetInfo(widget: DashboardWidget): void {
    this._dbArea.deleteWidgetInfo(widget);
  }

  /**
   * Update a widgetstore entry for a widget given that widget.
   *
   * @param widget - the widget to update from.
   */
  updateInfoFromWidget(widget: DashboardWidget): void {
    this._dbArea.updateInfoFromWidget(widget);
  }

  /**
   * Updates the layout based on the state of the datastore.
   */
  updateLayoutFromWidgetstore(): void {
    this._dbArea.updateLayoutFromWidgetstore();
  }

  /**
   * Undo the last change to the layout.
   */
  undo(): void {
    this._dbArea.undo();
  }

  /**
   * Redo the last change to the layout.
   */
  redo(): void {
    this._dbArea.redo();
  }

  get store(): Widgetstore {
    return this._store;
  }

  /**
   * The name of the Dashboard.
   */
  getName(): string {
    // get/set function isnt't working for some reason...
    // getting a not callable error when I try to set the name of a dashboard
    // when I have two methods 'get name()' and 'set name()'
    return this._name;
  }
  setName(newName: string): void {
    this._name = newName;
    this.title.label = newName;
  }

  private _name: string;
  private _store: Widgetstore;
  // Convenient alias so I don't have to type
  // (this.content as DashboardArea) every time.
  private _dbArea: DashboardArea;
}

export namespace Dashboard {
  export interface IOptions extends MainAreaWidget.IOptionsOptionalContent {
    /**
     * Dashboard name.
     */
    name?: string;

    /**
     * Tracker for child widgets.
     */
    outputTracker: WidgetTracker<DashboardWidget>;

    /**
     * Tracker for notebooks.
     */
    notebookTracker: INotebookTracker;

    /**
     * NotebookPanel.
     */
    panel: NotebookPanel;

    /**
     * Optional widgetstore to restore state from.
     */
    store?: Widgetstore;
  }
}
