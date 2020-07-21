import { NotebookPanel } from '@jupyterlab/notebook';

import { CodeCell } from '@jupyterlab/cells';

import { MainAreaWidget, WidgetTracker } from '@jupyterlab/apputils';

import { Widget, Panel } from '@lumino/widgets';

import { Message } from '@lumino/messaging';

import { IDragEvent } from '@lumino/dragdrop';

import { UUID, MimeData } from '@lumino/coreutils';

import { DashboardLayout } from './custom_layout';

import { DashboardWidget } from './widget';

import { Icons } from './icons';

import { createSaveButton } from './toolbar';

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
 * Given a MimeData instance, extract the first text data, if any.
 */
export function findTextData(mime: MimeData): string | undefined {
  const types = mime.types();
  const textType = types.find(t => t.indexOf('text') === 0);
  if (textType === undefined) {
    return 'undefined' as string;
  }

  return mime.getData(textType) as string;
}

/**
 * Main content widget for the Dashboard widget.
 */
export class DashboardArea extends Panel {
  constructor(options: DashboardArea.IOptions) {
    super({ ...options, layout: new DashboardLayout() });
    this._outputTracker = options.outputTracker;
    this.addClass(DASHBOARD_AREA_CLASS);
  }

  placeWidget(index: number, widget: DashboardWidget, pos: number[]): void {
    (this.layout as DashboardLayout).placeWidget(index, widget, pos);
    this._outputTracker.add(widget);
  }

  cutWidget(widget: DashboardWidget): void {
    (this.layout as DashboardLayout).cutWidget(widget);
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

//   refresh(): void{
//     for (let i = 0; i < panel.content.widgets.length; i++) {
//       // console.log("cell ", i, " at pos", (panel.content.widgets[i] as Cell).model.metadata.get("pos"));
//       // CodeCell.execute(panel.content.widgets[i] as CodeCell, sessionContext: ISessionContext, metadata?: JSONObject):
//       const pos = (panel.content.widgets[i] as Cell).model.metadata.get(
//         dashboard.name
//       ) as (number[])[];
//       const cell = panel.content.widgets[i] as CodeCell;
//       const index = i;
//       const widget = new DashboardWidget({
//         notebook: panel,
//         cell,
//         index
//       });
//       if (pos !== undefined) {
//         pos.forEach(p => {
//           //    console.log("found pos", p);
//           (dashboard.content as DashboardArea).placeWidget(-1, widget, p);
//         });
//       }
//     }
//     dashboard.update();
//     return
// }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
    const data = findTextData(event.mimeData);
    if (data === undefined) {
      //  
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
    const data = findTextData(event.mimeData);
    if (data === undefined) {
      // console.log("drag leave returns");
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
    const data = findTextData(event.mimeData);
    if (data === undefined) {
      // console.log("Drag over returns");
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
    const data = findTextData(event.mimeData);
    if (data === undefined) {
      // console.log("drop returns");
      return;
    }
    this.removeClass(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();

    // console.log("source of drop event", event.source);
    
    let widget : DashboardWidget;
    if(event.source instanceof DashboardWidget){
      widget = event.source as DashboardWidget;
      // this.cutWidget(widget);
      console.log("one here", widget);
    }else{
      const notebook = event.source.parent as NotebookPanel;
      // const activeCell = notebook.content.activeCell;
      const cell = notebook.content.activeCell as CodeCell;
      const index = notebook.content.activeCellIndex;

      widget = new DashboardWidget({
        notebook,
        cell,
        index
      });
      console.log("two", widget);
    }

    // FIXME:
    // Doesn't do the disposing on notebook close that the insertWidget function in addCommands does.

    //default width 500, default height 100
    const pos = [event.offsetX, event.offsetY, 500, 100];
    // console.log("added in ", pos);
    this.placeWidget(0, widget, pos);
    this.update();
    
    //refresh()

    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      // console.log("drop action none");
      return;
    }
  }

  handleEvent(event: Event): void {
    switch (event.type) {
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
    const dashboardArea = new DashboardArea({
      outputTracker: options.outputTracker,
      layout: new DashboardLayout({})
    });
    super({
      ...options,
      content: options.content !== undefined ? options.content : dashboardArea
    });
    this._name = options.name || 'Unnamed Dashboard';
    this.id = `JupyterDashboard-${UUID.uuid4()}`;
    this.title.label = this._name;
    this.title.icon = Icons.blueDashboard;
    // Add caption?

    this.addClass(DASHBOARD_CLASS);
    this.node.setAttribute('style', 'overflow:auto');

    // Adds save button to dashboard toolbar
    this.toolbar.addItem('save', createSaveButton(this, options.panel));
  }

  /**
   * The name of the Dashboard.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Adds a DashboardWidget to a specific position on the dashboard.
   * Inserting at index -1 places the widget at the end of the dashboard.
   */
  insertWidget(index: number, widget: DashboardWidget): void {
    (this.content as DashboardArea).placeWidget(index, widget, [
      0,
      0,
      500,
      100
    ]);
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
