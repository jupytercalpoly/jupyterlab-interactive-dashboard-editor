import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import {
  INotebookTracker,
  NotebookPanel,
} from '@jupyterlab/notebook';

import {
  ReadonlyPartialJSONObject,
  UUID
} from '@lumino/coreutils';

import {
  Panel, Widget
} from '@lumino/widgets';

import { CodeCell } from '@jupyterlab/cells';

import { notebookIcon } from '@jupyterlab/ui-components';

import { ArrayExt } from '@lumino/algorithm';

import {
  MainAreaWidget,
  WidgetTracker,
  showDialog,
  Dialog,
  showErrorMessage,
} from '@jupyterlab/apputils';

// For unimplemented server component
// import { requestAPI } from './jupyterlabvoilaext';

const RENAME_DIALOG_CLASS = 'pr-RenameDialog';

const RENAME_TITLE_CLASS = 'pr-RenameTitle';

const DASHBOARD_CLASS = 'pr-JupyterDashboard';

const DASHBOARD_WIDGET_CLASS = 'pr-DashboardWidget';

/**
 * Command IDs used
 */
namespace CommandIDs {

  export const printTracker = 'notebook:print-tracker';

  export const addToDashboard = 'notebook:add-to-dashboard';

  export const renameDashboard = 'dashboard:rename-dashboard'

}

/**
 * Namespace for Dashboard options
 */
namespace Dashboard {
  export interface IOptions extends MainAreaWidget.IOptionsOptionalContent {
    /**
     * Dashboard name;
     */
    name?: string;

  }
}

/**
 * Namespace for DashboardWidget options
 */
namespace DashboardWidget {
  export interface IOptions {
    /**
     * The notebook associated with the cloned output area.
     */
    notebook: NotebookPanel;

    /**
     * The cell for which to clone the output area.
     */
    cell?: CodeCell;

    /**
     * If the cell is not available, provide the index
     * of the cell for when the notebook is loaded.
     */
    index?: number;
  }
}

/**
 * Main Dashboard display widget. Currently extends MainAreaWidget (May change)
 */
class Dashboard extends MainAreaWidget<Widget> {
  // Generics??? Would love to further constrain this to DashboardWidgets but idk how
  constructor(options: Dashboard.IOptions) {
    super({...options, content: options.content !== undefined ? options.content : new Panel()});
    this._name = options.name || 'Unnamed Dashboard';
    this.id = `JupyterDashboard-${UUID.uuid4()}`;
    this.title.label = this._name;
    this.title.icon = notebookIcon;
    // Add caption?

    this.addClass(DASHBOARD_CLASS);
  }

  addWidget(widget: DashboardWidget): void {
    // Have to call .update() after to see changes. Include update in function?
    (this.content as Panel).addWidget(widget);
  }

  rename(newName: string): void {
    // Have to call .update() after to see changes. Include update in function?
    this._name = newName;
    this.title.label = newName;
  }

  private _name: string;
}

/**
 * Widget to wrap delete/move/etc functionality of widgets in a dashboard (future). 
 * Currently just a slight modification of ClonedOutpuArea. 
 * jupyterlab/packages/notebook-extension/src/index.ts
 */
class DashboardWidget extends Panel {

  constructor(options: DashboardWidget.IOptions) {
    super();
    this._notebook = options.notebook;
    this._index = options.index !== undefined ? options.index : -1;
    this._cell = options.cell || null;
    this.id = `DashboardWidget-${UUID.uuid4()}`;
    this.addClass(DASHBOARD_WIDGET_CLASS);

    // Wait for the notebook to be loaded before cloning the output area.
    void this._notebook.context.ready.then(() => {
      if (!this._cell) {
        this._cell = this._notebook.content.widgets[this._index] as CodeCell;
      }
      if (!this._cell || this._cell.model.type !== 'code') {
        this.dispose();
        return;
      }
      const clone = this._cell.cloneOutputArea();
      this.addWidget(clone);
    });
  }

  /**
   * The index of the cell in the notebook.
   */
  get index(): number {
    return this._cell
      ? ArrayExt.findFirstIndex(
          this._notebook.content.widgets,
          c => c === this._cell
        )
      : this._index;
  }

  /**
   * The path of the notebook for the cloned output area.
   */
  get path(): string {
    return this._notebook.context.path;
  }

  private _notebook: NotebookPanel;
  private _index: number;
  private _cell: CodeCell | null = null;
}

/**
 * A widget used to rename dashboards.
 * jupyterlab/packages/docmanager/src/dialog.ts
 */
class RenameHandler extends Widget {
  /**
   * Construct a new "rename" dialog.
   */
  constructor() {
    // TODO: Display notebooks that are part of dashboard in dialog.
    super({ node: createRenameNode() });
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
 * Create the node for a rename handler.
 * jupyterlab/packages/docmanager/src/dialog.ts
 */
function createRenameNode(): HTMLElement {
  const body = document.createElement('div');

  const nameTitle = document.createElement('label');
  nameTitle.textContent = 'New Name';
  nameTitle.className = RENAME_TITLE_CLASS;
  const name = document.createElement('input');

  body.appendChild(nameTitle);
  body.appendChild(name);
  return body;
}

/**
 * Initialization data for the jupyterlab_interactive_dashboard_editor extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-interactive-dashboard-editor',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
  ): void => {
    console.log('JupyterLab extension presto is activated!');

    // Tracker for Dashboard
    const dashboardTracker = new WidgetTracker<Dashboard>({
      namespace: 'dashboard-outputs'
    });

    addCommands(
      app,
      tracker,
      dashboardTracker
    );

    // Adds commands to code cell context menu.
    // Puts command entries in a weird place in the right-click menu--
    // between 'Clear Output' and 'Clear All Outputs'
    // 'Clear Output' is end of selector='.jp-Notebook .jp-CodeCell'
    // and 'Clear All Outputs' is start of selector='.jp-Notebook'
    app.contextMenu.addItem({
      command: CommandIDs.printTracker,
      selector: '.jp-Notebook .jp-CodeCell',
      rank: 13
    });

    app.contextMenu.addItem({
      command: CommandIDs.addToDashboard,
      selector: '.jp-Notebook .jp-CodeCell',
      rank: 14
    });

    app.contextMenu.addItem({
      command: CommandIDs.renameDashboard,
      selector: '.pr-JupyterDashboard',
      rank: 0
    });

    // Server component currently unimplemented. Unneeded?
    //
    // requestAPI<any>('get_example')
    //   .then(data => {
    //     console.log(data);
    //   })
    //   .catch(reason => {
    //     console.error(
    //       `The jupyterlab_voila_ext server extension appears to be missing.\n${reason}`
    //     );
    //   });
  }
};


function addCommands(
  app: JupyterFrontEnd,
  tracker: INotebookTracker,
  dashboardTracker: WidgetTracker<Dashboard>
): void {
  const { commands, shell } = app;

  /**
   * Get the current widget and activate unless the args specify otherwise.
   * jupyterlab/packages/notebook-extension/src/index.ts
   */
  function getCurrent(args: ReadonlyPartialJSONObject): NotebookPanel | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;

    if (activate && widget) {
      shell.activateById(widget.id);
    }

    return widget;
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
   * Creates a dialog for renaming a dashboard.
   */
  commands.addCommand(CommandIDs.renameDashboard, {
    label: 'Rename Dashboard',
    execute: args => {
      if (dashboardTracker.currentWidget) {
        showDialog({
          title: 'Rename Dashboard',
          body: new RenameHandler(),
          focusNodeSelector: 'input',
          buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Rename' })]
        }).then(result => {
          if (!result.value) {
            return;
          }
          // TODO: Add valid name checking. This currently does nothing.
          const validName = true;
          if (!validName) {
            void showErrorMessage(
              'Rename Error',
              Error(
                `"${result.value}" is not a valid name for a dashboard.`
              )
            );
            return;
          }
          // Need to cast value to string for some reason. Makes me feel sus. 
          dashboardTracker.currentWidget.rename(result.value as string);
          dashboardTracker.currentWidget.update();
        });
      }
    }
  });

  /**
   * Logs the document tracker to console for debugging.
   */
  commands.addCommand(CommandIDs.printTracker, {
    label: 'Print Tracker',
    execute: args => {
      console.log('Widget: ', tracker.currentWidget);
      console.log(tracker);
    },
    isEnabled: isEnabledAndSingleSelected
  });

  /**
   * Adds the currently selected cell's output to the dashboard. 
   * Currently only supports a single dashboard view at a time.
   */
  commands.addCommand(CommandIDs.addToDashboard, {
    label: 'Add to Dashboard',
    execute: async args => {
      const current: NotebookPanel | undefined | null = getCurrent({ ...args, activate: false });
      if (!current) {
        return;
      }
      const cell = current.content.activeCell as CodeCell;
      const index = current.content.activeCellIndex;

      // Create a DashboardWidget around the selected cell.
      const content = new DashboardWidget({
        notebook: current,
        cell,
        index
      });

      // If there's already a dashboard, append the cloned area.
      if (dashboardTracker.currentWidget) {
        dashboardTracker.currentWidget.addWidget(content);
        dashboardTracker.currentWidget.update();
      } else {
        // If there's not a dashboard, create one and add the current output.
        const dashboard = new Dashboard({ content });
        current.context.addSibling(dashboard, {
          ref: current.id,
          mode: 'split-bottom'
        });

        const updateCloned = () => {
          void dashboardTracker.save(dashboard);
        };
  
        current.context.pathChanged.connect(updateCloned);
        current.context.model?.cells.changed.connect(updateCloned);
  
        // Add the cloned output to the output widget tracker.
        void dashboardTracker.add(dashboard);
  
        // Remove the output view if the parent notebook is closed.
        current.content.disposed.connect(() => {
          current!.context.pathChanged.disconnect(updateCloned);
          current!.context.model?.cells.changed.disconnect(updateCloned);
          dashboard.dispose();
        });
      }

    },
    isEnabled: isEnabledAndSingleSelected
  });
}
export default extension;
