import { DocumentRegistry, ABCWidgetFactory } from '@jupyterlab/docregistry';

import { CommandRegistry } from '@lumino/commands';

import { NewDashboardDocumentWidget, DashboardPanel } from './dashboard';

import { IEditorMimeTypeService } from '@jupyterlab/codeeditor';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import {
  INotebookModel,
  NotebookPanel,
  StaticNotebook
} from '@jupyterlab/notebook';

/**
 * A widget factory for `DashboardDocument` widgets.
 */
export class NewDashboardDocumentWidgetFactory extends ABCWidgetFactory<
  NewDashboardDocumentWidget,
  INotebookModel
> {
  constructor(
    options: NewDashboardDocumentWidgetFactory.IOptions<
      NewDashboardDocumentWidget
    >
  ) {
    super(options);
    this.commands = options.commands;
    this.rendermime = options.rendermime;
    this.contentFactory =
      options.contentFactory || NotebookPanel.defaultContentFactory;
    this.mimeTypeService = options.mimeTypeService;
    this._editorConfig =
      options.editorConfig || StaticNotebook.defaultEditorConfig;
    this._notebookConfig =
      options.notebookConfig || StaticNotebook.defaultNotebookConfig;
  }

  /**
   * The `CommandRegistry` used to build the toolbar.
   */
  readonly commands: CommandRegistry;

  /**
   * The rendermime instance.
   */
  readonly rendermime: IRenderMimeRegistry;

  /**
   * The content factory used by the widget factory.
   */
  readonly contentFactory: NotebookPanel.IContentFactory;

  /**
   * The service used to look up mime types.
   */
  readonly mimeTypeService: IEditorMimeTypeService;

  /**
   * A configuration object for cell editor settings.
   */
  get editorConfig(): StaticNotebook.IEditorConfig {
    return this._editorConfig;
  }
  set editorConfig(value: StaticNotebook.IEditorConfig) {
    this._editorConfig = value;
  }

  /**
   * A configuration object for notebook settings.
   */
  get notebookConfig(): StaticNotebook.INotebookConfig {
    return this._notebookConfig;
  }
  set notebookConfig(value: StaticNotebook.INotebookConfig) {
    this._notebookConfig = value;
  }

  /**
   * Creates a new `DashboardDocumentWidget`.
   *
   * @param context - The `Notebook` context.
   * @param source - An optional `DashboardDocumentWidget`.
   */
  protected createNewWidget(
    context: DocumentRegistry.IContext<INotebookModel>,
    source?: NewDashboardDocumentWidget
  ): NewDashboardDocumentWidget {
    const options = {
      context: context,
      rendermime: source
        ? source.content.rendermime
        : this.rendermime.clone({ resolver: context.urlResolver }),
      contentFactory: this.contentFactory,
      mimeTypeService: this.mimeTypeService,
      editorConfig: source ? source.content.editorConfig : this._editorConfig,
      notebookConfig: source
        ? source.content.notebookConfig
        : this._notebookConfig
    };

    return new NewDashboardDocumentWidget({
      context,
      content: new DashboardPanel(options),
      commands: this.commands
    });
  }

  private _editorConfig: StaticNotebook.IEditorConfig;
  private _notebookConfig: StaticNotebook.INotebookConfig;
}

export namespace NewDashboardDocumentWidgetFactory {
  export interface IOptions<T extends NewDashboardDocumentWidget>
    extends DocumentRegistry.IWidgetFactoryOptions<T> {
    /*
     * A rendermime instance.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * A notebook panel content factory.
     */
    contentFactory: NotebookPanel.IContentFactory;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * A `CommandRegistry` containing commands used to the build the `DashboardDocumentWidget` toolbar.
     */
    commands: CommandRegistry;

    /**
     * The notebook cell editor configuration.
     */
    editorConfig?: StaticNotebook.IEditorConfig;

    /**
     * The notebook configuration.
     */
    notebookConfig?: StaticNotebook.INotebookConfig;
  }
}
