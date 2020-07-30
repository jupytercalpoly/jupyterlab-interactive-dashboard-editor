import { NotebookPanel, NotebookActions, INotebookTracker} from '@jupyterlab/notebook';

import { Widget } from '@lumino/widgets';

import { ToolbarButton, WidgetTracker, sessionContextDialogs} from '@jupyterlab/apputils';

import { CodeCell } from '@jupyterlab/cells';

import { saveIcon, refreshIcon, undoIcon, cutIcon, copyIcon, pasteIcon, runIcon, stopIcon, fastForwardIcon} from '@jupyterlab/ui-components';

import { Dashboard } from './dashboard';

import { DashboardWidget } from './widget';

import { saveDialog } from './dialog';

import { Icons} from './icons';

import { Widgetstore } from './widgetstore';

import { addCellId, addNotebookId } from './utils';

export function buildToolbar(notebookTrakcer: INotebookTracker,
  dashboard: Dashboard, panel: NotebookPanel, tracker: WidgetTracker<DashboardWidget>, clipboard: Set<DashboardWidget>){
  dashboard.toolbar.addItem('save', createSaveButton(dashboard, panel, notebookTrakcer));
  dashboard.toolbar.addItem('undo', createUndoButton(dashboard, panel));
  dashboard.toolbar.addItem('redo', createRedoButton(dashboard, panel));
  dashboard.toolbar.addItem('cut', createCutButton(dashboard, panel, tracker, clipboard));
  dashboard.toolbar.addItem('copy', createCopyButton(dashboard, panel, tracker, clipboard));
  dashboard.toolbar.addItem('paste', createPasteButton(dashboard, panel, clipboard));
  dashboard.toolbar.addItem('run', createRunButton(dashboard, panel, tracker));
  // dashboard.toolbar.addItem('stop', createStopButton(dashboard, panel));
  // dashboard.toolbar.addItem('restart', createRestartButton(dashboard, panel));
  // dashboard.toolbar.addItem('run all', createRunAllButton(dashboard, panel));
}

/**
 * Create save button toolbar item.
 */

export function createSaveButton(
  dashboard: Dashboard,
  panel: NotebookPanel,
  notebookTrakcer: INotebookTracker
): Widget {
  const button = new ToolbarButton({
    icon: saveIcon,
    onClick: (): void => {
      dashboard.save(notebookTrakcer);
      dashboard.dirty = false;
      const dialog = saveDialog(dashboard);
      dialog.launch().then((result) => {
        dialog.dispose();
      });
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
      dashboard.undo();
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
      dashboard.redo();
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
  panel: NotebookPanel, 
  outputTracker: WidgetTracker<DashboardWidget>,
  clipboard: Set<DashboardWidget>
): Widget {
  const button = new ToolbarButton({
    icon: cutIcon,
    onClick: (): void => {
      clipboard.clear();
      const widget = outputTracker.currentWidget;
      clipboard.add(widget);
      dashboard.deleteWidget(widget);
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
  panel: NotebookPanel,
  outputTracker: WidgetTracker<DashboardWidget>,
  clipboard: Set<DashboardWidget>
): Widget {
  const button = new ToolbarButton({
    icon: copyIcon,
    onClick: (): void => {
      clipboard.clear();
      const widget = outputTracker.currentWidget;
      clipboard.add(widget);
    },
    tooltip: 'Copy the selected outputs',
  });
  return button;
}

function pasteWidget(dashboard:Dashboard, widget: DashboardWidget){

  const info: Widgetstore.WidgetInfo = {
    widgetId: DashboardWidget.createDashboardWidgetId(),
    notebookId: addNotebookId(widget.notebook),
    cellId: addCellId(widget.cell),
    left: 0,
    top: 0,
    width: Widgetstore.DEFAULT_WIDTH,
    height: Widgetstore.DEFAULT_HEIGHT,
    removed: false,
  };
  
  // console.log(cell, notebook.sessionContext?.kernelDisplayStatus);
  dashboard.area.addWidget(widget, info);
  dashboard.area.updateWidgetInfo(info); 
}

/**
 * Create paste button toolbar item.
 */

export function createPasteButton(
  dashboard: Dashboard,
  panel: NotebookPanel,
  clipboard: Set<DashboardWidget>
): Widget {
  const button = new ToolbarButton({
    icon: pasteIcon,
    onClick: (): void => {
      clipboard.forEach(widget => pasteWidget(dashboard, widget));
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
  panel: NotebookPanel,
  tracker: WidgetTracker<DashboardWidget>
): Widget {
  const button = new ToolbarButton({
    icon: runIcon,
    onClick: (): void => {
      const cell = (tracker.currentWidget.cell as CodeCell);
      const sessionContext = tracker.currentWidget.notebook.sessionContext;
      CodeCell.execute(cell, sessionContext);
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
      while (widget) {
        void widget.notebook.sessionContext.session?.kernel?.interrupt();
        widget = widgets.next() as DashboardWidget;
      }
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
      const notebooks = new Set<NotebookPanel>();
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      while (widget) {
        notebooks.add(widget.notebook);
        console.log("notebook here one", widget.notebook);
        widget = widgets.next() as DashboardWidget;
      }
      notebooks.forEach(nb => void sessionContextDialogs.restart(nb.sessionContext));      
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
      const notebooks = new Set<NotebookPanel>();
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      while (widget) {
        notebooks.add(widget.notebook);
        console.log(widget);
        widget = widgets.next() as DashboardWidget;
      }

      console.log("notebooks", notebooks);
      notebooks.forEach(nb => void sessionContextDialogs.restart(nb.sessionContext)
      .then(restarted => {
        if (restarted) {
          void NotebookActions.runAll(nb.content, nb.sessionContext);
        }
      }));
    },
    tooltip: 'Restart all kernels, then re-run all notebooks',
  });
  return button;
}