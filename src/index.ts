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
  UUID,
} from '@lumino/coreutils';

import {
  Panel,
  Widget,
} from '@lumino/widgets';

import { CodeCell } from '@jupyterlab/cells';

import { LabIcon } from '@jupyterlab/ui-components';

import { ArrayExt } from '@lumino/algorithm';

import { Message } from '@lumino/messaging';

import whiteDashboardSvgstr from '../style/icons/dashboard_icon_filled_white.svg';
import greyDashboardSvgstr from '../style/icons/dashboard_icon_filled_grey.svg';
import blueDashboardSvgstr from '../style/icons/dashboard_icon_filled_blue.svg';
import whiteDashboardOutlineSvgstr from '../style/icons/dashboard_icon_outline_white.svg';
import greyDashboardOutlineSvgstr from '../style/icons/dashboard_icon_outline_grey.svg';

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

  export const renameDashboard = 'dashboard:rename-dashboard';

  export const deleteOutput = 'dashboard:delete-dashboard-widget';

}

/**
 * Dashboard icons
 */
namespace Icons {

  export const whiteDashboard = new LabIcon({ name: 'pr-icons:white-dashboard', svgstr: whiteDashboardSvgstr});

  export const greyDashboard = new LabIcon({ name: 'pr-icons:grey-dashboard', svgstr: greyDashboardSvgstr});

  export const blueDashboard = new LabIcon({ name: 'pr-icons:blue-dashboard', svgstr: blueDashboardSvgstr});

  export const whiteDashboardOutline = new LabIcon({ name: 'pr-icons:white-dashboard-icon', svgstr: whiteDashboardOutlineSvgstr});

  export const greyDashboardOutline = new LabIcon({ name: 'pr-icons:grey-dashboard-outline', svgstr: greyDashboardOutlineSvgstr});
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
    this.title.icon = Icons.blueDashboard;
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
    // Makes widget focusable for WidgetTracker
    this.node.setAttribute('tabindex', '-1');

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

  /**
   * Create click listeners on attach
   */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
    this.node.addEventListener('contextmenu', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('contextmenu', this);
  }

  handleEvent(event: Event): void {
    switch(event.type) {
      case 'click':
      case 'contextmenu':
        // Focuses on clicked output and blurs all others
        // Is there a more efficient way to blur other outputs?
        Array.from(document.getElementsByClassName(DASHBOARD_WIDGET_CLASS))
             .map(blur);
        this.node.focus();
    }
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
      namespace: 'dashboards'
    });

    //Tracker for DashboardWidgets
    const outputTracker = new WidgetTracker<DashboardWidget>({
      namespace: 'dashboard-outputs'
    });

    addCommands(
      app,
      tracker,
      dashboardTracker,
      outputTracker
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

    app.contextMenu.addItem({
      command: CommandIDs.deleteOutput,
      selector: '.pr-DashboardWidget',
      rank: 0
    });

    // Add commands to key bindings
    app.commands.addKeyBinding({
      command: CommandIDs.deleteOutput,
      args: {},
      keys: ['Backspace'],
      selector: '.pr-DashboardWidget'
    })

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
  dashboardTracker: WidgetTracker<Dashboard>,
  outputTracker: WidgetTracker<DashboardWidget>
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
   * Deletes a selected DashboardWidget
   */
  commands.addCommand(CommandIDs.deleteOutput, {
    label: 'Delete Output',
    execute: args => {
      console.log('Deleting widget ', outputTracker.currentWidget.id);
      outputTracker.currentWidget.dispose();
    }
  });

  /**
   * Creates a dialog for renaming a dashboard.
   */
  commands.addCommand(CommandIDs.renameDashboard, {
    label: 'Rename Dashboard',
    execute: args => {
      // Should this be async? Still kind of unclear on when that needs to be used.
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
   * Logs the outputTracker to console for debugging.
   */
  commands.addCommand(CommandIDs.printTracker, {
    label: 'Print Tracker',
    execute: args => {
      console.log(outputTracker);
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
        const dashboard = new Dashboard({ content: undefined });
        dashboard.addWidget(content);
        current.context.addSibling(dashboard, {
          ref: current.id,
          mode: 'split-bottom'
        });

        // Add the dashboard to the dashboard tracker.
        void dashboardTracker.add(dashboard);
      }

      const updateOutputs = () => {
        void outputTracker.save(content);
      }

      current.context.pathChanged.connect(updateOutputs);
      current.context.model?.cells.changed.connect(updateOutputs);

      // Add the output to the output tracker.
      outputTracker.add(content);

      // Close the output when the parent notebook is closed.
      // FIXME: This doesn't work!
      current.content.disposed.connect(() => {
        current!.context.pathChanged.disconnect(updateOutputs);
        current!.context.model?.cells.changed.disconnect(updateOutputs);
        content.dispose;
      });
    },
    isEnabled: isEnabledAndSingleSelected
  });
}
export default extension;
