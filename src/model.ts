import { DocumentRegistry, DocumentModel } from '@jupyterlab/docregistry';

import {
  IModelDB,
  IObservableJSON,
  ObservableJSON,
} from '@jupyterlab/observables';

import {
  IDashboardContent,
  IDashboardMetadata,
  DASHBOARD_VERSION,
  IOutputInfo,
} from './dbformat';

import { DashboardWidget } from './widget';

import { INotebookTracker } from '@jupyterlab/notebook';

import { getPathFromNotebookId } from './utils';

import { Widgetstore } from './widgetstore';

import { ContentsManager, Contents } from '@jupyterlab/services';

import { filter, each } from '@lumino/algorithm';

import { Signal } from '@lumino/signaling';

import { Dashboard } from './dashboard';

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

  metadata: IObservableJSON;

  loaded: Signal<this, void>;

  mode: Dashboard.Mode;

  path: string;

  name: string;

  width: number;

  height: number;
}

export class DashboardModel extends DocumentModel implements IDashboardModel {
  constructor(options: DashboardModel.IOptions) {
    super(options.languagePreference, options.modelDB);

    const notebookTracker = (this.notebookTracker = options.notebookTracker);

    this.widgetstore =
      options.widgetstore || new Widgetstore({ id: 0, notebookTracker });

    this.contentsManager = options.contentsManager || new ContentsManager();
  }

  async fromJSON(value: IDashboardContent): Promise<void> {
    console.log('updating from json');
    const outputs: Widgetstore.WidgetInfo[] = [];

    for (const [path, notebookId] of Object.entries(value.paths)) {
      await this.contentsManager.get(path).catch((error) => {
        throw new Error(`Error reading notebook ${notebookId} at ${path}`);
      });
    }

    console.log('finished loading notebooks');

    for (const [notebookId, notebookOutputs] of Object.entries(value.outputs)) {
      for (const outputInfo of notebookOutputs) {
        const info: Widgetstore.WidgetInfo = {
          ...outputInfo,
          notebookId,
          widgetId: DashboardWidget.createDashboardWidgetId(),
        };
        console.log('pushing info', info);
        outputs.push(info);
      }
    }

    console.log('finished adding outputs');

    this._metadata.clear();
    const metadata = value.metadata;
    for (const [key, value] of Object.entries(metadata)) {
      this._setMetadataProperty(key, value);
    }

    console.log('finished updating metadata');

    this.widgetstore.startBatch();
    this.widgetstore.clear();
    outputs.forEach((output) => {
      this.widgetstore.addWidget(output);
    });
    this.widgetstore.endBatch();

    console.log('finished updating widgetstore');

    this._loaded.emit(void 0);
    this.mode = 'present';
  }

  toJSON(): IDashboardContent {
    const notebookTracker = this.notebookTracker;

    // Get all widgets that haven't been removed.
    const records = filter(
      this.widgetstore.getWidgets(),
      (widget) => widget.widgetId && !widget.removed
    );

    const metadata: IDashboardMetadata = {
      name: this.metadata.get('name') as string,
      dashboardHeight: +this.metadata.get('dashboardHeight'),
      dashboardWidth: +this.metadata.get('dashboardWidth'),
    };

    const file: IDashboardContent = {
      metadata,
      version: DASHBOARD_VERSION,
      outputs: {},
      paths: {},
    };

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

      file.outputs[notebookId].push(record as IOutputInfo);
    });

    return file;
  }

  toString(): string {
    return JSON.stringify(this.toJSON(), undefined, 2);
  }

  async fromString(value: string): Promise<void> {
    console.log('fromString called');
    const json = JSON.parse(value);
    console.log('new json', json);
    return this.fromJSON(json);
  }

  initialize(): void {
    // no-op
  }

  get path(): string {
    return this._path;
  }
  set path(newPath: string) {
    this._path = newPath;
  }

  get mode(): Dashboard.Mode {
    return this._mode;
  }
  set mode(newValue: Dashboard.Mode) {
    const oldValue = this._mode;
    if (oldValue === newValue) {
      return;
    }
    this.triggerStateChange({ name: 'mode', oldValue, newValue });
    this._mode = newValue;
  }

  get metadata(): IObservableJSON {
    return this._metadata;
  }

  get name(): string {
    return this.metadata.get('name') as string;
  }
  set name(newValue: string) {
    this._setMetadataProperty('name', newValue);
  }

  get width(): number {
    return +this.metadata.get('dashboardWidth');
  }
  set width(newValue: number) {
    this._setMetadataProperty('width', newValue);
  }

  get height(): number {
    return +this.metadata.get('dashboardHeight');
  }
  set height(newValue: number) {
    this._setMetadataProperty('height', newValue);
  }

  private _setMetadataProperty(key: string, newValue: any): void {
    const oldValue = this.metadata.get(key);
    if (oldValue === newValue) {
      return;
    }
    this.metadata.set(key, newValue);
    this.triggerStateChange({ name: key, oldValue, newValue });
  }

  get loaded(): Signal<this, void> {
    return this._loaded;
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

  private _metadata: IObservableJSON = new ObservableJSON();
  private _loaded = new Signal<this, void>(this);
  private _path: string;
  private _mode: Dashboard.Mode = 'edit';
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

export class DashboardModelFactory
  implements DocumentRegistry.IModelFactory<IDashboardModel> {
  constructor(options: DashboardModelFactory.IOptions) {
    this._notebookTracker = options.notebookTracker;
    console.log('model factory', this);
  }

  get isDisposed(): boolean {
    return this._disposed;
  }

  dispose(): void {
    this._disposed = true;
  }

  get fileFormat(): Contents.FileFormat {
    return 'text';
  }

  get name(): string {
    return 'dashboard';
  }

  get contentType(): Contents.ContentType {
    return 'file';
  }

  preferredLanguage(path: string): string {
    return '';
  }

  createNew(languagePreference?: string, modelDB?: IModelDB): DashboardModel {
    const notebookTracker = this._notebookTracker;
    const contentsManager = new ContentsManager();

    const model = new DashboardModel({
      notebookTracker,
      languagePreference,
      modelDB,
      contentsManager,
    });

    console.log('new model', model);

    return model;
  }

  private _disposed = false;
  private _notebookTracker: INotebookTracker;
}

export namespace DashboardModelFactory {
  export interface IOptions {
    notebookTracker: INotebookTracker;
  }
}
