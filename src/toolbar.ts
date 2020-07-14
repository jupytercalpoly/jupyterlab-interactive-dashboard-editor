  import {
    NotebookPanel,
  } from '@jupyterlab/notebook';
  
  import {
    Widget,
  } from '@lumino/widgets';
  
  import {
    ToolbarButton
  } from '@jupyterlab/apputils';
  
  import {
    Cell
  } from '@jupyterlab/cells';
  
  import {
    saveIcon
  } from '@jupyterlab/ui-components';

  import {
    Dashboard,
  } from './dashboard';

  import {
    DashboardWidget
  } from './widget';

export namespace ToolbarItems {
    /**
     * Create save button toolbar item.
     */
  
    export function createSaveButton(dashboard: Dashboard, panel: NotebookPanel): Widget {
      return new ToolbarButton({
          icon: saveIcon,
          onClick: () => {
          const widgets = dashboard.content.children().iter();
          let widget = (widgets.next() as DashboardWidget);
          let cell: Cell;
          let pos = [];
          while(widget){
            cell = (widget.cell) as Cell;
            pos = [];
            // pos.push("left");
            pos.push(widget.node.style.left.split('p')[0]);
            // pos.push("top");
            pos.push(widget.node.style.top.split('p')[0]);
            // pos.push("width");
            pos.push(widget.node.style.width.split('p')[0]);
            // pos.push("height");
            pos.push(widget.node.style.height.split('p')[0]);
            cell.model.metadata.set('pos', pos);
            console.log("pos", cell.model.metadata.get("pos"));
            widget = (widgets.next() as DashboardWidget);
            }
            //saving the cell metadata needs to save notebook?
          },
          tooltip: 'Save Dashboard'
        });
      }
  }