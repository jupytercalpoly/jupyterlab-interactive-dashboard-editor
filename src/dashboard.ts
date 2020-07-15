import { NotebookPanel } from '@jupyterlab/notebook';

import { CodeCell } from '@jupyterlab/cells';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { Widget, Panel} from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { IDragEvent } from '@lumino/dragdrop';

import { UUID, MimeData} from '@lumino/coreutils';

import { DashboardLayout } from './custom_layout';

import { DashboardWidget } from './widget';

import { Icons } from './icons';

import {ToolbarItems} from './toolbar';

// HTML element classes

const DASHBOARD_CLASS = 'pr-JupyterDashboard';

const DASHBOARD_AREA_CLASS = 'pr-DashboardArea';

const DROP_TARGET_CLASS = 'pr-DropTarget';

/**
 * Namespace for DashboardArea options.
 */
export namespace DashboardArea {
  export interface IOptions extends Panel.IOptions {
    /**
     * Tracker for child widgets.
     */
    outputTracker: WidgetTracker<DashboardWidget>;

    // /**
    //  * Dashboard used for position.
    //  */
    // dashboard: Dashboard;
  }
}

/**
 * A namespace for private functionality.
 */
export namespace Private {
  /**
   * Given a MimeData instance, extract the first text data, if any.
   */
  export function findTextData(mime: MimeData): string | undefined {
    const types = mime.types();
    const textType = types.find(t => t.indexOf('text') === 0);
    if (textType === undefined) {
      return "undefined" as string;
    }
    
    return mime.getData(textType) as string;
  }
}

/**
 * Main content widget for the Dashboard widget.
 */
export class DashboardArea extends Panel {
  constructor(options: DashboardArea.IOptions) {
    super({...options, layout: new DashboardLayout()});
    this._outputTracker = options.outputTracker;
    this.addClass(DASHBOARD_AREA_CLASS);
    // console.log("area style", this.node.style);
  }

  placeWidget(index: number, widget: DashboardWidget, pos: number[]): void {
    (this.layout as DashboardLayout).placeWidget(index, widget, pos);
    this._outputTracker.add(widget);
  }

  /**
   * Create click listeners on attach
   */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('lm-dragenter', this);
    this.node.addEventListener('lm-dragleave', this);
    this.node.addEventListener('lm-dragover', this);
    this.node.addEventListener('lm-drop', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('lm-dragenter', this);
    this.node.removeEventListener('lm-dragleave', this);
    this.node.removeEventListener('lm-dragover', this);
    this.node.removeEventListener('lm-drop', this);
  }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.addClass('pr-DropTarget');
  }

  /**
   * Handle the `'lm-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
    this.removeClass(DROP_TARGET_CLASS);
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'lm-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
    this.removeClass(DROP_TARGET_CLASS);
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = 'copy';
    this.addClass(DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    this.removeClass(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();

    const notebook = event.source.parent as NotebookPanel;
    // const activeCell = notebook.content.activeCell;
    const cell = notebook.content.activeCell as CodeCell;
    const index = notebook.content.activeCellIndex;

    const widget = new DashboardWidget({
      notebook,
      cell,
      index
    });
    
    // FIXME:
    // Doesn't do the disposing on notebook close that the insertWidget function in addCommands does.
    
    //default width 500, default height 100
    const pos = [event.offsetX, event.offsetY, 500, 100];
    this.placeWidget(0, widget, pos);
    this.update();

    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }
  }

  handleEvent(event: Event): void {
    switch(event.type) {
      case 'lm-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'lm-drop':
        this._evtDrop(event as IDragEvent);
        break;
    }
  }

  private _outputTracker: WidgetTracker<DashboardWidget>;
}

/**
 * Main Dashboard display widget. Currently extends MainAreaWidget (May change)
 */
export class Dashboard extends MainAreaWidget<Widget> {
  // Generics??? Would love to further constrain this to DashboardWidgets but idk how
  constructor(options: Dashboard.IOptions) {
    const dashboardArea = new DashboardArea({outputTracker: options.outputTracker, layout: new DashboardLayout({}) })
    super({...options, content: options.content !== undefined ? options.content : dashboardArea });
    this._name = options.name || 'Unnamed Dashboard';
    this.id = `JupyterDashboard-${UUID.uuid4()}`;
    this.title.label = this._name;
    this.title.icon = Icons.blueDashboard;
    // Add caption?
    
    this.addClass(DASHBOARD_CLASS);
    this.node.setAttribute('style', 'overflow:auto');

    // Adds save button to dashboard toolbar
    this.toolbar.addItem("save", ToolbarItems.createSaveButton(this, options.panel));
  }

  /**
   * Adds a DashboardWidget to a specific position on the dashboard.
   * Inserting at index -1 places the widget at the end of the dashboard.
   */
  insertWidget(index: number, widget: DashboardWidget): void {
    (this.content as DashboardArea).placeWidget(index, widget, [0, 0, 500, 100]);
  }

  rename(newName: string): void {
    // Have to call .update() after to see changes. Include update in function?
    this._name = newName;
    this.title.label = newName;
  }

  private _name: string;
}

export namespace Dashboard {
  export interface IOptions extends MainAreaWidget.IOptionsOptionalContent {
    /**
     * Dashboard name.
     */
    name?: string;

    /**
     * Maximum size of the undo/redo stack.
     */
    maxStackSize?: number;

    /**
     * Tracker for child widgets.
     */
    outputTracker: WidgetTracker<DashboardWidget>;

    /**
     * NotebookPanel.
     */
    panel: NotebookPanel;
  }
}
