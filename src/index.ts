import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import {
  WidgetTracker,
  Dialog,
  showDialog,
  showErrorMessage,
} from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';

import { Dashboard, DashboardArea } from './dashboard';

import { DashboardWidget } from './widget';

import { DashboardButton } from './button';

import { MessageLoop } from '@lumino/messaging';

// HTML element classes

const RENAME_DIALOG_CLASS = 'pr-RenameDialog';

const RENAME_TITLE_CLASS = 'pr-RenameTitle';

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

    // Adds commands to code cell context menu.
    // Puts command entries in a weird place in the right-click menu--
    // between 'Clear Output' and 'Clear All Outputs'
    // 'Clear Output' is end of selector='.jp-Notebook .jp-CodeCell'
    // and 'Clear All Outputs' is start of selector='.jp-Notebook'
    app.contextMenu.addItem({
      command: CommandIDs.printTracker,
      selector: '.jp-Notebook .jp-CodeCell',
      rank: 13,
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
      command: CommandIDs.deleteOutput,
      selector: '.pr-DashboardWidget',
      rank: 0,
    });

    app.contextMenu.addItem({
      command: 'printFile',
      selector: '.pr-JupyterDashboard',
      rank: 5,
    });

    app.contextMenu.addItem({
      command: 'resize',
      selector: '.pr-JupyterDashboard',
      rank: 6,
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
   * Get the current widget and activate unless the args specify otherwise.
   * jupyterlab/packages/notebook-extension/src/index.ts
   */
  // function getCurrentNotebook(
  //   args: ReadonlyPartialJSONObject
  // ): NotebookPanel | null {
  //   const widget = tracker.currentWidget;
  //   const activate = args['activate'] !== false;

  //   if (activate && widget) {
  //     shell.activateById(widget.id);
  //   }

  //   return widget;
  // }

  /**
   * Get the current notebook output wrapped in a DashboardWidget.
   */
  // function getCurrentWidget(currentNotebook: NotebookPanel): DashboardWidget {
  //   if (!currentNotebook) {
  //     return;
  //   }
  //   const cell = currentNotebook.content.activeCell as CodeCell;
  //   const index = currentNotebook.content.activeCellIndex;

  //   return new DashboardWidget({
  //     notebook: currentNotebook,
  //     cell,
  //     index,
  //   });
  // }

  /**
   * Get the current Dashboard.
   */
  // function getCurrentDashboard(): Dashboard {
  //   return dashboardTracker.currentWidget;
  // }

  // function createDashboard(): void {
  //   const panel = getCurrentNotebook({ activate: false });
  //   const dashboard = new Dashboard({ outputTracker, panel, notebookTracker: tracker});
  //   panel.context.addSibling(dashboard, {
  //     ref: panel.id,
  //     mode: 'split-bottom',
  //   });
  //   dashboardTracker.add(dashboard);
  // }

  /**
   * Inserts a widget into a dashboard.
   */
  // async function addWidget(
  //   dashboard: Dashboard,
  //   notebook: NotebookPanel,
  //   cell: Cell
  // ): Promise<void> {

  //   const info: Widgetstore.WidgetInfo = {
  //     widgetId: DashboardWidget.createDashboardWidgetId(),
  //     notebookId: addNotebookId(notebook),
  //     cellId: addCellId(cell),
  //     top: 0,
  //     left: 0,
  //     width: Widgetstore.DEFAULT_WIDTH,
  //     height: Widgetstore.DEFAULT_HEIGHT,
  //     changed: true,
  //     removed: false
  //   }

  //   dashboard.addWidget(info);
  // }

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
        showDialog({
          title: 'Rename Dashboard',
          body: new Private.RenameHandler(),
          focusNodeSelector: 'input',
          buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({ label: 'Rename' }),
          ],
        }).then((result) => {
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

  commands.addCommand('printFile', {
    label: 'Print File',
    execute: (args) => dashboardTracker.currentWidget.store.save('myPath'),
  });

  commands.addCommand('resize', {
    label: 'Resize',
    execute: (args) => {
      const msg = new Widget.ResizeMessage(1920, 1080);
      const widget = dashboardTracker.currentWidget.content as DashboardArea;
      MessageLoop.sendMessage(widget, msg);
    },
  });

  /**
   * Adds the currently selected cell's output to the dashboard.
   * Currently only supports a single dashboard view at a time.
   */
  //   commands.addCommand(CommandIDs.addToDashboard, {
  //     label: 'Add to Dashboard',
  //     execute: (args) => {
  //       if (!getCurrentDashboard()) {
  //         insertWidget({ createNew: true });
  //       } else {
  //         insertWidget({});
  //       }
  //     },
  //     isEnabled: isEnabledAndSingleSelected,
  //   });
  // }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A widget used to rename dashboards.
   * jupyterlab/packages/docmanager/src/dialog.ts
   */
  export class RenameHandler extends Widget {
    /**
     * Construct a new "rename" dialog.
     */
    constructor() {
      const node = document.createElement('div');

      const nameTitle = document.createElement('label');
      nameTitle.textContent = 'New Name';
      nameTitle.className = RENAME_TITLE_CLASS;
      const name = document.createElement('input');

      node.appendChild(nameTitle);
      node.appendChild(name);

      super({ node });
      this.addClass(RENAME_DIALOG_CLASS);
    }

    /**
     * Get the input text node.
     */
    get inputNode(): HTMLInputElement {
      return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
    }

    /**
     * Get the value of the widget.
     */
    getValue(): string {
      return this.inputNode.value;
    }
  }
}

export default extension;