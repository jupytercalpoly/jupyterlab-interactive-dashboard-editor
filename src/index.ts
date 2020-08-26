import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import {
  WidgetTracker,
  showDialog,
  Dialog,
  InputDialog,
} from '@jupyterlab/apputils';

import { CodeCell } from '@jupyterlab/cells';

import {
  Dashboard,
  DashboardDocumentFactory,
  DashboardTracker,
  IDashboardTracker,
} from './dashboard';

import { DashboardWidget } from './widget';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { DBUtils } from './dbUtils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Widget } from '@lumino/widgets';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { ILauncher } from '@jupyterlab/launcher';

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

import { DashboardLayout } from './custom_layout';

const extension: JupyterFrontEndPlugin<IDashboardTracker> = {
  id: 'jupyterlab-interactive-dashboard-editor',
  autoStart: true,
  requires: [INotebookTracker, IMainMenu, IDocumentManager, ILauncher],
  provides: IDashboardTracker,
  activate: (
    app: JupyterFrontEnd,
    notebookTracker: INotebookTracker,
    mainMenu: IMainMenu,
    docManager: IDocumentManager,
    launcher: ILauncher
  ): IDashboardTracker => {
    console.log('JupyterLab extension presto is activated!');

    // Tracker for Dashboard
    const dashboardTracker = new DashboardTracker({ namespace: 'dashboards' });

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

    addCommands(
      app,
      dashboardTracker,
      outputTracker,
      utils,
      docManager,
      notebookTracker
    );

    // Create a new model factory.
    const modelFactory = new DashboardModelFactory({
      notebookTracker,
      docManager,
    });

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
    widgetFactory.widgetCreated.connect((_sender, widget) => {
      void dashboardTracker.add(widget.content);

      widget.title.icon = dashboardFiletype.icon;
      widget.title.iconClass = dashboardFiletype.iconClass || '';
      widget.title.iconLabel = dashboardFiletype.iconLabel || '';

      const model = widget.content.model;
      model.scrollMode = 'infinite';
      model.width = Dashboard.DEFAULT_WIDTH;
      model.height = Dashboard.DEFAULT_HEIGHT;
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

    // app.contextMenu.addItem({
    //   command: CommandIDs.toggleMode,
    //   selector: '.pr-JupyterDashboard',
    //   rank: 3,
    // });

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

    // app.contextMenu.addItem({
    //   command: CommandIDs.enableGrid,
    //   selector: '.pr-JupyterDashboard',
    //   rank: 7,
    // });

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

    // app.commands.addKeyBinding({
    //   command: CommandIDs.toggleMode,
    //   args: {},
    //   keys: ['I'],
    //   selector: '.pr-JupyterDashboard',
    // });

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
      {
        command: CommandIDs.setGridSize,
      },
    ]);

    mainMenu.fileMenu.newMenu.addGroup([
      {
        command: CommandIDs.createNew,
      },
    ]);

    launcher.add({
      command: CommandIDs.createNew,
      category: 'Other',
      rank: 1,
    });

    return dashboardTracker;
  },
};

function addCommands(
  app: JupyterFrontEnd,
  dashboardTracker: WidgetTracker<Dashboard>,
  outputTracker: WidgetTracker<DashboardWidget>,
  utils: DBUtils,
  docManager: IDocumentManager,
  notebookTracker: INotebookTracker
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
      if (mode === 'present') {
        return DashboardIcons.edit;
      } else {
        return DashboardIcons.view;
      }
    },
    label: (args) => {
      if (inToolbar(args)) {
        return '';
      }
      const mode = dashboardTracker.currentWidget?.model.mode || 'present';
      if (mode === 'present') {
        return 'Switch To Edit Mode';
      } else {
        return 'Switch To Presentation Mode';
      }
    },
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      if (dashboard.model.mode === 'present') {
        dashboard.model.mode = 'edit';
      } else {
        dashboard.model.mode = 'present';
      }
    },
  });

  commands.addCommand(CommandIDs.enableGrid, {
    label: 'Enable Tiled Layout (EXPERIMENTAL)',
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      dashboard.model.mode = 'grid';
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
      const model = dashboardTracker.currentWidget.model;
      const width = model.width ? model.width : Dashboard.DEFAULT_WIDTH;
      const height = model.height ? model.height : Dashboard.DEFAULT_HEIGHT;
      await showDialog({
        title: 'Enter Dimensions',
        body: new Private.ResizeHandler(width, height),
        focusNodeSelector: 'input',
        buttons: [Dialog.cancelButton(), Dialog.okButton()],
      }).then((result) => {
        const value = result.value;
        let newWidth = value[0];
        let newHeight = value[1];
        if (value === null && model.width && model.height) {
          return;
        }
        if (!newWidth) {
          if (!model.width) {
            newWidth = Dashboard.DEFAULT_WIDTH;
          } else {
            newWidth = model.width;
          }
        }
        if (!newHeight) {
          if (!model.height) {
            newHeight = Dashboard.DEFAULT_HEIGHT;
          } else {
            newHeight = model.height;
          }
        }
        model.width = newWidth;
        model.height = newHeight;
      });
    },
    isEnabled: hasDashboard,
  });

  commands.addCommand(CommandIDs.setGridSize, {
    label: 'Set Grid Dimensions',
    execute: async (args) => {
      const newSize = await InputDialog.getNumber({
        title: 'Enter Grid Size',
      });
      if (newSize.value) {
        const layout = dashboardTracker.currentWidget.layout as DashboardLayout;
        layout.gridSize = newSize.value;
      }
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
      const id = args.dashboardId;
      let dashboard: Dashboard;
      if (id) {
        dashboard = dashboardTracker.find((widget) => widget.id === id);
      } else {
        dashboard = dashboardTracker.currentWidget;
      }
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
    execute: async (args) => {
      // A new file is created and opened separately to override the default
      // opening behavior when there's a notebook and open the dashboard in a
      // split pane instead of a tab.

      const notebook = notebookTracker.currentWidget;
      const newModel = await docManager.newUntitled({
        ext: 'dash',
        path: '/',
        type: 'file',
      });
      const path = newModel.path;
      if (notebook) {
        docManager.openOrReveal(`/${path}`, undefined, undefined, {
          mode: 'split-left',
          ref: notebook.id,
        });
      } else {
        docManager.openOrReveal(`/${path}`);
      }
    },
  });

  // TODO: Make this optionally saveAs (based on filename?)
  commands.addCommand(CommandIDs.save, {
    label: (args) => (inToolbar(args) ? '' : 'Save'),
    icon: saveIcon,
    execute: (args) => {
      const dashboard = dashboardTracker.currentWidget;
      dashboard.model.path;
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
      // width.value = oldWidth.toString();
      // height.value = oldHeight.toString();

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
