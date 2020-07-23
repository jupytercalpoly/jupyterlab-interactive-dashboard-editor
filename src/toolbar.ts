import { NotebookPanel } from '@jupyterlab/notebook';

import { Widget } from '@lumino/widgets';

import { ToolbarButton } from '@jupyterlab/apputils';

import { Cell } from '@jupyterlab/cells';

import { saveIcon } from '@jupyterlab/ui-components';

import {Contents} from '@jupyterlab/services';

import { Dashboard } from './dashboard';

import { DashboardWidget } from './widget';

import {showDialog, Dialog} from '@jupyterlab/apputils'

/**
 * Create save button toolbar item.
 */

export function createSaveButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: saveIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      let cell: Cell;
      let newPos = [];
      let pos: number[][];
      while (widget) {
        cell = widget.cell as Cell;
        newPos = [];
        newPos.push(Number(widget.node.style.left.split('p')[0]));
        newPos.push(Number(widget.node.style.top.split('p')[0]));
        newPos.push(Number(widget.node.style.width.split('p')[0]));
        newPos.push(Number(widget.node.style.height.split('p')[0]));
        pos = cell.model.metadata.get(dashboard.getName()) as number[][];
        if (pos === undefined) {
          pos = [];
        }
        pos.push(newPos);
        cell.model.metadata.set(dashboard.getName(), pos);
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?

      const DASHBOARD: Partial<Contents.IModel> = {
        path: dashboard.file.path,
        type: 'file',
        mimetype: 'text/plain',
        content: JSON.stringify(newPos),
        format: 'text'
      };

      dashboard.contents.save(dashboard.file.path, DASHBOARD);
      dashboard.contents.rename(dashboard.file.path, "/" + dashboard.getName() + ".dashboard");
      void showDialog({
        title: 'Dashboard saved',
        body: "All changes to " + dashboard.getName() + ".dashboard" + " is saved",
        buttons: [Dialog.okButton()]
      });
      console.log(dashboard.file.path);
    },
    tooltip: 'Save Dashboard',
  });
  return button;
}