import {
  NotebookPanel,
  // , Notebook
} from '@jupyterlab/notebook';

import {
  CodeCell,
  // , ICodeCellModel
} from '@jupyterlab/cells';

import { Panel } from '@lumino/widgets';

import { UUID, MimeData } from '@lumino/coreutils';

import { ArrayExt } from '@lumino/algorithm';

import { Message } from '@lumino/messaging';

import { Drag } from '@lumino/dragdrop';

import { shouldStartDrag } from './widgetdragutils';

// HTML element classes

const DASHBOARD_WIDGET_CLASS = 'pr-DashboardWidget';

/**
 * The mimetype used for DashboardWidget.
 */
const DASHBOARD_WIDGET_MIME = 'pr-DashboardWidgetMine';

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
    this.id = DashboardWidget.createDashboardWidgetId();
    this.addClass(DASHBOARD_WIDGET_CLASS);
    // Makes widget focusable for WidgetTracker
    this.node.setAttribute('tabindex', '-1');
    this._cellId = 'dummy';
    this._notebookId = 'dummy2';

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
   * The cell the widget is generated from.
   */
  get cell(): CodeCell {
    return this._cell;
  }

  /**
   * The notebook the widget is generated from.
   */
  get notebook(): NotebookPanel {
    return this._notebook;
  }

  /**
   * The index of the cell in the notebook.
   */
  get index(): number {
    return this._cell
      ? ArrayExt.findFirstIndex(
          this._notebook.content.widgets,
          (c) => c === this._cell
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
    this.node.removeEventListener('lm-drop', this);
    this.node.removeEventListener('mousedown', this);
  }

  handleEvent(event: Event): void {
    switch (event.type) {
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

  /**
   * Handle `mousedown` events for the widget.
   */
  private _evtMouseDown(event: MouseEvent): void {
    const { button, shiftKey } = event;

    // We only handle main or secondary button actions.
    if (
      !(button === 0 || button === 2) ||
      // Shift right-click gives the browser default behavior.
      (shiftKey && button === 2)
    ) {
      return;
    }

    const cell = this.cell;

    this._dragData = {
      pressX: event.clientX,
      pressY: event.clientY,
      cell,
      target: this.node.cloneNode(true) as HTMLElement,
    };
    // event.stopPropagation();
    // event.preventDefault();

    this.node.addEventListener('mouseup', this);
    this.node.addEventListener('mousemove', this);
    event.preventDefault();
  }

  /**
   * Handle `mousemove` event of widget
   */
  private _evtMouseMove(event: MouseEvent): void {
    // event.stopPropagation();
    // event.preventDefault();
    const data = this._dragData;
    if (
      data &&
      shouldStartDrag(data.pressX, data.pressY, event.clientX, event.clientY)
    ) {
      void this._startDrag(data.target, event.clientX, event.clientY);
    }
  }

  /**
   * Start a drag event
   */
  private _startDrag(
    target: HTMLElement,
    clientX: number,
    clientY: number
  ): Promise<void> {
    const dragImage = target;

    this._drag = new Drag({
      mimeData: new MimeData(),
      dragImage,
      proposedAction: 'move',
      supportedActions: 'copy-move',
      source: this,
    });

    this._drag.mimeData.setData(DASHBOARD_WIDGET_MIME, this);

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
    event.stopPropagation();
    event.preventDefault();

    this.node.removeEventListener('mouseup', this);
    this.node.removeEventListener('mousemove', this);
  }

  get cellId(): string {
    return this._cellId;
  }

  get notebookId(): string {
    return this._notebookId;
  }

  static createDashboardWidgetId(): string {
    return `DashboardWidget-${UUID.uuid4()}`;
  }

  private _notebook: NotebookPanel;
  private _index: number;
  private _cell: CodeCell | null = null;
  private _dragData: {
    pressX: number;
    pressY: number;
    target: HTMLElement;
    cell: CodeCell;
  } | null = null;
  private _drag: Drag | null = null;
  private _cellId: string;
  private _notebookId: string;
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