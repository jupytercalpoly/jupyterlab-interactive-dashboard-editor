import { JupyterFrontEnd, ILabShell } from '@jupyterlab/application';

import {
  INotebookTracker,
  NotebookPanel,
  INotebookModel,
} from '@jupyterlab/notebook';

import { IDisposable, DisposableDelegate } from '@lumino/disposable';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { WidgetTracker } from '@jupyterlab/apputils';

import { Icons } from './icons';

import { DashboardWidget } from './widget';

import { Dashboard } from './dashboard';

import { DBUtils } from './dbUtils';


/**
 * Adds a button to the main toolbar.
 */
export class DashboardButton
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  constructor(
    app: JupyterFrontEnd,
    outputTracker: WidgetTracker<DashboardWidget>,
    dashboardTracker: WidgetTracker<Dashboard>,
    tracker: INotebookTracker,
    utils: DBUtils,
    shell: ILabShell
  ) {
    this._app = app;
    this._outputTracker = outputTracker;
    this._dashboardTracker = dashboardTracker;
    this._tracker = tracker;
    this._utils = utils;
    this._shell = shell;
  }

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const callback = (): void => {
      const outputTracker = this._outputTracker;
      const dashboard = new Dashboard({
        notebookTracker: this._tracker,
        outputTracker,
        utils: this._utils,
      });

      const currentNotebook = this._tracker.currentWidget;

      if (currentNotebook) {
        this._app.shell.activateById(currentNotebook.id);
      }

      this._shell.collapseLeft();
      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-left',
      });

      void this._dashboardTracker.add(dashboard);
    };

    const button = new ToolbarButton({
      className: 'dashboardButton',
      icon: Icons.blueDashboard,
      iconClass: 'dashboard',
      onClick: callback,
      tooltip: 'Create Dashboard',
    });

    panel.toolbar.insertItem(9, 'dashboard', button);

    return new DisposableDelegate(() => button.dispose());
  }
    
  private _app: JupyterFrontEnd;
  private _outputTracker: WidgetTracker<DashboardWidget>;
  private _dashboardTracker: WidgetTracker<Dashboard>;
  private _tracker: INotebookTracker;
  private _utils: DBUtils;
  private _shell: ILabShell;
}
