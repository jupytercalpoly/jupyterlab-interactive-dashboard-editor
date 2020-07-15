import {
    JupyterFrontEnd
  } from '@jupyterlab/application';
  
  import {
    INotebookTracker,
    NotebookPanel,
    INotebookModel
  } from '@jupyterlab/notebook';
  
  import {
    IDisposable, DisposableDelegate
  } from '@lumino/disposable';
  
  import {
    ToolbarButton
  } from '@jupyterlab/apputils';
  
  import {
    DocumentRegistry
  } from '@jupyterlab/docregistry';
  
  import {
    WidgetTracker,
  } from '@jupyterlab/apputils';

  import { CodeCell, Cell} from '@jupyterlab/cells';
  
  import {
    Icons
  } from './icons';

  import {
    DashboardWidget
  }from './widget';

  import{
    Dashboard, DashboardArea
  }from './dashboard';

/**
 * Adds a button to the main toolbar.
 */
export class DashboardButton implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
  _app: JupyterFrontEnd;
  _outputTracker: WidgetTracker<DashboardWidget>;
  _dashboardTracker: WidgetTracker<Dashboard>;
  _tracker: INotebookTracker;
  constructor(app: JupyterFrontEnd, outputTracker: WidgetTracker<DashboardWidget>, dashboardTracker: WidgetTracker<Dashboard>, tracker: INotebookTracker) {
    this._app = app;
    this._outputTracker = outputTracker;
    this._dashboardTracker = dashboardTracker;
    this._tracker = tracker;
  }

  createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
    let callback = () => {
      const outputTracker = this._outputTracker;
      const dashboard = new Dashboard({outputTracker, panel});
      const currentNotebook = this._tracker.currentWidget;
      if (currentNotebook) {
        this._app.shell.activateById(currentNotebook.id);
      }

      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-bottom'
      });

      // Add the new dashboard to the tracker.
      // (dashboard.content as DashboardArea).addWidget(ToolbarItems.createSaveButton(dashboard, panel));
      //populate new dashboard based off metadata?
      for(let i = 0; i < panel.content.widgets.length; i++){
        // console.log("cell ", i, " at pos", (panel.content.widgets[i] as Cell).model.metadata.get("pos"));
        // CodeCell.execute(panel.content.widgets[i] as CodeCell, sessionContext: ISessionContext, metadata?: JSONObject):
        var pos  = (panel.content.widgets[i] as Cell).model.metadata.get("pos") as (number[])[];
        let cell = panel.content.widgets[i] as CodeCell;
          let index = i;
          let widget = new DashboardWidget({
            notebook: panel,
            cell,
            index
          });
        if(pos != undefined){
           pos.forEach(function (p) {
               console.log("found pos", p);
            (dashboard.content as DashboardArea).placeWidget(-1, widget, p);
           });
        }
      }
      dashboard.update();
      void this._dashboardTracker.add(dashboard);
    };
    let button = new ToolbarButton({
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