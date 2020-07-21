import { JupyterFrontEnd } from '@jupyterlab/application';

import {
  INotebookTracker,
  NotebookPanel,
  INotebookModel
} from '@jupyterlab/notebook';

import { IDisposable, DisposableDelegate } from '@lumino/disposable';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { WidgetTracker } from '@jupyterlab/apputils';

import { CodeCell, Cell } from '@jupyterlab/cells';

// import {FileDialog, IFileBrowserFactory} from '@jupyterlab/filebrowser';

// import { IDocumentManager } from '@jupyterlab/docmanager';

import { Icons } from './icons';

import { DashboardWidget } from './widget';

import { Dashboard, DashboardArea } from './dashboard';

/**
 * Adds a button to the main toolbar.
 */
export class DashboardButton
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  _app: JupyterFrontEnd;
  _outputTracker: WidgetTracker<DashboardWidget>;
  _dashboardTracker: WidgetTracker<Dashboard>;
  _tracker: INotebookTracker;
//   _manager: IDocumentManager;
  constructor(
    app: JupyterFrontEnd,
    outputTracker: WidgetTracker<DashboardWidget>,
    dashboardTracker: WidgetTracker<Dashboard>,
    tracker: INotebookTracker
  ) {
    this._app = app;
    this._outputTracker = outputTracker;
    this._dashboardTracker = dashboardTracker;
    this._tracker = tracker;
  }

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    const callback = () => {
      const outputTracker = this._outputTracker;
      const dashboard = new Dashboard({ outputTracker, panel });
      const currentNotebook = this._tracker.currentWidget;
      if (currentNotebook) {
        this._app.shell.activateById(currentNotebook.id);
      }

      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-bottom'
      });

    //   const dialog = FileDialog.getOpenFiles({
    //     manager, // IDocumentManager
    //     filter: model => model.type == 'notebook' // optional (model: Contents.IModel) => boolean
    //   });
      
    //   const result = await dialog;
      
    //   if(result.button.accept){
    //     let files = result.value;
    //   }

    services.contents.newUntitled({
        type: 'file',
        ext: '.txt'
      });

      //populate new dashboard based off metadata?
      for (let i = 0; i < panel.content.widgets.length; i++) {
        // console.log("cell ", i, " at pos", (panel.content.widgets[i] as Cell).model.metadata.get("pos"));
        // CodeCell.execute(panel.content.widgets[i] as CodeCell, sessionContext: ISessionContext, metadata?: JSONObject):
        const pos = (panel.content.widgets[i] as Cell).model.metadata.get(
          dashboard.name
        ) as (number[])[];
        const cell = panel.content.widgets[i] as CodeCell;
        const index = i;
        const widget = new DashboardWidget({
          notebook: panel,
          cell,
          index
        });
        if (pos !== undefined) {
          pos.forEach(p => {
            //    console.log("found pos", p);
            (dashboard.content as DashboardArea).placeWidget(-1, widget, p);
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
      tooltip: 'Create Dashboard'
    });

    panel.toolbar.insertItem(9, 'dashboard', button);
    return new DisposableDelegate(() => {
      button.dispose();
    });
  }
}
