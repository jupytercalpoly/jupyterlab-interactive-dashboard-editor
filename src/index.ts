import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import {
  WidgetTracker,
  showErrorMessage,
  InputDialog,
  showDialog,
  Dialog,
} from '@jupyterlab/apputils';

import { Dashboard } from './dashboard';

import { DashboardWidget } from './widget';

import { DashboardButton } from './button';

import { DBUtils } from './dbUtils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Widget } from '@lumino/widgets';

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

  export const saveAs = 'dashboard:save-as';

  export const load = 'dashboard:load';

  export const toggleARLock = 'dashboard-widget:toggleARLock';

  export const toggleFitContent = 'dashboard-widget:toggleFitContent';

  export const toggleMode = 'dashboard:toggleMode';

  export const setDimensions = 'dashboard:setDimensions';
}

const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-interactive-dashboard-editor',
  autoStart: true,
  requires: [INotebookTracker, ILabShell, IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
    labShell: ILabShell,
    mainMenu: IMainMenu
  ): void => {
    console.log('JupyterLab extension presto is activated!');

    // Tracker for Dashboard
    const dashboardTracker = new WidgetTracker<Dashboard>({
      namespace: 'dashboards',
    });

    //Tracker for DashboardWidgets
    const outputTracker = new WidgetTracker<DashboardWidget>({
      namespace: 'dashboard-outputs',
    });

    const utils = new DBUtils();

    addCommands(app, tracker, dashboardTracker, outputTracker, utils);

    // Add commands to context menus.
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
      command: CommandIDs.toggleFitContent,
      selector: '.pr-EditableWidget',
      rank: 1,
    });

    app.contextMenu.addItem({
      type: 'separator',
      selector: '.pr-EditableWidget',
      rank: 2,
    });

    // Add commands to key bindings
    app.commands.addKeyBinding({
      command: CommandIDs.deleteOutput,
      args: {},
      keys: ['Backspace'],
      selector: '.pr-EditableWidget',
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

    app.commands.addKeyBinding({
      command: CommandIDs.toggleMode,
      args: {},
      keys: ['I'],
      selector: '.pr-JupyterDashboard',
    });

    app.commands.addKeyBinding({
      command: CommandIDs.toggleFitContent,
      args: {},
      keys: ['K'],
      selector: '.pr-EditableWidget',
    });

    // Add commands to file menu.
    mainMenu.fileMenu.addGroup([
      {
        command: CommandIDs.load,
      },
      {
        command: CommandIDs.renameDashboard,
      },
      {
        command: CommandIDs.save,
      },
      {
        command: CommandIDs.saveAs,
      },
    ]);

    // Add commands to edit menu.
    mainMenu.editMenu.addGroup([
      {
        command: CommandIDs.setDimensions,
      },
    ]);

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new DashboardButton(
        app,
        outputTracker,
        dashboardTracker,
        tracker,
        utils,
        labShell
      )
    );
  },
};

function addCommands(
  app: JupyterFrontEnd,
  tracker: INotebookTracker,
  dashboardTracker: WidgetTracker<Dashboard>,
  outputTracker: WidgetTracker<DashboardWidget>,
  utils: DBUtils
): void {
  const { commands } = app;

  /**
   * Whether there is an active dashboard.
   */
  function hasDashboard(): boolean {
    return dashboardTracker.currentWidget !== null;
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
    isEnabled: hasDashboard,
  });

  commands.addCommand(CommandIDs.saveAs, {
    label: 'Save Dashboard As',
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      const filename = `${dashboard.getName()}.dashboard`;
      InputDialog.getText({ title: 'Save as', text: filename }).then(
        (value) => {
          dashboard.save(tracker, value.value);
        }
      );
    },
    isEnabled: hasDashboard,
  });

  commands.addCommand(CommandIDs.save, {
    label: 'Save Dashboard',
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      const filename = `${dashboard.getName()}.dashboard`;
      dashboard.save(tracker, filename);
    },
    isEnabled: hasDashboard,
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
      const dashboard = await Dashboard.load(
        path,
        tracker,
        outputTracker,
        utils
      );
      const currentNotebook = tracker.currentWidget;
      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-right',
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

  commands.addCommand(CommandIDs.setDimensions, {
    label: 'Set Dashboard Dimensions',
    execute: async (args) => {
      const dashboard = dashboardTracker.currentWidget;
      await showDialog({
        title: 'Enter Dimensions',
        body: new Private.ResizeHandler(dashboard.width, dashboard.height),
        focusNodeSelector: 'input',
        buttons: [Dialog.cancelButton(), Dialog.okButton()],
      }).then((result) => {
        dashboard.width = result.value[0];
        dashboard.height = result.value[1];
      });
    },
    isEnabled: hasDashboard,
  });
}

namespace Private {
  export class ResizeHandler extends Widget {
    constructor(oldWidth: number, oldHeight: number) {
      const node = document.createElement('div');
      const name = document.createElement('label');
      name.textContent = 'Enter New Width/Height';

      const width = document.createElement('input');
      const height = document.createElement('input');
      width.type = 'number';
      height.type = 'number';
      width.min = '0';
      width.max = '10000';
      height.min = '0';
      height.max = '10000';
      width.required = true;
      height.required = true;
      width.placeholder = `Width (${oldWidth})`;
      height.placeholder = `Height (${oldHeight})`;

      node.appendChild(name);
      node.appendChild(width);
      node.appendChild(height);

      super({ node });
    }

    getValue(): number[] {
      const inputs = this.node.getElementsByTagName('input');
      const widthInput = inputs[0];
      const heightInput = inputs[1];
      return [+widthInput.value, +heightInput.value];
    }
  }
}

export default extension;
