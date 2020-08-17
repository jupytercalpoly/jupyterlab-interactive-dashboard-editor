import { JupyterFrontEnd, ILabShell } from '@jupyterlab/application';

import {
  INotebookTracker,
  NotebookPanel,
  INotebookModel,
} from '@jupyterlab/notebook';

import { IDisposable, DisposableDelegate } from '@lumino/disposable';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { DashboardIcons } from './icons';

/**
 * Adds a button to the main toolbar.
 */
export class DashboardButton
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  constructor(
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    shell: ILabShell
  ) {
    this._app = app;
    this._tracker = tracker;
    this._shell = shell;
  }

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const callback = (): void => {
      const widgetFactory = this._app.docRegistry.getWidgetFactory('dashboard');
      const dashboard = widgetFactory.createNew(context);
      console.log('new dashboard doc', dashboard);

      const currentNotebook = this._tracker.currentWidget;

      if (currentNotebook) {
        this._app.shell.activateById(currentNotebook.id);
      }

      this._shell.collapseLeft();
      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-left',
      });
    };

    const button = new ToolbarButton({
      className: 'dashboardButton',
      icon: DashboardIcons.blueDashboard,
      iconClass: 'dashboard',
      onClick: callback,
      tooltip: 'Create Dashboard',
    });

    panel.toolbar.insertItem(9, 'dashboard', button);

    return new DisposableDelegate(() => button.dispose());
  }

  private _app: JupyterFrontEnd;
  private _tracker: INotebookTracker;
  private _shell: ILabShell;
}
