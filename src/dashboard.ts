import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';

import { CodeCell } from '@jupyterlab/cells';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { IDragEvent } from '@lumino/dragdrop';

import { UUID } from '@lumino/coreutils';

import { ContentsManager, Contents} from '@jupyterlab/services';

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

      // Should probably try to avoid calling methods of the parent.
      (this.parent as Dashboard).moveWidget(widget, pos);

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
        changed: true,
        removed: false,
      };

      // Should probably try to avoid calling methods of the parent.
      (this.parent as Dashboard).addWidget(info);
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
}

async function newfile (contents: ContentsManager){
  const file = await contents.newUntitled({
    path: '/',
    type: 'file',
    ext: 'dashboard'
  });
  return file;
}

/**
 * Main Dashboard display widget. Currently extends MainAreaWidget (May change)
 */
export class Dashboard extends MainAreaWidget<Widget> {
  // Generics??? Would love to further constrain this to DashboardWidgets but idk how
  constructor(options: Dashboard.IOptions) {
    const { notebookTracker, content, outputTracker, panel } = options;
    const store = options.store || new Widgetstore({ id: 0, notebookTracker });
    const contents = new ContentsManager();

    newfile(contents).then(f => {
      this._file = f;
    })

    const dashboardArea = new DashboardArea({
      outputTracker,
      layout: new DashboardLayout({ store, outputTracker }),
    });
    super({
      ...options,
      content: content || dashboardArea,
    });

    // Having all widgetstores across dashboards have the same id might cause issues.
    this._store = store;
    this._name = options.name || 'Unnamed Dashboard';
    this._contents = contents;
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

  public get contents() : ContentsManager{
    return this._contents; 
  }

  public get file() : Contents.IModel{
    return this._file;
  }
  
  /**
   * Adds a dashboard widget to the widgetstore.
   *
   * @param info - the information to add to the widgetstore.
   */
  addWidget(info: Widgetstore.WidgetInfo): void {
    this._store.addWidget(info);
    this.update();
  }

  /**
   * Updates the position of a widget already in the widgetstore.
   *
   * @param widget - the widget to update.
   *
   * @param pos - the new widget position.
   *
   * @returns whether the update was successful.
   *
   * ### Notes
   * The update will be unsuccesful if the widget isn't in the store or was
   * previously removed.
   */
  moveWidget(
    widget: DashboardWidget,
    pos: Widgetstore.WidgetPosition
  ): boolean {
    const success = this._store.moveWidget(widget, pos);
    this.update();
    return success;
  }

  /**
   * Mark a widget as removed.
   *
   * @param widget - widget to delete.
   *
   * @returns whether the deletion was successful.
   */
  deleteWidget(widget: DashboardWidget): boolean {
    const success = this._store.deleteWidget(widget);
    this.update();
    return success;
  }

  /**
   * Undo a dashboard change.
   *
   * @param transactionId - the ID of the transaction to undo, or undefined
   * to undo the last transaction.
   *
   * @returns - a promise which resolves when the action is complete.
   *
   * @throws - an exception if `undo` is called during a transaction.
   */
  undo(): void {
    this._store.undo();
    this.update();
  }

  /**
   * Redo a dashboard change.
   *
   * @param transactionId - the ID of the transaction to redo, or undefined
   * to redo the last transaction.
   *
   * @returns - a promise which resolves when the action is complete.
   *
   * @throws - an exception if `undo` is called during a transaction.
   */
  redo(): void {
    this._store.redo();
    this.update();
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
  private _contents: ContentsManager;
  private _file: Contents.IModel;
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