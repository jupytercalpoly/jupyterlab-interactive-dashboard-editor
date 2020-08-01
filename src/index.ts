import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import {
  WidgetTracker,
  showErrorMessage,
  InputDialog,
} from '@jupyterlab/apputils';

import { Dashboard } from './dashboard';

import { DashboardWidget } from './widget';

import { DashboardButton } from './button';

/**
 * Command IDs used
 */
namespace CommandIDs {
  export const printTracker = 'notebook:print-tracker';

  export const addToDashboard = 'notebook:add-to-dashboard';

  export const renameDashboard = 'dashboard:rename-dashboard';

  export const deleteOutput = 'dashboard:delete-dashboard-widget';

  export const insert = 'dashboard:insert';

  export const undo = 'dashboard:undo';

  export const redo = 'dashboard:redo';

  export const save = 'dashboard:save';

  export const load = 'dashboard:load';

  export const toggleARLock = 'dashboard-widget:toggleARLock';

  export const toggleFitContent = 'dashboard-widget:toggleFitContent';

  export const toggleMode = 'dashboard:toggleMode';
}

const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-interactive-dashboard-editor',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (app: JupyterFrontEnd, tracker: INotebookTracker): void => {
    console.log('JupyterLab extension presto is activated!');

    // Datastore for Dashboard info
    // TODO

    // Tracker for Dashboard
    const dashboardTracker = new WidgetTracker<Dashboard>({
      namespace: 'dashboards',
    });

    //Tracker for DashboardWidgets
    const outputTracker = new WidgetTracker<DashboardWidget>({
      namespace: 'dashboard-outputs',
    });

    addCommands(app, tracker, dashboardTracker, outputTracker);

    app.contextMenu.addItem({
      command: CommandIDs.save,
      selector: '.pr-JupyterDashboard',
      rank: 3,
    });

    app.contextMenu.addItem({
      command: CommandIDs.load,
      selector: '.jp-Notebook',
      rank: 15,
    });

    app.contextMenu.addItem({
      command: CommandIDs.renameDashboard,
      selector: '.pr-JupyterDashboard',
      rank: 0,
    });

    app.contextMenu.addItem({
      command: CommandIDs.undo,
      selector: '.pr-JupyterDashboard',
      rank: 1,
    });

    app.contextMenu.addItem({
      command: CommandIDs.redo,
      selector: '.pr-JupyterDashboard',
      rank: 2,
    });

    app.contextMenu.addItem({
      command: CommandIDs.toggleMode,
      selector: '.pr-JupyterDashboard',
      rank: 3,
    });

    app.contextMenu.addItem({
      command: CommandIDs.deleteOutput,
      selector: '.pr-EditableWidget',
      rank: 0,
    });

    app.contextMenu.addItem({
      command: CommandIDs.toggleARLock,
      selector: '.pr-EditableWidget',
      rank: 1,
    });

    app.contextMenu.addItem({
      command: CommandIDs.toggleFitContent,
      selector: '.pr-EditableWidget',
      rank: 2,
    });

    // Add commands to key bindings
    app.commands.addKeyBinding({
      command: CommandIDs.deleteOutput,
      args: {},
      keys: ['Backspace'],
      selector: '.pr-DashboardWidget',
    });

    app.commands.addKeyBinding({
      command: CommandIDs.undo,
      args: {},
      keys: ['Z'],
      selector: '.pr-JupyterDashboard',
    });

    app.commands.addKeyBinding({
      command: CommandIDs.redo,
      args: {},
      keys: ['Shift Z'],
      selector: '.pr-JupyterDashboard',
    });

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new DashboardButton(app, outputTracker, dashboardTracker, tracker)
    );
  },
};

function addCommands(
  app: JupyterFrontEnd,
  tracker: INotebookTracker,
  dashboardTracker: WidgetTracker<Dashboard>,
  outputTracker: WidgetTracker<DashboardWidget>
): void {
  const { commands, shell } = app;

  /**
   * Whether there is an active notebook.
   * jupyterlab/packages/notebook-extension/src/index.ts
   */
  function isEnabled(): boolean {
    return (
      tracker.currentWidget !== null &&
      tracker.currentWidget === shell.currentWidget
    );
  }

  /**
   * Whether there is an notebook active, with a single selected cell.
   * jupyterlab/packages/notebook-extension/src/index.ts
   */
  function isEnabledAndSingleSelected(): boolean {
    if (!isEnabled()) {
      return false;
    }
    const { content } = tracker.currentWidget!;
    const index = content.activeCellIndex;
    // If there are selections that are not the active cell,
    // this command is confusing, so disable it.
    for (let i = 0; i < content.widgets.length; ++i) {
      if (content.isSelected(content.widgets[i]) && i !== index) {
        return false;
      }
    }
    return true;
  }

  /**
   * Deletes a selected DashboardWidget.
   */
  commands.addCommand(CommandIDs.deleteOutput, {
    label: 'Delete Output',
    execute: (args) => {
      const widget = outputTracker.currentWidget;
      dashboardTracker.currentWidget.deleteWidgetInfo(widget);
      dashboardTracker.currentWidget.deleteWidget(widget);
    },
  });

  /**
   * Undo the last change to a dashboard.
   */
  commands.addCommand(CommandIDs.undo, {
    label: 'Undo',
    execute: (args) => {
      dashboardTracker.currentWidget.undo();
      console.log('undo');
    },
    isEnabled: () =>
      dashboardTracker.currentWidget &&
      dashboardTracker.currentWidget.store.hasUndo(),
  });

  /**
   * Redo the last undo to a dashboard.
   */
  commands.addCommand(CommandIDs.redo, {
    label: 'Redo',
    execute: (args) => {
      dashboardTracker.currentWidget.redo();
      console.log('redo');
    },
    isEnabled: () =>
      dashboardTracker.currentWidget &&
      dashboardTracker.currentWidget.store.hasRedo(),
  });

  /**
   * Creates a dialog for renaming a dashboard.
   */
  commands.addCommand(CommandIDs.renameDashboard, {
    label: 'Rename Dashboard',
    execute: (args) => {
      // Should this be async? Still kind of unclear on when that needs to be used.
      if (dashboardTracker.currentWidget) {
        InputDialog.getText({ title: 'Rename' }).then((result) => {
          if (!result.value) {
            return;
          }
          // TODO: Add valid name checking. This currently does nothing.
          const validName = true;
          if (!validName) {
            void showErrorMessage(
              'Rename Error',
              Error(`"${result.value}" is not a valid name for a dashboard.`)
            );
            return;
          }
          dashboardTracker.currentWidget.setName(result.value as string);
          dashboardTracker.currentWidget.update();
        });
      }
    },
  });

  /**
   * Logs the outputTracker to console for debugging.
   */
  commands.addCommand(CommandIDs.printTracker, {
    label: 'Print Tracker',
    execute: (args) => {
      console.log(outputTracker);
    },
    isEnabled: isEnabledAndSingleSelected,
    isVisible: () => false,
  });

  commands.addCommand(CommandIDs.save, {
    label: 'Save Dashboard',
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      const filename = `${dashboard.getName()}.dashboard`;
      InputDialog.getText({ title: 'Save as', text: filename }).then(
        (value) => {
          dashboard.save(tracker, value.value);
        }
      );
    },
  });

  commands.addCommand(CommandIDs.load, {
    label: 'Load Dashboard',
    execute: async (args) => {
      const path = await InputDialog.getText({ title: 'Load Path' }).then(
        (value) => {
          return value.value;
        }
      );
      if (path === undefined) {
        console.log('invalid path');
        return;
      }
      const dashboard = await Dashboard.load(path, tracker, outputTracker);
      const currentNotebook = tracker.currentWidget;
      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-left',
      });
      dashboardTracker.add(dashboard);
    },
  });

  commands.addCommand(CommandIDs.toggleARLock, {
    label: 'Lock Aspect Ratio',
    execute: (args) => {
      const widget = outputTracker.currentWidget;
      widget.lockAR = !widget.lockAR;
    },
    isToggled: (args) => outputTracker.currentWidget.lockAR,
  });

  commands.addCommand(CommandIDs.toggleFitContent, {
    label: 'Fit To Content',
    execute: (args) => {
      const widget = outputTracker.currentWidget;
      widget.fitToContent = !widget.fitToContent;
      if (widget.fitToContent) {
        widget.fitContent();
      }
    },
    isToggled: (args) => outputTracker.currentWidget.fitToContent,
  });

  commands.addCommand(CommandIDs.toggleMode, {
    label: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      if (dashboard.mode === 'edit') {
        return 'Switch To Presentation Mode';
      } else {
        return 'Switch To Edit Mode';
      }
    },
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      if (dashboard.mode === 'edit') {
        dashboard.mode = 'present';
      } else {
        dashboard.mode = 'edit';
      }
    },
  });
}

export default extension;
