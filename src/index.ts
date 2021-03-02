import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { INotebookTracker } from '@jupyterlab/notebook';

import {
  WidgetTracker,
  showDialog,
  Dialog,
  InputDialog
} from '@jupyterlab/apputils';

import { CodeCell } from '@jupyterlab/cells';

import {
  Dashboard,
  DashboardDocumentFactory,
  DashboardTracker,
  IDashboardTracker
} from './dashboard';

import { DashboardWidget } from './widget';

import { IDocumentManager } from '@jupyterlab/docmanager';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Widget, Menu } from '@lumino/widgets';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { ILauncher } from '@jupyterlab/launcher';

import { DashboardIcons } from './icons';

import { DashboardModel, DashboardModelFactory } from './model';

import {
  undoIcon,
  redoIcon,
  copyIcon,
  cutIcon,
  pasteIcon,
  runIcon,
  saveIcon
} from '@jupyterlab/ui-components';

import { CommandIDs } from './commands';

import { ReadonlyJSONObject } from '@lumino/coreutils';

import { DashboardLayout } from './layout';

import { Widgetstore, WidgetInfo } from './widgetstore';

import { getMetadata } from './utils';

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
    // Tracker for Dashboard
    const dashboardTracker = new DashboardTracker({ namespace: 'dashboards' });

    //Tracker for DashboardWidgets
    const outputTracker = new WidgetTracker<DashboardWidget>({
      namespace: 'dashboard-outputs'
    });

    // Clipboard for copy/pasting outputs.
    const clipboard = new Set<Widgetstore.WidgetInfo>();

    // Define dashboard file type.
    const dashboardFiletype: Partial<DocumentRegistry.IFileType> = {
      name: 'dashboard',
      displayName: 'Dashboard',
      contentType: 'file',
      extensions: ['.dashboard', '.dash'],
      fileFormat: 'text',
      icon: DashboardIcons.tealDashboard,
      iconLabel: 'Dashboard',
      mimeTypes: ['application/json']
    };
    // Add dashboard file type to the doc registry.
    app.docRegistry.addFileType(dashboardFiletype);

    addCommands(
      app,
      dashboardTracker,
      outputTracker,
      clipboard,
      docManager,
      notebookTracker
    );

    // Create a new model factory.
    const modelFactory = new DashboardModelFactory({ notebookTracker });

    // Create a new widget factory.
    const widgetFactory = new DashboardDocumentFactory({
      name: 'dashboard',
      modelName: 'dashboard',
      fileTypes: ['dashboard'],
      defaultFor: ['dashboard'],
      commandRegistry: app.commands,
      outputTracker
    });

    app.docRegistry.addModelFactory(modelFactory);
    app.docRegistry.addWidgetFactory(widgetFactory);

    // Add newly created dashboards to the tracker, set their icon and label,
    // and set the default width, height, and scrollMode.
    widgetFactory.widgetCreated.connect((_sender, widget) => {
      void dashboardTracker.add(widget.content);

      widget.title.icon = dashboardFiletype.icon;
      widget.title.iconClass = dashboardFiletype.iconClass || '';
      widget.title.iconLabel = dashboardFiletype.iconLabel || '';

      const model = widget.content.model;
      // TODO: Make scrollMode changable in JL. Default 'infinite' for now.
      model.scrollMode = 'infinite';
      model.width = (widget.content.layout as DashboardLayout).width;
      model.height = (widget.content.layout as DashboardLayout).height;
    });

    // Add commands to context menus.
    app.contextMenu.addItem({
      command: CommandIDs.save,
      selector: '.pr-JupyterDashboard',
      rank: 3
    });

    app.contextMenu.addItem({
      command: CommandIDs.undo,
      selector: '.pr-JupyterDashboard',
      rank: 1
    });

    app.contextMenu.addItem({
      command: CommandIDs.redo,
      selector: '.pr-JupyterDashboard',
      rank: 2
    });

    app.contextMenu.addItem({
      command: CommandIDs.cut,
      selector: '.pr-JupyterDashboard',
      rank: 3
    });

    app.contextMenu.addItem({
      command: CommandIDs.copy,
      selector: '.pr-JupyterDashboard',
      rank: 4
    });

    app.contextMenu.addItem({
      command: CommandIDs.paste,
      selector: '.pr-JupyterDashboard',
      rank: 5
    });

    const experimentalMenu = new Menu({ commands: app.commands });
    experimentalMenu.title.label = 'Experimental';

    experimentalMenu.addItem({
      command: CommandIDs.saveToMetadata
    });

    experimentalMenu.addItem({
      command: CommandIDs.toggleInfiniteScroll
    });

    experimentalMenu.addItem({
      command: CommandIDs.trimDashboard
    });

    app.contextMenu.addItem({
      type: 'submenu',
      submenu: experimentalMenu,
      selector: '.pr-JupyterDashboard',
      rank: 6
    });

    app.contextMenu.addItem({
      command: CommandIDs.deleteOutput,
      selector: '.pr-EditableWidget',
      rank: 0
    });

    app.contextMenu.addItem({
      command: CommandIDs.toggleFitContent,
      selector: '.pr-EditableWidget',
      rank: 1
    });

    app.contextMenu.addItem({
      command: CommandIDs.toggleWidgetMode,
      selector: '.pr-EditableWidget',
      rank: 2
    });

    app.contextMenu.addItem({
      type: 'separator',
      selector: '.pr-EditableWidget',
      rank: 3
    });

    app.contextMenu.addItem({
      command: CommandIDs.openFromMetadata,
      selector: '.jp-Notebook',
      rank: 16
    });

    // Add commands to key bindings
    app.commands.addKeyBinding({
      command: CommandIDs.deleteOutput,
      args: {},
      keys: ['Backspace'],
      selector: '.pr-EditableWidget'
    });

    app.commands.addKeyBinding({
      command: CommandIDs.undo,
      args: {},
      keys: ['Z'],
      selector: '.pr-JupyterDashboard'
    });

    app.commands.addKeyBinding({
      command: CommandIDs.redo,
      args: {},
      keys: ['Shift Z'],
      selector: '.pr-JupyterDashboard'
    });

    app.commands.addKeyBinding({
      command: CommandIDs.cut,
      args: {},
      keys: ['Accel X'],
      selector: '.pr-JupyterDashboard'
    });

    app.commands.addKeyBinding({
      command: CommandIDs.copy,
      args: {},
      keys: ['Accel C'],
      selector: '.pr-JupyterDashboard'
    });

    app.commands.addKeyBinding({
      command: CommandIDs.paste,
      args: {},
      keys: ['Accel V'],
      selector: '.pr-JupyterDashboard'
    });

    app.commands.addKeyBinding({
      command: CommandIDs.toggleFitContent,
      args: {},
      keys: ['K'],
      selector: '.pr-EditableWidget'
    });

    // Add commands to edit menu.
    mainMenu.fileMenu.addGroup([
      {
        command: CommandIDs.setDimensions
      },
      {
        command: CommandIDs.setTileSize
      }
    ]);

    mainMenu.fileMenu.newMenu.addGroup([
      {
        command: CommandIDs.createNew
      }
    ]);

    launcher.add({
      command: CommandIDs.createNew,
      category: 'Other',
      rank: 1
    });

    return dashboardTracker;
  }
};

/**
 * Add commands to the main JupyterLab command registry.
 *
 * @param app - the JupyterLab instance.
 *
 * @param dashboardTracker - a tracker for dashboards.
 *
 * @param outputTracker - a tracker for dashboard outputs.
 *
 * @param clipboard - a set used to keep track of widgets for copy/pasting.
 *
 * @param docManager - a document manager used to create/rename files.
 *
 * @param notebookTracker - a tracker for notebooks.
 */
function addCommands(
  app: JupyterFrontEnd,
  dashboardTracker: WidgetTracker<Dashboard>,
  outputTracker: WidgetTracker<DashboardWidget>,
  clipboard: Set<Widgetstore.WidgetInfo>,
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
    execute: args => {
      const widget = outputTracker.currentWidget;
      const dashboard = dashboardTracker.currentWidget;
      dashboard.deleteWidget(widget);
    }
  });

  /**
   * Undo the last change to a dashboard.
   */
  commands.addCommand(CommandIDs.undo, {
    label: args => (inToolbar(args) ? '' : 'Undo'),
    icon: undoIcon,
    execute: args => {
      dashboardTracker.currentWidget.undo();
    },
    isEnabled: args =>
      inToolbar(args) ||
      (dashboardTracker.currentWidget &&
        dashboardTracker.currentWidget.model.widgetstore.hasUndo())
  });

  /**
   * Redo the last undo to a dashboard.
   */
  commands.addCommand(CommandIDs.redo, {
    label: args => (inToolbar(args) ? '' : 'Redo'),
    icon: redoIcon,
    execute: args => {
      dashboardTracker.currentWidget.redo();
    },
    isEnabled: args =>
      inToolbar(args) ||
      (dashboardTracker.currentWidget &&
        dashboardTracker.currentWidget.model.widgetstore.hasRedo())
  });

  commands.addCommand(CommandIDs.toggleFitContent, {
    label: args => 'Fit To Content',
    execute: args => {
      const widget = outputTracker.currentWidget;
      widget.fitToContent = !widget.fitToContent;
      if (widget.fitToContent) {
        widget.fitContent();
      }
    },
    isVisible: args => outputTracker.currentWidget.mode === 'free-edit',
    isToggled: args => outputTracker.currentWidget.fitToContent
  });

  commands.addCommand(CommandIDs.toggleMode, {
    icon: args => {
      const mode = dashboardTracker.currentWidget?.model.mode || 'present';
      if (mode === 'present') {
        return DashboardIcons.edit;
      } else {
        return DashboardIcons.view;
      }
    },
    label: args => {
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
    execute: args => {
      const dashboard = dashboardTracker.currentWidget;
      if (dashboard.model.mode === 'present') {
        dashboard.model.mode = 'free-edit';
      } else {
        dashboard.model.mode = 'present';
      }
    }
  });

  commands.addCommand(CommandIDs.runOutput, {
    label: args => (inToolbar(args) ? '' : 'Run Output'),
    icon: runIcon,
    execute: args => {
      const widget = outputTracker.currentWidget;
      const sessionContext = widget.notebook.sessionContext;
      CodeCell.execute(widget.cell as CodeCell, sessionContext);
    }
  });

  commands.addCommand(CommandIDs.setDimensions, {
    label: 'Set Dashboard Dimensions',
    execute: async args => {
      const model = dashboardTracker.currentWidget.model;
      const width = model.width ? model.width : window.innerWidth;
      const height = model.height ? model.height : window.innerHeight;
      await showDialog({
        title: 'Enter Dimensions',
        body: new Private.ResizeHandler(width, height),
        focusNodeSelector: 'input',
        buttons: [Dialog.cancelButton(), Dialog.okButton()]
      }).then(result => {
        const value = result.value;
        let newWidth = value[0];
        let newHeight = value[1];
        if (value === null && model.width && model.height) {
          return;
        }
        if (!newWidth) {
          if (!model.width) {
            newWidth = window.innerWidth;
          } else {
            newWidth = model.width;
          }
        }
        if (!newHeight) {
          if (!model.height) {
            newHeight = window.innerHeight;
          } else {
            newHeight = model.height;
          }
        }
        model.width = newWidth;
        model.height = newHeight;
      });
    },
    isEnabled: hasDashboard
  });

  commands.addCommand(CommandIDs.setTileSize, {
    label: 'Set Grid Dimensions',
    execute: async args => {
      const newSize = await InputDialog.getNumber({
        title: 'Enter Grid Size'
      });
      if (newSize.value) {
        const layout = dashboardTracker.currentWidget.layout as DashboardLayout;
        layout.setTileSize(newSize.value);
      }
    },
    isEnabled: hasDashboard
  });

  commands.addCommand(CommandIDs.copy, {
    label: args => (inToolbar(args) ? '' : 'Copy'),
    icon: copyIcon,
    execute: args => {
      const info = outputTracker.currentWidget.info;
      clipboard.clear();
      clipboard.add(info);
    },
    isEnabled: args => inToolbar(args) || hasOutput()
  });

  commands.addCommand(CommandIDs.cut, {
    label: args => (inToolbar(args) ? '' : 'Cut'),
    icon: cutIcon,
    execute: args => {
      const widget = outputTracker.currentWidget;
      const info = widget.info;
      const dashboard = dashboardTracker.currentWidget;
      clipboard.clear();
      clipboard.add(info);
      dashboard.deleteWidget(widget);
    },
    isEnabled: args => inToolbar(args) || hasOutput()
  });

  commands.addCommand(CommandIDs.paste, {
    label: args => (inToolbar(args) ? '' : 'Paste'),
    icon: pasteIcon,
    execute: args => {
      const id = args.dashboardId;
      let dashboard: Dashboard;
      if (id) {
        dashboard = dashboardTracker.find(widget => widget.id === id);
      } else {
        dashboard = dashboardTracker.currentWidget;
      }
      const widgetstore = dashboard.model.widgetstore;
      clipboard.forEach(info => {
        const widgetId = DashboardWidget.createDashboardWidgetId();
        const pos = info.pos;
        pos.left = Math.max(pos.left - 10, 0);
        pos.top = Math.max(pos.top - 10, 0);

        const newWidget = widgetstore.createWidget({ ...info, widgetId, pos });
        dashboard.addWidget(newWidget, pos);
      });
    },
    isEnabled: args => inToolbar(args) || (hasOutput() && clipboard.size !== 0)
  });

  commands.addCommand(CommandIDs.saveToMetadata, {
    label: 'Save Dashboard To Notebook Metadata',
    execute: async args => {
      const name = await InputDialog.getText({
        title: 'Dashboard name',
        text: 'default'
      });
      if (name.value) {
        const dashboard = dashboardTracker.currentWidget;
        dashboard.saveToNotebookMetadata(name.value);
      }
    }
  });

  commands.addCommand(CommandIDs.createNew, {
    label: 'Dashboard',
    icon: DashboardIcons.tealDashboard,
    execute: async args => {
      // A new file is created and opened separately to override the default
      // opening behavior when there's a notebook and open the dashboard in a
      // split pane instead of a tab.

      const notebook = notebookTracker.currentWidget;
      const newModel = await docManager.newUntitled({
        ext: 'dash',
        path: '/',
        type: 'file'
      });
      const path = newModel.path;
      if (notebook) {
        docManager.openOrReveal(`/${path}`, undefined, undefined, {
          mode: 'split-left',
          ref: notebook.id
        });
      } else {
        docManager.openOrReveal(`/${path}`);
      }
    }
  });

  // TODO: Make this optionally saveAs (based on filename?)
  commands.addCommand(CommandIDs.save, {
    label: args => (inToolbar(args) ? '' : 'Save'),
    icon: saveIcon,
    execute: args => {
      const dashboard = dashboardTracker.currentWidget;
      dashboard.context.save();
    },
    isEnabled: args => inToolbar(args) || hasDashboard()
  });

  commands.addCommand(CommandIDs.openFromMetadata, {
    label: 'Open Metadata Dashboard',
    execute: async args => {
      const notebook = notebookTracker.currentWidget;
      const notebookMetadata = getMetadata(notebook);
      if (!('views' in notebookMetadata)) {
        throw new Error('No views in notebook');
      }
      const notebookId = notebookMetadata.id;
      let dashboardId: string;
      if (args.id != null) {
        dashboardId = args.id as string;
        if (
          // eslint-disable-next-line no-prototype-builtins
          !(notebookMetadata.views as Record<string, any>).hasOwnProperty(
            dashboardId
          )
        ) {
          throw new Error(
            `Dashboard id ${dashboardId} doesn't exist in notebook ${notebookId}`
          );
        }
      } else {
        const dashboardIds = Object.keys(notebookMetadata.views);
        const nameMap = new Map<string, string>(
          dashboardIds.map(id => [notebookMetadata.views[id].name, id])
        );
        const dashboardName = await InputDialog.getItem({
          title: 'Select a Dashboard',
          current: 0,
          items: Array.from(nameMap.keys())
        });
        if (dashboardName.value) {
          dashboardId = nameMap.get(dashboardName.value);
        } else {
          return;
        }
      }

      const dashboardView = notebookMetadata.views[dashboardId];
      const {
        cellHeight,
        cellWidth,
        dashboardHeight,
        dashboardWidth
      } = dashboardView;

      const cells = notebook.content.widgets;

      const widgetstore = new Widgetstore({ id: 0, notebookTracker });

      widgetstore.startBatch();

      for (const cell of cells) {
        const metadata = getMetadata(cell);
        if (metadata !== undefined && !metadata.views[dashboardId].hidden) {
          const { pos, snapToGrid } = metadata.views[dashboardId];
          const { left, top, width, height } = pos;

          const adjustedPos = !snapToGrid
            ? pos
            : {
                left: left * cellWidth,
                top: top * cellHeight,
                width: width * cellWidth,
                height: height * cellHeight
              };

          const widgetInfo: WidgetInfo = {
            widgetId: DashboardWidget.createDashboardWidgetId(),
            notebookId,
            cellId: metadata.id,
            snapToGrid,
            pos: adjustedPos
          };
          widgetstore.addWidget(widgetInfo);
        }
      }

      widgetstore.endBatch();

      const model = new DashboardModel({
        widgetstore,
        notebookTracker
      });

      const dashboard = new Dashboard({
        outputTracker,
        model
      });

      dashboard.model.width = dashboardWidth;
      dashboard.model.height = dashboardHeight;
      (dashboard.layout as DashboardLayout).setTileSize(cellHeight);

      dashboard.updateLayoutFromWidgetstore();
      dashboard.model.mode = 'present';

      notebook.context.addSibling(dashboard, { mode: 'split-left' });
    },
    isEnabled: args => {
      const notebook = notebookTracker.currentWidget;
      const metadata = getMetadata(notebook);
      if (metadata !== undefined) {
        return true;
      }
      return false;
    }
  });

  commands.addCommand(CommandIDs.toggleWidgetMode, {
    label: 'Snap to Grid',
    isToggled: args => {
      const widget = outputTracker.currentWidget;
      return widget.mode === 'grid-edit';
    },
    execute: args => {
      const widget = outputTracker.currentWidget;
      if (widget.mode === 'grid-edit') {
        widget.mode = 'free-edit';
      } else if (widget.mode === 'free-edit') {
        widget.mode = 'grid-edit';
      }
    }
  });

  commands.addCommand(CommandIDs.toggleInfiniteScroll, {
    label: 'Infinite Scroll',
    isToggled: args =>
      dashboardTracker.currentWidget?.model.scrollMode === 'infinite',
    execute: args => {
      const dashboard = dashboardTracker.currentWidget;
      if (dashboard.model.scrollMode === 'infinite') {
        dashboard.model.scrollMode = 'constrained';
      } else {
        dashboard.model.scrollMode = 'infinite';
      }
    }
  });

  commands.addCommand(CommandIDs.trimDashboard, {
    label: 'Trim Dashboard',
    execute: args => {
      const dashboard = dashboardTracker.currentWidget;
      (dashboard.layout as DashboardLayout).trimDashboard();
    }
  });
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * A dialog with two boxes for setting a dashboard's width and height.
   */
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
