import { NotebookPanel } from '@jupyterlab/notebook';

import { Widget } from '@lumino/widgets';

import { ToolbarButton } from '@jupyterlab/apputils';

import { Cell } from '@jupyterlab/cells';

import { saveIcon } from '@jupyterlab/ui-components';

import { Dashboard } from './dashboard';

import { DashboardWidget } from './widget';

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
    },
    tooltip: 'Save Dashboard',
  });
  return button;
}