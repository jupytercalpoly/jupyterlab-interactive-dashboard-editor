import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import {
  INotebookTracker,
  NotebookPanel,
  INotebookModel,
} from '@jupyterlab/notebook';

import { CodeCell } from '@jupyterlab/cells';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import {
  WidgetTracker,
  Dialog,
  showDialog,
  showErrorMessage,
  ToolbarButton,
} from '@jupyterlab/apputils';

import { ReadonlyPartialJSONObject } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import { IDisposable, DisposableDelegate } from '@lumino/disposable';

import { Icons } from './icons';

import { Dashboard } from './dashboard';

import { DashboardWidget } from './widget';

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
      type: 'separator',
      selector: '.jp-Notebook .jp-CodeCell',
      rank: 11.9,
    });

    app.contextMenu.addItem({
      command: CommandIDs.addToDashboard,
      selector: '.jp-Notebook .jp-CodeCell',
      rank: 11.9,
    });

    app.contextMenu.addItem({
      type: 'separator',
      selector: '.jp-Notebook .jp-CodeCell',
      rank: 11.9,
    });

    app.contextMenu.addItem({
      command: CommandIDs.renameDashboard,
      selector: '.pr-JupyterDashboard',
      rank: 0,
    });

    app.contextMenu.addItem({
      command: CommandIDs.deleteOutput,
      selector: '.pr-DashboardWidget',
      rank: 0,
    });

    app.contextMenu.addItem({
      command: CommandIDs.insert,
      selector: '.jp-Notebook .jp-CodeCell',
      rank: 15,
    });

    // Add commands to key bindings
    app.commands.addKeyBinding({
      command: CommandIDs.deleteOutput,
      args: {},
      keys: ['Backspace'],
      selector: '.pr-DashboardWidget',
    });

    app.docRegistry.addWidgetExtension(
      'Notebook',
      new Private.DashboardButton(app, outputTracker, dashboardTracker, tracker)
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
  function getCurrentNotebook(
    args: ReadonlyPartialJSONObject
  ): NotebookPanel | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;

    if (activate && widget) {
      shell.activateById(widget.id);
    }

    return widget;
  }

  /**
   * Get the current notebook output wrapped in a DashboardWidget.
   */
  function getCurrentWidget(currentNotebook: NotebookPanel): DashboardWidget {
    if (!currentNotebook) {
      return;
    }
    const cell = currentNotebook.content.activeCell as CodeCell;
    const index = currentNotebook.content.activeCellIndex;

    return new DashboardWidget({
      notebook: currentNotebook,
      cell,
      index,
    });
  }

  /**
   * Get the current Dashboard.
   */
  function getCurrentDashboard(): Dashboard {
    return dashboardTracker.currentWidget;
  }

  /**
   * Inserts a widget into a dashboard.
   * If dashboard isn't defined, it's the most recently focused or added Dashboard.
   * If widget isn't defined, it's a widget created from the most recently focused code cell.
   * If index isn't defined, it's -1 (inserted at the end of the dashboard).
   */
  async function insertWidget(
    options: DashboardInsert.IOptions
  ): Promise<void> {
    let dashboard =
      options.dashboard !== undefined
        ? options.dashboard
        : getCurrentDashboard();
    if (!dashboard && !options.createNew) {
      return;
    }

    const currentNotebook:
      | NotebookPanel
      | undefined
      | null = getCurrentNotebook({ activate: false });
    const widget =
      options.widget !== undefined
        ? options.widget
        : getCurrentWidget(currentNotebook);
    if (!widget) {
      return;
    }
    const index = options.index !== undefined ? options.index : -1;

    if (options.createNew) {
      // Create a new dashboard and add the widget.
      dashboard = new Dashboard({ outputTracker });
      dashboard.insertWidget(-1, widget);
      currentNotebook.context.addSibling(dashboard, {
        ref: currentNotebook.id,
        mode: 'split-bottom',
      });

      // Add the new dashboard to the tracker.
      void dashboardTracker.add(dashboard);
    } else {
      dashboard.insertWidget(index, widget);
      dashboard.update();
    }

    const updateOutputs = (): void => {
      void outputTracker.save(widget);
    };

    currentNotebook.context.pathChanged.connect(updateOutputs);
    currentNotebook.context.model?.cells.changed.connect(updateOutputs);

    // Close the output when the parent notebook is closed.
    // FIXME: This doesn't work!
    currentNotebook.content.disposed.connect(() => {
      currentNotebook!.context.pathChanged.disconnect(updateOutputs);
      currentNotebook!.context.model?.cells.changed.disconnect(updateOutputs);
      widget.dispose;
    });
  }

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
    execute: (args) => outputTracker.currentWidget.dispose(),
  });

  /**
   * Brings up a dialog box for the user to enter an index to insert the selected widget at.
   */
  commands.addCommand(CommandIDs.insert, {
    label: 'Insert in Dashboard',
    execute: (args) => {
      showDialog({
        title: 'Insert at index',
        body: new Private.InsertHandler(),
        focusNodeSelector: 'input',
        buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Insert' })],
      }).then((result) => {
        const value = +result.value;
        if (isNaN(value)) {
          void showErrorMessage(
            'Not A Number',
            Error(`"${result.value}" cannot be converted to a number.`)
          );
          return;
        }
        if (value < 0) {
          void showErrorMessage(
            'Index Error',
            Error(`"${result.value}" is less than zero.`)
          );
          return;
        }
        insertWidget({ index: +result.value });
      });
    },
    isEnabled: () =>
      isEnabledAndSingleSelected() && !!dashboardTracker.currentWidget,
    isVisible: () => false,
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
          // Need to cast value to string for some reason. Makes me feel sus.
          dashboardTracker.currentWidget.rename(result.value as string);
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

  /**
   * Adds the currently selected cell's output to the dashboard.
   * Currently only supports a single dashboard view at a time.
   */
  commands.addCommand(CommandIDs.addToDashboard, {
    label: 'Add to Dashboard',
    execute: (args) => {
      if (!getCurrentDashboard()) {
        insertWidget({ createNew: true });
      } else {
        insertWidget({});
      }
    },
    isEnabled: isEnabledAndSingleSelected,
  });
}

/**
 * Namespace for inserting dashboard widgets.
 */
namespace DashboardInsert {
  export interface IOptions {
    dashboard?: Dashboard;

    widget?: DashboardWidget;

    index?: number;

    createNew?: boolean;
  }
}

/**
 * Namespace for inserting dashboard widgets.
 */
namespace DashboardInsert {
  export interface IOptions {
    dashboard?: Dashboard;

    widget?: DashboardWidget;

    index?: number;

    createNew?: boolean;
  }
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

  /**
   * A widget used to get an index for inserting widgets into a Dashboard.
   */
  export class InsertHandler extends Widget {
    constructor() {
      const node = document.createElement('div');
      const nameTitle = document.createElement('label');
      nameTitle.textContent = 'Index';
      const index = document.createElement('input');

      node.appendChild(nameTitle);
      node.appendChild(index);

      super({ node });
    }

    get inputNode(): HTMLInputElement {
      return this.node.getElementsByTagName('input')[0] as HTMLInputElement;
    }

    getValue(): string {
      return this.inputNode.value;
    }
  }

  /**
   * Adds a button to the toolbar.
   */
  export class DashboardButton
    implements
      DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {
    constructor(
      app: JupyterFrontEnd,
      outputTracker: WidgetTracker<DashboardWidget>,
      dashboardTracker: WidgetTracker<Dashboard>,
      tracker: INotebookTracker
    ) {
      this._app = app;
      this._outputTracker = outputTracker;
      this._dashboardTracker = dashboardTracker;
      this._tracker = tracker;
    }

    createNew(
      panel: NotebookPanel,
      context: DocumentRegistry.IContext<INotebookModel>
    ): IDisposable {
      const outputTracker = this._outputTracker;
      const dashboard = new Dashboard({ outputTracker });
      const callback = (): void => {
        const currentNotebook = this._tracker.currentWidget;
        if (currentNotebook) {
          this._app.shell.activateById(currentNotebook.id);
        }

        currentNotebook.context.addSibling(dashboard, {
          ref: currentNotebook.id,
          mode: 'split-bottom',
        });

        // Add the new dashboard to the tracker.
        void this._dashboardTracker.add(dashboard);
      };
      const button = new ToolbarButton({
        className: 'dashboardButton',
        icon: Icons.greyDashboard,
        iconClass: 'dashboard',
        onClick: callback,
        tooltip: 'Create Dashboard',
      });

      panel.toolbar.insertItem(9, 'dashboard', button);
      return new DisposableDelegate(() => {
        button.dispose();
      });
    }

    private _app: JupyterFrontEnd;
    private _dashboardTracker: WidgetTracker<Dashboard>;
    private _tracker: INotebookTracker;
    private _outputTracker: WidgetTracker<DashboardWidget>;
  }
}

export default extension;
