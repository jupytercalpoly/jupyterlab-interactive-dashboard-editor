import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import { WidgetTracker, showDialog, Dialog } from '@jupyterlab/apputils';

import { CodeCell } from '@jupyterlab/cells';

import { Dashboard, DashboardDocumentFactory } from './dashboard';

import { DashboardWidget } from './widget';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { DBUtils } from './dbUtils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Widget } from '@lumino/widgets';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { DashboardIcons } from './icons';

import { DashboardModelFactory } from './model';

import {
  undoIcon,
  redoIcon,
  copyIcon,
  cutIcon,
  pasteIcon,
  runIcon,
  saveIcon,
} from '@jupyterlab/ui-components';

import { CommandIDs } from './commands';

import { ReadonlyJSONObject } from '@lumino/coreutils';

const DEFAULT_NAME = 'untitled.dash';

const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-interactive-dashboard-editor',
  autoStart: true,
  requires: [INotebookTracker, ILabShell, IMainMenu, IDocumentManager],
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    labShell: ILabShell,
    mainMenu: IMainMenu,
    docManager: IDocumentManager
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

    //Singleton Utils: clipboard, fullscreen, content manager
    const utils = new DBUtils();

    // Define dashboard file type.
    const dashboardFiletype: Partial<DocumentRegistry.IFileType> = {
      name: 'dashboard',
      contentType: 'file',
      extensions: ['.dashboard', '.dash'],
      fileFormat: 'text',
      icon: DashboardIcons.blueDashboard,
      iconLabel: 'Dashboard',
      mimeTypes: ['application/json'],
    };
    // Add dashboard file type to the doc registry.
    app.docRegistry.addFileType(dashboardFiletype);

    addCommands(app, dashboardTracker, outputTracker, utils, docManager);

    // Create a new model factory.
    const modelFactory = new DashboardModelFactory({ notebookTracker });

    // Create a new widget factory.
    const widgetFactory = new DashboardDocumentFactory({
      name: 'dashboard',
      modelName: 'dashboard',
      fileTypes: ['dashboard'],
      defaultFor: ['dashboard'],
      commandRegistry: app.commands,
      outputTracker,
    });

    app.docRegistry.addModelFactory(modelFactory);
    app.docRegistry.addWidgetFactory(widgetFactory);
    widgetFactory.widgetCreated.connect((sender, widget) => {
      void dashboardTracker.add(widget.content);

      widget.title.icon = dashboardFiletype.icon;
      widget.title.iconClass = dashboardFiletype.iconClass || '';
      widget.title.iconLabel = dashboardFiletype.iconLabel || '';
    });

    // Add commands to context menus.
    app.contextMenu.addItem({
      command: CommandIDs.save,
      selector: '.pr-JupyterDashboard',
      rank: 3,
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
      command: CommandIDs.cut,
      selector: '.pr-JupyterDashboard',
      rank: 4,
    });

    app.contextMenu.addItem({
      command: CommandIDs.copy,
      selector: '.pr-JupyterDashboard',
      rank: 5,
    });

    app.contextMenu.addItem({
      command: CommandIDs.paste,
      selector: '.pr-JupyterDashboard',
      rank: 6,
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
      command: CommandIDs.cut,
      args: {},
      keys: ['Accel X'],
      selector: '.pr-JupyterDashboard',
    });

    app.commands.addKeyBinding({
      command: CommandIDs.copy,
      args: {},
      keys: ['Accel C'],
      selector: '.pr-JupyterDashboard',
    });

    app.commands.addKeyBinding({
      command: CommandIDs.paste,
      args: {},
      keys: ['Accel V'],
      selector: '.pr-JupyterDashboard',
    });

    app.commands.addKeyBinding({
      command: CommandIDs.toggleFitContent,
      args: {},
      keys: ['K'],
      selector: '.pr-EditableWidget',
    });

    // Add commands to edit menu.
    mainMenu.editMenu.addGroup([
      {
        command: CommandIDs.setDimensions,
      },
    ]);

    mainMenu.fileMenu.newMenu.addGroup([
      {
        command: CommandIDs.createNew,
      },
    ]);
  },
};

function addCommands(
  app: JupyterFrontEnd,
  dashboardTracker: WidgetTracker<Dashboard>,
  outputTracker: WidgetTracker<DashboardWidget>,
  utils: DBUtils,
  docManager: IDocumentManager
): void {
  const { commands } = app;

  /**
   * Whether there is an active dashboard.
   */
  function hasDashboard(): boolean {
    return dashboardTracker.currentWidget !== null;
  }

  /**
   * Whether there is a dashboard output.
   */
  function hasOutput(): boolean {
    return outputTracker.currentWidget !== null;
  }

  function inToolbar(args: ReadonlyJSONObject): boolean {
    return args.toolbar as boolean;
  }

  /**
   * Deletes a selected DashboardWidget.
   */
  commands.addCommand(CommandIDs.deleteOutput, {
    label: 'Delete Output',
    execute: (args) => {
      const widget = outputTracker.currentWidget;
      const dashboard = dashboardTracker.currentWidget;
      dashboard.deleteWidget(widget);
    },
  });

  /**
   * Undo the last change to a dashboard.
   */
  commands.addCommand(CommandIDs.undo, {
    label: (args) => (inToolbar(args) ? '' : 'Undo'),
    icon: undoIcon,
    execute: (args) => {
      dashboardTracker.currentWidget.undo();
    },
    isEnabled: (args) =>
      inToolbar(args) ||
      (dashboardTracker.currentWidget &&
        dashboardTracker.currentWidget.model.widgetstore.hasUndo()),
  });

  /**
   * Redo the last undo to a dashboard.
   */
  commands.addCommand(CommandIDs.redo, {
    label: (args) => (inToolbar(args) ? '' : 'Redo'),
    icon: redoIcon,
    execute: (args) => {
      dashboardTracker.currentWidget.redo();
    },
    isEnabled: (args) =>
      inToolbar(args) ||
      (dashboardTracker.currentWidget &&
        dashboardTracker.currentWidget.model.widgetstore.hasRedo()),
  });

  commands.addCommand(CommandIDs.toggleFitContent, {
    label: (args) => 'Fit To Content',
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
    icon: (args) => {
      const mode = dashboardTracker.currentWidget?.model.mode || 'present';
      if (mode === 'edit') {
        return DashboardIcons.view;
      } else {
        return DashboardIcons.edit;
      }
    },
    label: (args) => {
      if (inToolbar(args)) {
        return '';
      }
      const mode = dashboardTracker.currentWidget?.model.mode || 'present';
      if (mode === 'edit') {
        return 'Switch To Presentation Mode';
      } else {
        return 'Switch To Edit Mode';
      }
    },
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      if (dashboard.model.mode === 'edit') {
        dashboard.model.mode = 'present';
      } else {
        dashboard.model.mode = 'edit';
      }
    },
  });

  commands.addCommand(CommandIDs.runOutput, {
    label: (args) => (inToolbar(args) ? '' : 'Run Output'),
    icon: runIcon,
    execute: (args) => {
      const widget = outputTracker.currentWidget;
      const cell = widget.cell as CodeCell;
      const sessionContext = widget.notebook.sessionContext;
      CodeCell.execute(cell, sessionContext);
    },
  });

  commands.addCommand(CommandIDs.setDimensions, {
    label: 'Set Dashboard Dimensions',
    execute: async (args) => {
      const dashboard = dashboardTracker.currentWidget;
      const width = dashboard.model.width;
      const height = dashboard.model.height;
      await showDialog({
        title: 'Enter Dimensions',
        body: new Private.ResizeHandler(width, height),
        focusNodeSelector: 'input',
        buttons: [Dialog.cancelButton(), Dialog.okButton()],
      }).then((result) => {
        dashboard.model.width = result.value[0];
        dashboard.model.height = result.value[1];
      });
    },
    isEnabled: hasDashboard,
  });

  commands.addCommand(CommandIDs.copy, {
    label: (args) => (inToolbar(args) ? '' : 'Copy'),
    icon: copyIcon,
    execute: (args) => {
      const clipboard = utils.clipboard;
      const info = outputTracker.currentWidget.info;
      clipboard.clear();
      clipboard.add(info);
    },
    isEnabled: (args) => inToolbar(args) || hasOutput(),
  });

  commands.addCommand(CommandIDs.cut, {
    label: (args) => (inToolbar(args) ? '' : 'Cut'),
    icon: cutIcon,
    execute: (args) => {
      const clipboard = utils.clipboard;
      const widget = outputTracker.currentWidget;
      const info = widget.info;
      const dashboard = dashboardTracker.currentWidget;
      clipboard.clear();
      clipboard.add(info);
      dashboard.deleteWidget(widget);
    },
    isEnabled: (args) => inToolbar(args) || hasOutput(),
  });

  commands.addCommand(CommandIDs.paste, {
    label: (args) => (inToolbar(args) ? '' : 'Paste'),
    icon: pasteIcon,
    execute: (args) => {
      const clipboard = utils.clipboard;
      const dashboard = dashboardTracker.currentWidget;
      const widgetstore = dashboard.model.widgetstore;
      clipboard.forEach((info) => {
        const widgetId = DashboardWidget.createDashboardWidgetId();
        const pos = info.pos;
        pos.left = Math.max(pos.left - 10, 0);
        pos.top = Math.max(pos.top - 10, 0);

        const newWidget = widgetstore.createWidget({ ...info, widgetId, pos });
        dashboard.addWidget(newWidget, pos);
      });
    },
    isEnabled: (args) =>
      inToolbar(args) || (hasOutput() && utils.clipboard.size !== 0),
  });

  commands.addCommand(CommandIDs.createNew, {
    label: 'Dashboard',
    icon: DashboardIcons.blueDashboard,
    execute: (args) => {
      docManager.createNew(DEFAULT_NAME);
    },
  });

  // TODO: Make this optionally saveAs (based on filename?)
  commands.addCommand(CommandIDs.save, {
    label: (args) => (inToolbar(args) ? '' : 'Save'),
    icon: saveIcon,
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      dashboard.context.save();
    },
    isEnabled: (args) => inToolbar(args) || hasDashboard(),
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
