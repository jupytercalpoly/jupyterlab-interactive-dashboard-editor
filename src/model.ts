import { PathExt } from '@jupyterlab/coreutils';

import {
  ICellModel,
  CodeCell,
  RawCell,
  MarkdownCell,
  CodeCellModel,
  RawCellModel,
  MarkdownCellModel
} from '@jupyterlab/cells';

import { DocumentRegistry, DocumentModel } from '@jupyterlab/docregistry';

import {
  IModelDB,
  IObservableJSON,
  ObservableJSON
} from '@jupyterlab/observables';

import {
  IDashboardContent,
  IDashboardMetadata,
  DASHBOARD_VERSION,
  IOutputInfo,
  verifyDBMetadata,
  verifyCellMetadata
} from './dbformat';

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { DashboardWidget } from './widget';

import {
  INotebookTracker,
  StaticNotebook,
  INotebookModel,
  NotebookPanel
} from '@jupyterlab/notebook';

import { getPathFromNotebookId } from './utils';

import { Widgetstore } from './widgetstore';

import { ContentsManager, Contents } from '@jupyterlab/services';

import { each } from '@lumino/algorithm';

import { Signal, ISignal } from '@lumino/signaling';

import { Dashboard } from './dashboard';

import { getNotebookById } from './utils';

import { PartialJSONObject, UUID } from '@lumino/coreutils';

import { SimplifiedOutputArea } from '@jupyterlab/outputarea';

import {
  IDashboardView,
  ICellView,
  verifyCellView,
  verifyDashboardView
} from './dbformat';

import { find } from '@lumino/algorithm';

import { Widget } from '@lumino/widgets';

import { OutputWidget } from './widget';

export type LayoutChange = NewDashboardModel.LayoutChange;

export type CellChange = NewDashboardModel.CellChange;

export type DashboardChange = NewDashboardModel.DashboardChange;

/**
 * The definition of a model object for a dashboard widget.
 */
export interface IDashboardModel extends DocumentRegistry.IModel {
  /**
   * The widget store for the dashboard.
   */
  readonly widgetstore: Widgetstore;

  /**
   * The notebook tracker for the dashboard.
   */
  readonly notebookTracker: INotebookTracker;

  /**
   * The contents manager for the dashboard.
   */
  readonly contentsManager: ContentsManager;

  /**
   * The metadata associated with the dashboard.
   */
  metadata: IObservableJSON;

  /**
   * A signal emitted when the dashboard finishes deserializing from a file.
   */
  loaded: Signal<this, void>;

  /**
   * The display mode of the dashboard.
   */
  mode: Dashboard.Mode;

  /**
   * The name of the dashboard.
   */
  name: string;

  /**
   * The width of the dashboard in pixels.
   */
  width: number;

  /**
   * The height of the dashboard in pixels.
   */
  height: number;

  /**
   * The scroll mode of the dashboard.
   */
  scrollMode: Dashboard.ScrollMode;

  /**
   * The current path associated with the model.
   */
  path: string;
}

/**
 * An implementation of a dashboard Model.
 */
export class DashboardModel extends DocumentModel implements IDashboardModel {
  /**
   * Construct a new dashboard model.
   */
  constructor(options: DashboardModel.IOptions) {
    super(options.languagePreference, options.modelDB);

    const notebookTracker = (this.notebookTracker = options.notebookTracker);

    if (options.widgetstore !== undefined) {
      this.widgetstore = options.widgetstore;
      this._restore = true;
    } else {
      this.widgetstore = new Widgetstore({ id: 0, notebookTracker });
    }

    this.contentsManager = options.contentsManager || new ContentsManager();
  }

  /**
   * Deserialize the model from JSON.
   */
  async fromJSON(value: PartialJSONObject): Promise<void> {
    // A widgetstore has been supplied and the dashboard is ready to be populated.
    if (this._restore) {
      this._loaded.emit(void 0);
    }

    const outputs: Widgetstore.WidgetInfo[] = [];

    for (const [_path, notebookId] of Object.entries(value.paths)) {
      const path = PathExt.resolve(PathExt.dirname(this.path), _path);
      if (!getNotebookById(notebookId, this.notebookTracker)) {
        await this.contentsManager
          .get(path)
          .then(async model => {
            // no-op for now. Open notebook in future.
          })
          .catch(error => {
            throw new Error(`Error reading notebook ${notebookId} at ${path}`);
          });
      }
    }

    for (const [notebookId, notebookOutputs] of Object.entries(value.outputs)) {
      for (const outputInfo of notebookOutputs) {
        const info: Widgetstore.WidgetInfo = {
          ...outputInfo,
          notebookId,
          widgetId: DashboardWidget.createDashboardWidgetId()
        };
        outputs.push(info);
      }
    }

    this._metadata.clear();
    const metadata = value.metadata;
    for (const [key, value] of Object.entries(metadata)) {
      this._setMetadataProperty(key, value);
    }

    this.widgetstore.startBatch();
    this.widgetstore.clear();
    outputs.forEach(output => {
      this.widgetstore.addWidget(output);
    });
    this.widgetstore.endBatch();

    this._loaded.emit(void 0);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): PartialJSONObject {
    const notebookTracker = this.notebookTracker;

    // Get all widgets that haven't been removed.
    const records = this.widgetstore.getWidgets();

    const metadata: IDashboardMetadata = {
      name: this.name,
      dashboardHeight: this.height,
      dashboardWidth: this.width
    };

    const file: IDashboardContent = {
      metadata,
      version: DASHBOARD_VERSION,
      outputs: {},
      paths: {}
    };

    each(records, record => {
      const notebookId = record.notebookId;
      const _path = getPathFromNotebookId(notebookId, notebookTracker);

      if (_path === undefined) {
        throw new Error(
          `Notebook path for notebook with id ${notebookId} not found`
        );
      }

      const path = PathExt.relative(PathExt.dirname(this.path), _path);

      if (file.paths[path] !== undefined && file.paths[path] !== notebookId) {
        throw new Error(`Conflicting paths for same notebook id ${notebookId}`);
      }

      file.paths[path] = notebookId;

      if (file.outputs[notebookId] === undefined) {
        file.outputs[notebookId] = [];
      }

      const outputInfo: IOutputInfo = {
        cellId: record.cellId,
        pos: record.pos
      };

      file.outputs[notebookId].push(outputInfo);
    });

    return file;
  }

  /**
   * Serialize the model to a string.
   */
  toString(): string {
    return JSON.stringify(this.toJSON(), undefined, 2);
  }

  /**
   * Deserialize the model from a string.
   */
  async fromString(value: string): Promise<void> {
    if (!value) {
      this._loaded.emit(void 0);
      return;
    }
    const json = JSON.parse(value);
    return this.fromJSON(json);
  }

  initialize(): void {
    // no-op
  }

  /**
   * The display mode of the dashboard.
   */
  get mode(): Dashboard.Mode {
    return this._mode;
  }
  set mode(newValue: Dashboard.Mode) {
    const oldValue = this._mode;
    if (oldValue === newValue) {
      return;
    }
    this._mode = newValue;
    this.triggerStateChange({ name: 'mode', oldValue, newValue });
  }

  /**
   * The metadata associated with the dashboard;
   */
  get metadata(): IObservableJSON {
    return this._metadata;
  }

  /**
   * The name of the dashboard.
   *
   * ### Development notes
   * This may be redundant with the filename and could be removed.
   */
  get name(): string {
    return this.metadata.get('name') as string;
  }
  set name(newValue: string) {
    this._setMetadataProperty('name', newValue);
  }

  /**
   * The width of the dashboard in pixels.
   */
  get width(): number {
    return +this.metadata.get('dashboardWidth');
  }
  set width(newValue: number) {
    this._setMetadataProperty('dashboardWidth', newValue);
  }

  /**
   * The height of the dashboard in pixels.
   */
  get height(): number {
    return +this.metadata.get('dashboardHeight');
  }
  set height(newValue: number) {
    this._setMetadataProperty('dashboardHeight', newValue);
  }

  /**
   * Sets a key in the metadata and emits the change as a signal.
   *
   * @param key - the key to change in the metadata.
   *
   * @param newValue - the new value to set the key to.
   *
   * ### Notes
   * No signal is emitted if newValue is the same as the old value.
   */
  protected _setMetadataProperty(key: string, newValue: any): void {
    const oldValue = this.metadata.get(key);
    if (oldValue === newValue) {
      return;
    }
    this.metadata.set(key, newValue);
    this.triggerStateChange({ name: key, oldValue, newValue });
  }

  /**
   * A signal emitted when the dashboard is done being deserialized.
   */
  get loaded(): Signal<this, void> {
    return this._loaded;
  }

  /**
   * The scroll mode of the dashboard.
   */
  get scrollMode(): Dashboard.ScrollMode {
    return this._scrollMode;
  }
  set scrollMode(newValue: Dashboard.ScrollMode) {
    this._scrollMode = newValue;
  }

  /**
   * The current path associated with the model.
   */
  get path(): string {
    return this._path;
  }
  set path(newPath: string) {
    this._path = newPath;
  }

  /**
   * The widget store for the dashboard.
   */
  readonly widgetstore: Widgetstore;

  /**
   * The notebook tracker for the dashboard.
   */
  readonly notebookTracker: INotebookTracker;

  /**
   * The contents manager for the dashboard.
   */
  readonly contentsManager: ContentsManager;

  protected _metadata: IObservableJSON = new ObservableJSON();
  protected _loaded = new Signal<this, void>(this);
  private _mode: Dashboard.Mode = 'grid-edit';
  private _scrollMode: Dashboard.ScrollMode = 'constrained';
  private _path: string;
  private _restore = false;
}

/**
 * The namespace for the dashboard model.
 */
export namespace DashboardModel {
  export interface IOptions {
    notebookTracker: INotebookTracker;

    languagePreference?: string;

    modelDB?: IModelDB;

    widgetstore?: Widgetstore;

    contentsManager?: ContentsManager;
  }
}

/**
 * A factory class for dashboard models.
 */
export class DashboardModelFactory
  implements DocumentRegistry.IModelFactory<IDashboardModel> {
  /**
   * Construct a new dashboard model factory.
   */
  constructor(options: DashboardModelFactory.IOptions) {
    this._notebookTracker = options.notebookTracker;
  }

  /**
   * Whether the model factory is disposed.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Dispose of the resources held by the model factory.
   */
  dispose(): void {
    this._disposed = true;
  }

  /**
   * The format of the file.
   */
  get fileFormat(): Contents.FileFormat {
    return 'text';
  }

  /**
   * The name of the model.
   */
  get name(): string {
    return 'dashboard';
  }

  /**
   * The content type of the file.
   */
  get contentType(): Contents.ContentType {
    return 'file';
  }

  /**
   * Get the preferred kernel langauge given a path (currently a no-op).
   */
  preferredLanguage(path: string): string {
    return '';
  }

  /**
   * Create a new model for a given path.
   *
   * @param languagePreference - an optional kernel language preference.
   *
   * @param modelDB - the model database associated with the model.
   */
  createNew(languagePreference?: string, modelDB?: IModelDB): DashboardModel {
    const notebookTracker = this._notebookTracker;
    const contentsManager = new ContentsManager();

    const model = new DashboardModel({
      notebookTracker,
      languagePreference,
      modelDB,
      contentsManager
    });

    return model;
  }

  private _disposed = false;
  private _notebookTracker: INotebookTracker;
}

/**
 * A namespace for the dashboard model factory.
 */
export namespace DashboardModelFactory {
  export interface IOptions {
    notebookTracker: INotebookTracker;
  }
}

// NEWNEW

/**
 * A dashboard model to keep track of the dashboard state.
 */
export class NewDashboardModel {
  /**
   * Construct a `DashboardModel`.
   */
  constructor(options: NewDashboardModel.IOptions) {
    const {
      dashboardId,
      context,
      rendermime,
      contentFactory,
      mimeTypeService,
      editorConfig,
      notebookConfig
    } = options;

    this._id = dashboardId || UUID.uuid4();
    this._context = context;
    this.rendermime = rendermime;
    this.contentFactory = contentFactory;
    this.mimeTypeService = mimeTypeService;
    this._editorConfig = editorConfig;
    this._notebookConfig = notebookConfig;
    this._inBatch = false;
    this._changes = [];

    this._ready = new Signal<this, null>(this);
    this._contentChanged = new Signal<this, null>(this);
    this._stateChanged = new Signal<this, null>(this);
    this._layoutChanged = new Signal<this, LayoutChange[]>(this);

    this._context.sessionContext.ready.then(() => {
      // this also ensures dashboard metadata
      this._info = this._getDashboardViewById(this._id);
      this._ensureCellsMetadata();
      this._context.save().then(_ => this._ready.emit(null));
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
   * A config object for cell editors.
   */
  get editorConfig(): StaticNotebook.IEditorConfig {
    return this._editorConfig;
  }
  /**
   * A config object for cell editors.
   *
   * @param value - A `StaticNotebook.IEditorConfig`.
   */
  set editorConfig(value: StaticNotebook.IEditorConfig) {
    this._editorConfig = value;
  }

  /**
   * A config object for notebook widget.
   */
  get notebookConfig(): StaticNotebook.INotebookConfig {
    return this._notebookConfig;
  }
  /**
   * A config object for notebook widget.
   *
   * @param value - A `StaticNotebook.INotebookConfig`.
   */
  set notebookConfig(value: StaticNotebook.INotebookConfig) {
    this._notebookConfig = value;
  }

  /**
   * A signal emitted when the model is ready.
   */
  get ready(): ISignal<this, null> {
    return this._ready;
  }

  /**
   * A signal emitted when the model state changes.
   */
  get stateChanged(): ISignal<this, null> {
    return this._stateChanged;
  }

  /**
   * A signal emitted when the model content changes.
   */
  get contentChanged(): ISignal<this, null> {
    return this._contentChanged;
  }

  /**
   * A signal emitted when a cell or the dashboard changes.
   */
  get layoutChanged(): ISignal<this, LayoutChange[]> {
    return this._layoutChanged;
  }

  /**
   * The id of the dashboard view of the model.
   */
  get id(): string {
    return this._id;
  }

  /**
   * The context associated with the model.
   */
  get context(): DocumentRegistry.IContext<INotebookModel> {
    return this._context;
  }

  /**
   * Whether or not the model is in the middle of a batch of changes.
   */
  get inBatch(): boolean {
    return this._inBatch;
  }

  /**
   * The metadata of the dashboard notebook.
   */
  get metadata(): Record<string, any> | undefined {
    return this._context.model.metadata.get('presto') as Record<string, any>;
  }

  set metadata(newMetadata: Record<string, any>) {
    if (!verifyDBMetadata(newMetadata)) {
      return;
    }
    this._context.model.metadata.set('presto', newMetadata);
    const change: DashboardChange = { type: 'dashboard' };
    this._pushChangeAndSignalIfNotBatch(change);
  }

  /**
   * The `IDashboardView` used by the model.
   */
  get info(): IDashboardView {
    return this._info;
  }
  set info(newInfo: IDashboardView) {
    if (!verifyDashboardView(newInfo)) {
      return;
    }
    this._ensureMetadata();
    const metadata = this.metadata;
    metadata.views[this.id] = newInfo;
    this.metadata = metadata;
    this._info = newInfo;
  }

  /**
   * Creates a new dashboard output widget from an `ICellModel`.
   *
   * @param cellModel - `ICellModel` to create the output from.
   */
  public createOutput(cellModel: ICellModel): OutputWidget {
    let content: Widget;

    switch (cellModel.type) {
      case 'code': {
        const codeCell = new CodeCell({
          model: cellModel as CodeCellModel,
          rendermime: this.rendermime,
          contentFactory: this.contentFactory,
          editorConfig: this._editorConfig.code,
          updateEditorOnShow: true
        });

        content = new SimplifiedOutputArea({
          model: codeCell.outputArea.model,
          rendermime: codeCell.outputArea.rendermime,
          contentFactory: codeCell.outputArea.contentFactory
        });

        break;
      }
      case 'markdown': {
        const markdownCell = new MarkdownCell({
          model: cellModel as MarkdownCellModel,
          rendermime: this.rendermime,
          contentFactory: this.contentFactory,
          editorConfig: this._editorConfig.markdown,
          updateEditorOnShow: false
        });
        markdownCell.inputHidden = false;
        markdownCell.rendered = true;
        Private.removeElements(markdownCell.node, 'jp-Collapser');
        Private.removeElements(markdownCell.node, 'jp-InputPrompt');
        content = markdownCell;
        break;
      }
      default: {
        const rawCell = new RawCell({
          model: cellModel as RawCellModel,
          contentFactory: this.contentFactory,
          editorConfig: this._editorConfig.raw,
          updateEditorOnShow: false
        });
        rawCell.inputHidden = false;
        Private.removeElements(rawCell.node, 'jp-Collapser');
        Private.removeElements(rawCell.node, 'jp-InputPrompt');
        content = rawCell;
        break;
      }
    }

    return new OutputWidget({
      content,
      viewId: this.id,
      // Using cell model id, not presto cell id
      cellId: cellModel.id,
      type: cellModel.type
    });
  }

  /**
   * Get the dashboard cell's metadata.
   *
   * @param id - Cell id.
   */
  public getCellInfo(id: string): ICellView | undefined {
    const targetCell = this.getCellModel(id);
    if (targetCell != null) {
      const data = targetCell.metadata.get('presto') as Record<string, any>;
      const info = data.views[this.id];
      return info != null ? info : undefined;
    }
    return undefined;
  }

  /**
   * Set the dashboard cell's metadata.
   *
   * @param id - Cell id.
   *
   * @param info - The new ICellView for the cell.
   */
  public setCellInfo(id: string, info: ICellView): void {
    this.setPartialCellInfo(id, info);
  }

  /**
   * Updates given fields in a dashboard cell's metadata.
   *
   * @param id - Cell id.
   *
   * @param info - A `Partial<ICellView> with new values for the cell.
   */
  public setPartialCellInfo(id: string, info: Partial<ICellView>): void {
    const targetCell = this.getCellModel(id);
    if (targetCell == null) {
      return;
    }
    this._ensureCellMetadata(targetCell);
    const metadata = targetCell.metadata.get('presto') as Record<string, any>;
    const oldInfo = metadata.views[this.id];
    const newView = { ...oldInfo, ...info };
    metadata.views[this.id] = newView;
    console.log('old, new, combined', oldInfo, info, newView);
    targetCell.metadata.set('presto', metadata);
    const change: CellChange = {
      type: 'cell',
      id: targetCell.id
    };
    this._pushChangeAndSignalIfNotBatch(change);
  }

  /**
   * Hide (remove) a cell from the dashboard.
   *
   * @param id - Id of cell to hide.
   */
  public hideCell(id: string): void {
    const targetCell = this.getCellModel(id);
    if (targetCell == null) {
      return;
    }
    this._ensureCellMetadata(targetCell);
    const data = targetCell.metadata.get('presto') as Record<string, any>;
    data.views[this.id].hidden = true;
    targetCell.metadata.set('presto', data);
    const change: CellChange = {
      type: 'cell',
      id: targetCell.id
    };
    this._pushChangeAndSignalIfNotBatch(change);
  }

  /**
   * Gets an `ICellModel` from the notebook by id.
   *
   * @param id - Id of the `ICellModel` to return.
   */
  public getCellModel(id: string): ICellModel | undefined {
    return find(this._context.model.cells, cell => cell.id === id);
  }

  /**
   * Make sure the dashboard's notebook has metadata and that it's properly formatted.
   */
  private _ensureMetadata(): void {
    let metadata = this.metadata;
    let view =
      metadata.views && this.id in metadata.views
        ? metadata.views[this.id]
        : undefined;

    if (verifyDashboardView(view)) {
      return;
    } else if (!verifyDBMetadata(metadata)) {
      metadata = {
        id: UUID.uuid4(),
        views: {}
      };
    }

    view = NewDashboardModel.getDefaultView();
    metadata.views[this.id] = view;
    this.metadata = metadata;
  }

  /**
   * Make sure the notebook's cells' have metadata and that they're properly formatted.
   */
  private _ensureCellsMetadata(): void {
    each(this._context.model.cells, cell => this._ensureCellMetadata(cell));
  }

  /**
   * Make sure a notebook cell has metadata and that it's properly formatted.
   */
  private _ensureCellMetadata(cell: ICellModel): void {
    const name = this.info.name;
    let metadata = cell.metadata.get('presto') as Record<string, any>;
    let view =
      metadata.view && this.id in metadata.view
        ? metadata.view[this.id]
        : undefined;

    if (verifyCellView(view)) {
      return;
    } else if (!verifyCellMetadata(metadata)) {
      metadata = {
        id: UUID.uuid4(),
        views: {}
      };
    }

    view = {
      name,
      pos: {
        left: 0,
        top: 0,
        width: 0,
        height: 0
      },
      hidden: true,
      snapToGrid: true
    };

    metadata.views[this.id] = view;
    cell.metadata.set('presto', metadata);
    // emit change?
  }

  /**
   * Returns a dashboard view from the notebook given its id.
   *
   * @param id - the id of the dashboard view.
   */
  private _getDashboardViewById(id: string): IDashboardView | undefined {
    this._ensureMetadata();
    const view = this.metadata.views[id];
    return view != null ? view : undefined;
  }

  /**
   * Start a batch of changes. Changes won't be emitted until the batch ends.
   */
  public beginBatch(): void {
    this._inBatch = true;
  }

  /**
   * End a batch of changes and emit all changes since the batch started.
   */
  public endBatch(): void {
    if (!this.inBatch) {
      return;
    }
    this._inBatch = false;
    this._signalLayoutChanges();
  }

  /**
   * Sel-explanatory (if wordy) function name.
   *
   * @param change - the change to push or emit.
   */
  private _pushChangeAndSignalIfNotBatch(change: LayoutChange): void {
    this._changes.push(change);
    this._contentChanged.emit(null);
    this._context.model.dirty = true;
    if (!this.inBatch) {
      this._signalLayoutChanges();
    }
  }

  /**
   * Signals that changes have occured in the model and are ready to be rendered.
   */
  private _signalLayoutChanges(): void {
    this._layoutChanged.emit(this._changes);
    this._changes = [];
  }

  private _context: DocumentRegistry.IContext<INotebookModel>;
  private _editorConfig: StaticNotebook.IEditorConfig;
  private _notebookConfig: StaticNotebook.INotebookConfig;

  private _ready: Signal<this, null>;
  private _stateChanged: Signal<this, null>;
  private _contentChanged: Signal<this, null>;
  private _layoutChanged: Signal<this, LayoutChange[]>;
  private _id: string;
  private _inBatch: boolean;
  private _changes: LayoutChange[];

  private _info: IDashboardView;
}

export namespace NewDashboardModel {
  /**
   * An options object for initializing a `DashboardModel`.
   */
  export interface IOptions {
    /**
     * The dashboard id of the dashboard to render. Creates a new dashboard if undefined.
     */
    dashboardId?: string;

    /**
     * The `Notebook` context.
     */
    context: DocumentRegistry.IContext<INotebookModel>;

    /**
     * The rendermime instance for this context.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * A `NotebookPanel` content factory.
     */
    contentFactory: NotebookPanel.IContentFactory;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * A config object for cell editors
     */
    editorConfig: StaticNotebook.IEditorConfig;

    /**
     * A config object for notebook widget
     */
    notebookConfig: StaticNotebook.INotebookConfig;
  }

  export function getDefaultView(): IDashboardView {
    return {
      name: 'default',
      cellWidth: 32,
      cellHeight: 32,
      dashboardHeight: window.innerHeight,
      dashboardWidth: window.innerWidth
    };
  }

  export type CellChange = {
    type: 'cell';
    id: string;
  };

  export type DashboardChange = {
    type: 'dashboard';
  };

  export type LayoutChange = CellChange | DashboardChange;
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * Remove children by className from an HTMLElement.
   */
  export function removeElements(node: HTMLElement, className: string): void {
    const elements = node.getElementsByClassName(className);
    for (let i = 0; i < elements.length; i++) {
      elements[i].remove();
    }
  }
}
