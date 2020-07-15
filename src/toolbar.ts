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
        let button = new ToolbarButton({
          icon: saveIcon,
          onClick: () => {
          const widgets = dashboard.content.children().iter();
          let widget = (widgets.next() as DashboardWidget);
          let cell: Cell;
          let newPos = [];
          var pos: (number[])[];
          while(widget){
            cell = (widget.cell) as Cell;
            // cell.model.metadata.set('pos', pos);
            newPos = [];
            // pos.push("left");
            newPos.push(Number(widget.node.style.left.split('p')[0]));
            // pos.push("top");
            newPos.push(Number(widget.node.style.top.split('p')[0]));
            // pos.push("width");
            newPos.push(Number(widget.node.style.width.split('p')[0]));
            // pos.push("height");
            newPos.push(Number(widget.node.style.height.split('p')[0]));
            pos = cell.model.metadata.get("pos") as (number[])[];
            if(pos == undefined){
                pos = [];
            }
            pos.push(newPos);
            // console.log("pos", pos);
            cell.model.metadata.set('pos', pos);
            // console.log("metadata", cell.model.metadata.get("pos"));
            widget = (widgets.next() as DashboardWidget);
            }
            //saving the cell metadata needs to save notebook?
          },
          tooltip: 'Save Dashboard'
        });
        return button;
      }
  }