import { JupyterFrontEnd } from '@jupyterlab/application';

import {
  INotebookTracker,
  NotebookPanel,
  INotebookModel,
} from '@jupyterlab/notebook';

import { IDisposable, DisposableDelegate } from '@lumino/disposable';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { WidgetTracker } from '@jupyterlab/apputils';

import { CodeCell, Cell } from '@jupyterlab/cells';

import { Icons } from './icons';

import { DashboardWidget } from './widget';

import { Dashboard } from './dashboard';

import { Widgetstore } from './widgetstore';

import { addCellId, addNotebookId } from './utils';

/**
 * Adds a button to the main toolbar.
 */
export class DashboardButton
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  _app: JupyterFrontEnd;
  _outputTracker: WidgetTracker<DashboardWidget>;
  _dashboardTracker: WidgetTracker<Dashboard>;
  _tracker: INotebookTracker;
  _clipboard: Set<DashboardWidget>
  constructor(
    app: JupyterFrontEnd,
    outputTracker: WidgetTracker<DashboardWidget>,
    dashboardTracker: WidgetTracker<Dashboard>,
    tracker: INotebookTracker,
    clipboard: Set<DashboardWidget>
  ) {
    this._app = app;
    this._outputTracker = outputTracker;
    this._dashboardTracker = dashboardTracker;
    this._tracker = tracker;
    this._clipboard = clipboard;
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
        panel,
        clipboard: this._clipboard
      });
      const currentNotebook = this._tracker.currentWidget;
      if (currentNotebook) {
        this._app.shell.activateById(currentNotebook.id);
      }

      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-bottom',
      });

      //populate new dashboard based off metadata?
      for (let i = 0; i < panel.content.widgets.length; i++) {
        // console.log("cell ", i, " at pos", (panel.content.widgets[i] as Cell).model.metadata.get("pos"));
        // CodeCell.execute(panel.content.widgets[i] as CodeCell, sessionContext: ISessionContext, metadata?: JSONObject):
        const pos = (panel.content.widgets[i] as Cell).model.metadata.get(
          dashboard.getName()
        ) as Widgetstore.WidgetPosition[];
        const cell = panel.content.widgets[i] as CodeCell;
        if (pos !== undefined) {
          pos.forEach((p) => {
            const info: Widgetstore.WidgetInfo = {
              widgetId: DashboardWidget.createDashboardWidgetId(),
              notebookId: addNotebookId(panel),
              cellId: addCellId(cell),
              ...p,
              changed: true,
              removed: false,
            };
            dashboard.addWidget(info);
          });
        }
      }
      dashboard.update();
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
    return new DisposableDelegate(() => {
      button.dispose();
    });
  }
}
