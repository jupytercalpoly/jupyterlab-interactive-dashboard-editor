import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';

import { CodeCell, MarkdownCell, Cell } from '@jupyterlab/cells';

import { filter, each } from '@lumino/algorithm';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { IDragEvent } from '@lumino/dragdrop';

import { UUID } from '@lumino/coreutils';

import { ContentsManager, Contents } from '@jupyterlab/services';

import { DashboardLayout } from './custom_layout';

import { DashboardWidget } from './widget';

import { Icons } from './icons';

import { buildToolbar, createSaveButton } from './toolbar';

import { Widgetstore } from './widgetstore';

import { getPathFromNotebookId } from './utils';

import { newfile, renameDashboardFile, writeFile } from './fsutils';

import { addCellId, addNotebookId, getCellById } from './utils';

import { DASHBOARD_VERSION, WidgetInfo, DashboardSpec } from './file';

import { unsaveDialog } from './dialog';

import { DBUtils } from './dbUtils';

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

  public get dblayout(): DashboardLayout {
    return this._dbLayout;
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
    if (event.proposedAction === 'move') {
      const widget = event.source as DashboardWidget;
      const oldArea = event.source.parent as DashboardArea;
      if (oldArea === this) {
        // dragging in same dashboard.
        const pos: Widgetstore.WidgetPosition = {
          left: event.offsetX,
          top: event.offsetY,
          width: widget.node.offsetWidth,
          height: widget.node.offsetHeight,
        };
        this._dbLayout.updateWidget(widget, pos);
        this._dbLayout.updateInfoFromWidget(widget);
      } else {
        // dragging between dashboards
        const info: Widgetstore.WidgetInfo = {
          widgetId: DashboardWidget.createDashboardWidgetId(),
          notebookId: widget.notebookId,
          cellId: widget.cellId,
          left: event.offsetX,
          top: event.offsetY,
          width: widget.node.offsetWidth,
          height: widget.node.offsetHeight,
          removed: false,
        };

        const newWidget = this._dbLayout.createWidget(info);
        this._dbLayout.addWidget(newWidget, info);
        this._dbLayout.updateWidgetInfo(info);
        oldArea.deleteWidgetInfo(widget);
        oldArea.deleteWidget(widget);
      }

      // dragging from notebook -> dashboard.
    } else if (event.proposedAction === 'copy') {
      const notebook = event.source.parent as NotebookPanel;
      let cell: Cell;
      if (event.source.activeCell instanceof MarkdownCell) {
        // dragging markdown from notebook to dashboard
        cell = notebook.content.activeCell as MarkdownCell;
      } else {
        cell = notebook.content.activeCell as CodeCell;
      }
      const info: Widgetstore.WidgetInfo = {
        widgetId: DashboardWidget.createDashboardWidgetId(),
        notebookId: addNotebookId(notebook),
        cellId: addCellId(cell),
        left: event.offsetX,
        top: event.offsetY,
        width: DashboardWidget.DEFAULT_WIDTH,
        height: DashboardWidget.DEFAULT_HEIGHT,
        removed: false,
      };

      const widget = this._dbLayout.createWidget(info, true);
      this._dbLayout.addWidget(widget, info);
      // Wait until the widget is fit to content then add it to the widgetstore.
      widget.ready.connect(() => {
        const newInfo = this.getWidgetInfo(widget);
        this.updateWidgetInfo(newInfo);
      }, this);
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
    const { notebookTracker, content, outputTracker, utils } = options;
    const restore = options.store !== undefined;
    const store = options.store || new Widgetstore({ id: 0, notebookTracker });

    const dashboardArea = new DashboardArea({
      outputTracker,
      layout: new DashboardLayout({
        store,
        outputTracker,
        width: options.dashboardWidth || 1280,
        height: options.dashboardHeight || 720,
        mode: restore ? 'present' : 'edit',
      }),
    });

    super({ ...options, content: content || dashboardArea });

    // Having all widgetstores across dashboards have the same id might cause issues.
    this._store = store;
    this.setName(options.name || 'Unnamed Dashboard');
    this._contentsManager = utils.contents;
    this.id = `JupyterDashboard-${UUID.uuid4()}`;
    this.title.label = this._name;
    this.title.icon = Icons.blueDashboard;
    // Add caption?

    this.addClass(DASHBOARD_CLASS);
    this.node.setAttribute('style', 'overflow:auto');

    // Adds buttons to dashboard toolbar.
    buildToolbar(notebookTracker, this, outputTracker, utils);

    this._store.listenTable(
      { schema: Widgetstore.WIDGET_SCHEMA },
      (change) => (this._dirty = true)
    );

    // Adds save button to dashboard toolbar.
    this.toolbar.addItem('save', createSaveButton(this, notebookTracker));

    if (restore) {
      this._mode = 'present';
      this.updateLayoutFromWidgetstore();
    } else {
      this._mode = 'edit';
    }
  }

  public get area(): DashboardArea {
    return this._dbArea;
  }

  /**
   * Gets the contents of dashboard
   *
   * @returns ContentsManage
   */
  public get contentsManager(): ContentsManager {
    return this._contentsManager;
  }

  /**
   * Gets the path as string of dashboard
   *
   */
  public get path(): string {
    return this._path;
  }

  /**
   * Sets the path of dashboard
   *
   */
  public set path(v: string) {
    this._path = v;
  }

  public set dirty(v: boolean) {
    this._dirty = v;
  }

  /**
   ** Add a widget to the layout.
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

  dispose(): void {
    if (this._dirty && !this.isDisposed) {
      const dialog = unsaveDialog(this);
      dialog.launch().then((result) => {
        dialog.dispose();
        if (result.button.accept) {
          return super.dispose();
        }
      });
    } else {
      return super.dispose();
    }
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

  /**
   * Saves the dashboard to file.
   *
   * @param tracker - notebook tracker used for saving.
   *
   * @param filename - name to save dashboard as.
   *
   * @throws an error if saving fails.
   */
  async save(
    notebookTracker: INotebookTracker,
    filename: string
  ): Promise<Contents.IModel> {
    // Get all widgets that haven't been removed.
    const records = filter(
      this._store.getWidgets(),
      (widget) => widget.widgetId && !widget.removed
    );

    const file: DashboardSpec = {
      name: this._name,
      version: DASHBOARD_VERSION,
      dashboardHeight: (this._dbArea.layout as DashboardLayout).height,
      dashboardWidth: (this._dbArea.layout as DashboardLayout).width,
      paths: {},
      outputs: {},
    };

    this.setName(filename);

    each(records, (record) => {
      const notebookId = record.notebookId;
      const path = getPathFromNotebookId(notebookId, notebookTracker);

      if (path === undefined) {
        throw new Error(
          `Notebook path for notebook with id ${notebookId} not found`
        );
      }

      if (file.paths[path] !== undefined && file.paths[path] !== notebookId) {
        throw new Error(`Conflicting paths for same notebook id ${notebookId}`);
      }

      file.paths[path] = notebookId;

      if (file.outputs[notebookId] === undefined) {
        file.outputs[notebookId] = [];
      }

      file.outputs[notebookId].push({
        cellId: record.cellId,
        top: record.top,
        left: record.left,
        width: record.width,
        height: record.height,
      });
    });

    await newfile(this);
    await renameDashboardFile(filename, this);
    return writeFile(this._contentsManager, this._path, file);
  }

  /**
   * Load a dashboard from a file.
   *
   * @param path - the path to save to.
   *
   * @param notebookTracker - the current NotebookTracker.
   *
   * @param outputTracker - the current outputTracker.
   *
   * @returns - the created Dashboard.
   *
   * @throws - an error if the dashboard file is not well-formated, notebooks
   * are missing, or there is an issue reading them.
   */
  static async load(
    path: string,
    notebookTracker: INotebookTracker,
    outputTracker: WidgetTracker<DashboardWidget>,
    utils: DBUtils
  ): Promise<Dashboard> {
    // Create the contentsManager for opening/reading the dashboard file.
    const contentsManager = new ContentsManager();

    // Promise containing the file text.
    const filePromise = await contentsManager.get(path);
    const fileText = filePromise.content as string;

    if (fileText === undefined) {
      throw new Error(`Error reading file at ${path}`);
    }

    // File text as a JSOn object.
    const parsed = JSON.parse(fileText);

    // Validate version information.
    if (parsed.version === undefined) {
      throw new Error("Dashboard file missing required field 'version'");
    } else if (isNaN(+parsed.version)) {
      throw new Error('Dashboard version is invalid.');
    } else if (+parsed.version !== DASHBOARD_VERSION) {
      console.warn(
        `Dashboard file version (${+parsed.version}) doesn't match extension version (${DASHBOARD_VERSION})`
      );
    }

    // Validate notebook paths.
    if (parsed.paths === undefined) {
      throw new Error("Dashboard file missing required field 'paths'");
    }

    for (const [notebookPath, notebookId] of Object.entries(parsed.paths)) {
      if (notebookId === undefined) {
        throw new Error(`No notebook id for notebook at ${notebookPath}`);
      }

      await contentsManager.get(notebookPath).catch((error) => {
        throw new Error(`Error reading notebook at ${notebookPath}`);
      });

      // JSON.parse doesn't work for double quotes (which .ipynb files use)
      //
      // const parsedMaybeNotebook = JSON.parse(maybeNotebook.content as string);

      // const maybeNotebookId = parsedMaybeNotebook.metadata?.presto.id;

      // if (maybeNotebookId === undefined) {
      //   throw new Error(`No notebook id found for ${notebookPath}`);
      // }

      // if (maybeNotebookId !== notebookId) {
      //   throw new Error(
      //     `Notebook id of ${notebookPath} (${maybeNotebookId}) does not match dashboard file notebook id (${notebookId})`
      //   );
      // }
    }

    const paths = parsed.paths;

    // Open required notebooks.
    for (const [notebookPath, notebookId] of Object.entries(paths)) {
      // Replace this with code to open a notebook.
      console.log('opening notebook at ', notebookPath, notebookId);
    }

    // Validate outputs field
    if (parsed.outputs === undefined) {
      throw new Error("Dashboard file missing required field 'outputs'");
    }

    // Create a new widgetstore.
    const store = new Widgetstore({ id: 0, notebookTracker });

    for (const [notebookId, outputs] of Object.entries(parsed.outputs)) {
      // Make sure each id corresponds to an array of outputs.
      if (!Array.isArray(outputs)) {
        throw new Error(`Outputs for notebook ${notebookId} are not an array`);
      }
      for (const _output of outputs) {
        const output: WidgetInfo = _output;

        // Validate output information
        Dashboard.validateOutput(notebookId, output);
        let info: Widgetstore.WidgetInfo;

        const cell = getCellById(output.cellId, notebookTracker);
        // Check if cell id exists in the given notebook.
        if (cell === undefined) {
          // If cell id doesn't exist, create a red "placeholder" widget in its spot.
          info = {
            ...output,
            notebookId,
            widgetId: DashboardWidget.createDashboardWidgetId(),
            missing: true,
          };
        } else {
          // Create widget based on position, notebookId, and cellId.
          info = {
            ...output,
            notebookId,
            widgetId: DashboardWidget.createDashboardWidgetId(),
          };
        }
        // Add the widget to the widgetstore.
        store.addWidget(info);
      }
    }

    const name = parsed.name;
    let dashboardWidth = 0;
    let dashboardHeight = 0;

    if (parsed.dashboardWidth !== undefined && !isNaN(+parsed.dashboardWidth)) {
      dashboardWidth = +parsed.dashboardWidth;
    }

    if (
      parsed.dashboardHeight !== undefined &&
      !isNaN(+parsed.dashboardHeight)
    ) {
      dashboardHeight = +parsed.dashboardHeight;
    }

    contentsManager.dispose();

    // Create and return a notebook based on the contents of the widgetstore.
    return new Dashboard({
      name,
      notebookTracker,
      outputTracker,
      store,
      utils,
      dashboardWidth,
      dashboardHeight,
    });
  }

  /**
   * Makes sure an output entry from a dashboard file is well-formated.
   *
   * @param notebookId - id of output's notebook for error messages.
   *
   * @param output - output to verify.
   *
   * @throws - an error if the entry is not well-formated.
   */
  static validateOutput(notebookId: string, output: any): void {
    if (output.left === undefined) {
      throw new Error(
        `Output of notebook ${notebookId} is missing the 'left' field`
      );
    } else if (isNaN(+output.left)) {
      throw new Error(`'left' field of notebook ${notebookId} is not a number`);
    }
    if (output.top === undefined) {
      throw new Error(
        `Output of notebook ${notebookId} is missing the 'top' field`
      );
    } else if (isNaN(+output.top)) {
      throw new Error(`'top' field of notebook ${notebookId} is not a number`);
    }
    if (output.width === undefined) {
      throw new Error(
        `Output of notebook ${notebookId} is missing the 'width' field`
      );
    } else if (isNaN(+output.width)) {
      throw new Error(
        `'width' field of notebook ${notebookId} is not a number`
      );
    }
    if (output.height === undefined) {
      throw new Error(
        `Output of notebook ${notebookId} is missing the 'height' field`
      );
    } else if (isNaN(+output.height)) {
      throw new Error(
        `'height' field of notebook ${notebookId} is not a number`
      );
    }
    if (output.cellId === undefined) {
      throw new Error(
        `Output of notebook ${notebookId} is missing the 'cellId' field`
      );
    }
  }

  get mode(): Dashboard.Mode {
    return this._mode;
  }
  set mode(newMode: Dashboard.Mode) {
    this._mode = newMode;
    (this._dbArea.layout as DashboardLayout).mode = newMode;
  }

  get height(): number {
    return (this._dbArea.layout as DashboardLayout).height;
  }
  set height(newHeight: number) {
    (this._dbArea.layout as DashboardLayout).height = newHeight;
  }

  get width(): number {
    return (this._dbArea.layout as DashboardLayout).width;
  }
  set width(newWidth: number) {
    (this._dbArea.layout as DashboardLayout).width = newWidth;
  }

  private _name: string;
  private _store: Widgetstore;
  // Convenient alias so I don't have to type
  // (this.content as DashboardArea) every time.
  private _dbArea: DashboardArea;
  private _contentsManager: ContentsManager;
  private _path: string;
  private _dirty: boolean;
  private _mode: Dashboard.Mode;
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
     * Dashboard canvas width (default is 1280).
     */
    store?: Widgetstore;

    /**
     * clipboard, fullscreen and contents
     */
    utils: DBUtils;

    /**
     * Dashboard canvas width (default is 1280).
     */
    dashboardWidth?: number;

    /**
     * Dashboard canvas height (default is 720).
     */
    dashboardHeight?: number;
  }

  export type Mode = 'edit' | 'present';
}
