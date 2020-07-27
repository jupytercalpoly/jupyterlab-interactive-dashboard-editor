import { NotebookPanel } from '@jupyterlab/notebook';

import { Widget } from '@lumino/widgets';

import { ToolbarButton } from '@jupyterlab/apputils';

import { Cell } from '@jupyterlab/cells';

import { saveIcon, refreshIcon, undoIcon, cutIcon, copyIcon, pasteIcon, runIcon, stopIcon, fastForwardIcon} from '@jupyterlab/ui-components';

import { Dashboard } from './dashboard';

import { DashboardWidget } from './widget';

import { Icons} from './icons';

export function buildToolbar(dashboard: Dashboard, panel: NotebookPanel){
  dashboard.toolbar.addItem('save', createSaveButton(dashboard, panel));
  dashboard.toolbar.addItem('undo', createUndoButton(dashboard, panel));
  dashboard.toolbar.addItem('redo', createRedoButton(dashboard, panel));
  dashboard.toolbar.addItem('cut', createCutButton(dashboard, panel));
  dashboard.toolbar.addItem('copy', createCopyButton(dashboard, panel));
  dashboard.toolbar.addItem('paste', createPasteButton(dashboard, panel));
  dashboard.toolbar.addItem('run', createRunButton(dashboard, panel));
  dashboard.toolbar.addItem('stop', createStopButton(dashboard, panel));
  dashboard.toolbar.addItem('restart', createRestartButton(dashboard, panel));
  dashboard.toolbar.addItem('run all', createRunAllButton(dashboard, panel));
}

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

/**
 * Create undo button toolbar item.
 */

export function createUndoButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: undoIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Undo',
  });
  return button;
}

/**
 * Create redo button toolbar item.
 */

export function createRedoButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: Icons.redoToolbarIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Redo',
  });
  return button;
}

/**
 * Create cut button toolbar item.
 */

export function createCutButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: cutIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Cut the selected outputs',
  });
  return button;
}

/**
 * Create copy button toolbar item.
 */

export function createCopyButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: copyIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Copy the selected outputs',
  });
  return button;
}

/**
 * Create paste button toolbar item.
 */

export function createPasteButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: pasteIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Paste outputs from the clipboard',
  });
  return button;
}

/**
 * Create run button toolbar item.
 */

export function createRunButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: runIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Run the selected outputs',
  });
  return button;
}

/**
 * Create stop button toolbar item.
 */

export function createStopButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: stopIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Interrupt all kernels',
  });
  return button;
}

/**
 * Create restart button toolbar item.
 */

export function createRestartButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: refreshIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Restart all kernels',
  });
  return button;
}

/**
 * Create run all button toolbar item.
 */

export function createRunAllButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: fastForwardIcon,
    onClick: (): void => {
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      // let cell: Cell;
      while (widget) {
        // cell = widget.cell as Cell;
        // widget.notebook.
        widget = widgets.next() as DashboardWidget;
      }
      //saving the cell metadata needs to save notebook?
    },
    tooltip: 'Restart all kernels, then re-run all notebooks',
  });
  return button;
}
