import {
  NotebookPanel,
  NotebookActions,
  INotebookTracker,
} from '@jupyterlab/notebook';

import { Widget } from '@lumino/widgets';

import {
  ToolbarButton,
  WidgetTracker,
  sessionContextDialogs,
  InputDialog,
} from '@jupyterlab/apputils';

import { CodeCell } from '@jupyterlab/cells';

import {
  saveIcon,
  refreshIcon,
  undoIcon,
  cutIcon,
  copyIcon,
  pasteIcon,
  runIcon,
  stopIcon,
  fastForwardIcon,
  LabIcon,
} from '@jupyterlab/ui-components';

import { DashboardDocument } from './dashboard';

import { DashboardWidget } from './widget';

import { saveDialog } from './dialog';

import { DashboardIcons } from './icons';

import { openfullscreen } from './fullscreen';

import { DBUtils } from './dbUtils';


export function buildToolbar(
  notebookTracker: INotebookTracker,
  dashboard: DashboardDocument,
  tracker: WidgetTracker<DashboardWidget>,
  utils: DBUtils
): void {
  dashboard.toolbar.addItem(
    'save',
    createSaveButton(dashboard, notebookTracker)
  );
  dashboard.toolbar.addItem('undo', createUndoButton(dashboard));
  dashboard.toolbar.addItem('redo', createRedoButton(dashboard));
  dashboard.toolbar.addItem('cut', createCutButton(dashboard, tracker, utils));
  dashboard.toolbar.addItem(
    'copy',
    createCopyButton(dashboard, tracker, utils)
  );
  dashboard.toolbar.addItem('paste', createPasteButton(dashboard, utils));
  dashboard.toolbar.addItem('run', createRunButton(dashboard, tracker));
  dashboard.toolbar.addItem('stop', createStopButton(dashboard, tracker));
  dashboard.toolbar.addItem('full screen', createFullScreenButton(dashboard));
  dashboard.toolbar.addItem('switch mode', createModeSwitchButton(dashboard));
}

/**
 * Create a dashboard mode switching toolbar item.
 */
export function createModeSwitchButton(dashboard: DashboardDocument): Widget {
  const button = new Widget();
  const buttonElementClasses = [
    'bp3-button',
    'bp3-minimal',
    'jp-ToolbarButtonComponent',
    'minimal',
    'jp-Button',
  ];

  const buttonElement = document.createElement('button');
  buttonElement.classList.add(...buttonElementClasses);

  button.node.appendChild(buttonElement);
  button.node.classList.add('jp-Toolbar-item', 'jp-ToolbarButton');

  if (dashboard.content.model.mode === 'edit') {
    DashboardIcons.view.element({ container: buttonElement });
    buttonElement.title = 'Switch To Presentation Mode';
  } else {
    DashboardIcons.edit.element({ container: buttonElement });
    buttonElement.title = 'Switch To Edit Mode';
  }

  const onClick = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    LabIcon.remove(buttonElement);
    buttonElement.classList.add(...buttonElementClasses);
    if (dashboard.content.model.mode === 'edit') {
      dashboard.content.model.mode = 'present';
      DashboardIcons.edit.element({ container: buttonElement });
      buttonElement.title = 'Switch To Edit Mode';
    } else {
      dashboard.content.model.mode = 'edit';
      DashboardIcons.view.element({ container: buttonElement });
      buttonElement.title = 'Switch To Presentation Mode';
    }
  };

  button.node.addEventListener('mousedown', onClick);

  button.disposed.connect(() =>
    button.node.removeEventListener('mousedown', onClick)
  );

  return button;
}

/**
 * Create full screen toolbar item.
 */
export function createFullScreenButton(dashboard: DashboardDocument): ToolbarButton {
  const button = new ToolbarButton({
    icon: DashboardIcons.fullscreen,
    onClick: (): void => {
      openfullscreen(dashboard.content.node);
    },
    tooltip: 'View in full screen',
  });
  return button;
}

/**
 * Create save button toolbar item.
 */

export function createSaveButton(
  dashboard: DashboardDocument,
  notebookTracker: INotebookTracker
): Widget {
  const button = new ToolbarButton({
    icon: saveIcon,
    onClick: (): void => {
      let name = dashboard.content.model.name;
      if (name === null) {
        name = 'null';
      } else {
        name = name.split('.')[0];
      }
      const filename = `${name}.dashboard`;
      InputDialog.getText({ title: 'Save as', text: filename }).then(
        (value) => {
          if (value.button.accept) {
            dashboard.content.model.dirty = false;
            const dialog = saveDialog(value.value);
            dialog.launch().then((result) => {
              dialog.dispose();
            });
          }
          dashboard.context.save();
        }
      );
    },
    tooltip: 'Save Dashboard',
  });
  return button;
}

/**
 * Create undo button toolbar item.
 */

export function createUndoButton(dashboard: DashboardDocument): Widget {
  const button = new ToolbarButton({
    icon: undoIcon,
    onClick: (): void => {
      dashboard.content.undo();
    },
    tooltip: 'Undo',
  });
  return button;
}

/**
 * Create redo button toolbar item.
 */

export function createRedoButton(dashboard: DashboardDocument): Widget {
  const button = new ToolbarButton({
    icon: DashboardIcons.redo,
    onClick: (): void => {
      dashboard.content.redo();
    },
    tooltip: 'Redo',
  });
  return button;
}

/**
 * Create cut button toolbar item.
 */

export function createCutButton(
  dashboard: DashboardDocument,
  outputTracker: WidgetTracker<DashboardWidget>,
  utils: DBUtils
): Widget {
  const button = new ToolbarButton({
    icon: cutIcon,
    onClick: (): void => {
      utils.clipboard.clear();
      const widget = outputTracker.currentWidget;
      utils.clipboard.add(widget.info);
      dashboard.content.deleteWidget(widget);
    },
    tooltip: 'Cut the selected outputs',
  });
  return button;
}

/**
 * Create copy button toolbar item.
 */

export function createCopyButton(
  dashboard: DashboardDocument,
  outputTracker: WidgetTracker<DashboardWidget>,
  utils: DBUtils
): Widget {
  const button = new ToolbarButton({
    icon: copyIcon,
    onClick: (): void => {
      utils.clipboard.clear();
      const widget = outputTracker.currentWidget;
      utils.clipboard.add(widget.info);
    },
    tooltip: 'Copy the selected outputs',
  });
  return button;
}

/**
 * Create paste button toolbar item.
 */

export function createPasteButton(
  dashboard: DashboardDocument,
  utils: DBUtils
): Widget {
  const button = new ToolbarButton({
    icon: pasteIcon,
    onClick: (): void => {
      console.log('boop');
    },
    tooltip: 'Paste outputs from the clipboard',
  });
  return button;
}

/**
 * Create run button toolbar item.
 */

export function createRunButton(
  dashboard: DashboardDocument,
  tracker: WidgetTracker<DashboardWidget>
): Widget {
  const button = new ToolbarButton({
    icon: runIcon,
    onClick: (): void => {
      const cell = tracker.currentWidget.cell as CodeCell;
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
  dashboard: DashboardDocument,
  tracker: WidgetTracker<DashboardWidget>
): Widget {
  const button = new ToolbarButton({
    icon: stopIcon,
    onClick: (): void => {
      const sessionContext = tracker.currentWidget.notebook.sessionContext;
      void sessionContext.session?.kernel?.interrupt();
    },
    tooltip: 'Interrupt all kernels',
  });
  return button;
}

/**
 * Create restart button toolbar item.
 */

export function createRestartButton(dashboard: DashboardDocument): ToolbarButton {
  const button = new ToolbarButton({
    icon: refreshIcon,
    onClick: (): void => {
      const notebooks = new Set<NotebookPanel>();
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      while (widget) {
        notebooks.add(widget.notebook);
        widget = widgets.next() as DashboardWidget;
      }
      notebooks.forEach(
        (nb) => void sessionContextDialogs.restart(nb.sessionContext)
      );
    },
    tooltip: 'Restart all kernels',
  });
  return button;
}

/**
 * Create run all button toolbar item.
 */

export function createRunAllButton(dashboard: DashboardDocument): Widget {
  const button = new ToolbarButton({
    icon: fastForwardIcon,
    onClick: (): void => {
      const notebooks = new Set<NotebookPanel>();
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      while (widget) {
        notebooks.add(widget.notebook);
        widget = widgets.next() as DashboardWidget;
      }

      notebooks.forEach(
        (nb) =>
          void sessionContextDialogs
            .restart(nb.sessionContext)
            .then((restarted) => {
              if (restarted) {
                void NotebookActions.runAll(nb.content, nb.sessionContext);
              }
            })
      );
    },
    tooltip: 'Restart all kernels, then re-run all notebooks',
  });
  return button;
}
