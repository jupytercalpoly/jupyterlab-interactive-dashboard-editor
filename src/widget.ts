import {
  NotebookPanel
  // , Notebook
} from '@jupyterlab/notebook';

import {
  CodeCell
  // , ICodeCellModel
} from '@jupyterlab/cells';

import { Panel } from '@lumino/widgets';

import { UUID, MimeData } from '@lumino/coreutils';

import { ArrayExt, toArray } from '@lumino/algorithm';

import { Message } from '@lumino/messaging';

import { IDragEvent, Drag } from '@lumino/dragdrop';

// Circular import
import { DashboardArea } from './dashboard';

import { shouldStartDrag } from './widgetdragutils';

// import * as nbformat from '@jupyterlab/nbformat';

// Number of pixels a widget needs to be dragged to trigger a drag event.
// const DRAG_THRESHOLD = 5;

// HTML element classes

const DASHBOARD_WIDGET_CLASS = 'pr-DashboardWidget';

const DROP_TOP_CLASS = 'pr-DropTop';

const DROP_BOTTOM_CLASS = 'pr-DropBottom';

/**
 * The mimetype used for DashboardWidget.
 */
const DASHBOARD_WIDGET_MIME = 'pr-DashboardWidgetMine';
// const JUPYTER_CELL_MIME  = 'application/vnd.jupyter.cells';

/**
 * Widget to wrap delete/move/etc functionality of widgets in a dashboard (future).
 * Currently just a slight modification of ClonedOutpuArea.
 * jupyterlab/packages/notebook-extension/src/index.ts
 */
export class DashboardWidget extends Panel {
  /**
   * The left, top, width and height relative to
   * the top left of dashboard.
   */
  _pos: number[];

  constructor(options: DashboardWidget.IOptions) {
    super();
    this._notebook = options.notebook;
    this._index = options.index !== undefined ? options.index : -1;
    this._cell = options.cell || null;
    this.id = `DashboardWidget-${UUID.uuid4()}`;
    this.addClass(DASHBOARD_WIDGET_CLASS);
    // Makes widget focusable for WidgetTracker
    this.node.setAttribute('tabindex', '-1');
    // Make widget draggable
    this.node.setAttribute('draggable', 'true');

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
   * Get the position of widget relative to the
   * top left of dashboard.
   */
  public get pos(): number[] {
    return this._pos;
  }

  /**
   * Set the position of widget relative to the
   * top left of dashboard.
   */
  public set pos(newPos: number[]) {
    this._pos = newPos;
  }

  /**
   * The index of the cell in the notebook.
   */
  get cell(): CodeCell {
    return this._cell;
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
    this.node.addEventListener('lm-dragenter', this);
    this.node.addEventListener('lm-dragleave', this);
    this.node.addEventListener('lm-dragover', this);
    this.node.addEventListener('lm-drop', this);
    this.node.addEventListener('mousedown', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('contextmenu', this);
    this.node.removeEventListener('lm-dragenter', this);
    this.node.removeEventListener('lm-dragleave', this);
    this.node.removeEventListener('lm-dragover', this);
    this.node.removeEventListener('lm-drop', this);
    this.node.removeEventListener('mousedown', this);
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
      case 'mousedown':
        this._evtMouseDown(event as MouseEvent);
        break;
      case 'mouseup':
        this._evtMouseUp(event as MouseEvent);
        break;
      case 'mousemove':
        this._evtMouseMove(event as MouseEvent);
        break;
      case 'click':
      case 'contextmenu':
        // Focuses on clicked output and blurs all others
        // Is there a more efficient way to blur other outputs?
        Array.from(document.getElementsByClassName(DASHBOARD_WIDGET_CLASS)).map(
          blur
        );
        this.node.focus();
    }
  }

  private _evtDragEnter(event: IDragEvent): void {
    event.stopPropagation();
    event.preventDefault();
  }

  private _evtDragLeave(event: IDragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.removeClass(DROP_BOTTOM_CLASS);
    this.removeClass(DROP_TOP_CLASS);
  }

  private _evtDragOver(event: IDragEvent): void {
    event.stopPropagation();
    event.preventDefault();
    event.dropAction = 'copy';
    if (event.offsetY > this.node.offsetHeight / 2) {
      this.removeClass(DROP_TOP_CLASS);
      this.addClass(DROP_BOTTOM_CLASS);
    } else {
      this.removeClass(DROP_BOTTOM_CLASS);
      this.addClass(DROP_TOP_CLASS);
    }
  }

  private _evtDrop(event: IDragEvent): void {
    event.stopPropagation();
    event.preventDefault();

    // Get the index of this widget in its parent's array.
    let insertIndex = toArray(this.parent.children()).indexOf(this);

    // Something went wrong.
    if (insertIndex === -1) {
      return;
    }

    // Modify the insert index depending on if the drop area is closer to the
    // bottom of this widget.
    if (this.hasClass(DROP_TOP_CLASS)) {
      this.removeClass(DROP_TOP_CLASS);
    } else {
      this.removeClass(DROP_BOTTOM_CLASS);
      insertIndex++;
    }

    const notebook = event.source.parent as NotebookPanel;
    const cell = notebook.content.activeCell as CodeCell;
    const index = notebook.content.activeCellIndex;

    // Create the DashboardWidget.
    const widget = new DashboardWidget({
      notebook,
      cell,
      index
    });

    const pos = [event.offsetX, event.offsetY, 500, 100];
    // Insert the new DashboardWidget next to this widget.
    (this.parent as DashboardArea).placeWidget(insertIndex, widget, pos);
    this.parent.update();
  }

  /**
   * Handle `mousedown` events for the widget.
   */
  private _evtMouseDown(event: MouseEvent): void {
    console.log('mouse down!');
    const { button, shiftKey } = event;

    // We only handle main or secondary button actions.
    if (
      !(button === 0 || button === 2) ||
      // Shift right-click gives the browser default behavior.
      (shiftKey && button === 2)
    ) {
      return;
    }

    console.log('event', event);
    console.log('target', event.target);
    const target = event.target as HTMLElement;
    const cell = this.cell;

    this._dragData = {
      pressX: event.clientX,
      pressY: event.clientY,
      cell: cell,
      target: target
    };
    // event.stopPropagation();
    // event.preventDefault();

    this.node.addEventListener('mouseup', this);
    this.node.addEventListener('mousemove', this);
    // this._pressX = event.clientX;
    // this._pressY = event.clientY;
    event.preventDefault();
  }

  /**
   * Handle `mousemove` event of widget
   */
  private _evtMouseMove(event: MouseEvent): void {
    console.log('mouse move!');
    // event.stopPropagation();
    // event.preventDefault();
    const data = this._dragData;
    if (
      data &&
      shouldStartDrag(data.pressX, data.pressY, event.clientX, event.clientY)
    ) {
      void this._startDrag(
        data.cell,
        data.target,
        event.clientX,
        event.clientY
      );
    }

    // const dx = Math.abs(event.clientX - this._pressX);
    // const dy = Math.abs(event.clientY - this._pressY);

    // if (dx >= DRAG_THRESHOLD || dy >= DRAG_THRESHOLD) {
    //   this.node.removeEventListener('mouseup', this);
    //   this.node.removeEventListener('mousemove', this);
    //   //TODO: Initiate lumino drag!
    //   console.log('drag started!');
    // }
  }

  /**
   * Start a drag event
   */
  private _startDrag(
    cell: CodeCell,
    target: HTMLElement,
    clientX: number,
    clientY: number
  ): Promise<void> {
    console.log('start drag!');
    // const cellModel = cell.model as ICodeCellModel;
    // const selected: nbformat.ICell[] = [cellModel.toJSON()];

    const dragImage = target;

    this._drag = new Drag({
      mimeData: new MimeData(),
      dragImage,
      proposedAction: 'copy',
      supportedActions: 'copy',
      source: this
    });

    // this._drag.mimeData.setData

    this._drag.mimeData.setData(DASHBOARD_WIDGET_MIME, this);
    // const textContent = cellModel.value.text;
    // this._drag.mimeData.setData('text/plain', textContent);

    // this._focusedCell = null;

    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);
    return this._drag.start(clientX, clientY).then(() => {
      if (this.isDisposed) {
        return;
      }
      this._drag = null;
      this._dragData = null;
    });
  }

  private _evtMouseUp(event: MouseEvent): void {
    console.log('mouse up!');
    event.stopPropagation();
    event.preventDefault();

    this.node.removeEventListener('mouseup', this);
    this.node.removeEventListener('mousemove', this);
  }

  private _notebook: NotebookPanel;
  private _index: number;
  private _cell: CodeCell | null = null;
  // private _pressX: number;
  // private _pressY: number;
  private _dragData: {
    pressX: number;
    pressY: number;
    target: HTMLElement;
    cell: CodeCell;
    // index: number;
  } | null = null;
  private _drag: Drag | null = null;
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

export default DashboardWidget;
