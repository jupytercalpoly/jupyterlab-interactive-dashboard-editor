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
  Panel
} from '@lumino/widgets';

import { CodeCell } from '@jupyterlab/cells';

import { notebookIcon } from '@jupyterlab/ui-components';

import {
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

// For unimplemented server component
// import { requestAPI } from './jupyterlabvoilaext';

/**
 * Command IDs used
 */
namespace CommandIDs {

  export const printTracker = 'notebook:print-tracker';

  export const addToDashboard = 'notebook:add-to-dashboard';

}

/**
 * A namespace for module private functionality.
 * jupyterlab/packages/notebook-extension/src/index.ts
 */
namespace Private {

  /**
   * A widget hosting a cloned output area.
   */
  export class ClonedOutputArea extends Panel {
    constructor(options: ClonedOutputArea.IOptions) {
      super();
      this._notebook = options.notebook;
      this._index = options.index !== undefined ? options.index : -1;
      this._cell = options.cell || null;
      this.id = `LinkedOutputView-${UUID.uuid4()}`;
      // Changed label from original repo
      this.title.label = 'Dashboard';
      this.title.icon = notebookIcon;
      this.title.caption = this._notebook.title.label
        ? `For Notebook: ${this._notebook.title.label}`
        : 'For Notebook:';
      this.addClass('jp-LinkedOutputView');

      // Wait for the notebook to be loaded before
      // cloning the output area.
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
   * ClonedOutputArea statics.
   */
  export namespace ClonedOutputArea {
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
}

/**
 * Initialization data for the jupyterlab_voila_ext extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-voila-ext',
  autoStart: true,
  requires: [INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    tracker: INotebookTracker,
  ): void => {
    console.log('JupyterLab extension presto is activated!');

    // Tracker for Dashboard widgets
    const dashboardOutputs = new WidgetTracker<
      MainAreaWidget<Private.ClonedOutputArea>
    >({
      namespace: 'dashboard-outputs'
    });

    addCommands(
      app,
      tracker,
      dashboardOutputs
    );

    // Puts command entry in a weird place in the right-click menu--
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

    // Server component currently unimplemented
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
  dashboardOutputs: WidgetTracker<MainAreaWidget>
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

  commands.addCommand(CommandIDs.printTracker, {
    label: 'Print Tracker',
    execute: args => {
      console.log('Widget: ', tracker.currentWidget);
      console.log(tracker);
    },
    isEnabled: isEnabledAndSingleSelected
  });

  commands.addCommand(CommandIDs.addToDashboard, {
    label: 'Add to Dashboard',
    execute: async args => {
      const current: NotebookPanel | undefined | null = getCurrent({ ...args, activate: false });
      if (!current) {
        return;
      }
      const cell = current.content.activeCell as CodeCell;
      const index = current.content.activeCellIndex;

      // Create a MainAreaWidget
      const content = new Private.ClonedOutputArea({
        notebook: current,
        cell,
        index
      });

      // If there's already a dashboard, append the cloned area
      if (dashboardOutputs.currentWidget) {
        // Do appening stuff here (how? Still trying to figure it out.)
        (dashboardOutputs.currentWidget.content as Panel).addWidget(content);
        dashboardOutputs.currentWidget.update();
        console.log('Output added to dashboard (not really)');
      } else {
        // If there's not a dashboard, create one and add the current output
        const panel = new Panel();
        panel.title.label = 'Dashboard';
        panel.title.icon = notebookIcon;
        panel.addWidget(content);
        const widget = new MainAreaWidget({ content: panel });
        current.context.addSibling(widget, {
          ref: current.id,
          mode: 'split-bottom'
        });

        const updateCloned = () => {
          void dashboardOutputs.save(widget);
        };
  
        current.context.pathChanged.connect(updateCloned);
        current.context.model?.cells.changed.connect(updateCloned);
  
        // Add the cloned output to the output widget tracker.
        void dashboardOutputs.add(widget);
  
        // Remove the output view if the parent notebook is closed.
        current.content.disposed.connect(() => {
          current!.context.pathChanged.disconnect(updateCloned);
          current!.context.model?.cells.changed.disconnect(updateCloned);
          widget.dispose();
        });
      }

    },
    isEnabled: isEnabledAndSingleSelected
  });
}
export default extension;
