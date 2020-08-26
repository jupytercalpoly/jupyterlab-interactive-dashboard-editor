import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';

import { CodeCell, MarkdownCell } from '@jupyterlab/cells';

import { Widget } from '@lumino/widgets';

import { UUID, MimeData } from '@lumino/coreutils';

import { ArrayExt } from '@lumino/algorithm';

import { Message } from '@lumino/messaging';

import { Drag } from './drag';

import { shouldStartDrag } from './widgetdragutils';

import { Dashboard } from './dashboard';

import {
  getNotebookId,
  getCellId,
  getNotebookById,
  getCellById,
} from './utils';

import { Signal, ISignal } from '@lumino/signaling';

import { DashboardIcons } from './icons';

import { Widgetstore, WidgetPosition } from './widgetstore';
import { DashboardLayout } from './custom_layout';

// HTML element classes

const DASHBOARD_WIDGET_CLASS = 'pr-DashboardWidget';

const DASHBOARD_WIDGET_MIME = 'pr-DashboardWidgetMine';

const DASHBOARD_WIDGET_CHILD_CLASS = 'pr-DashboardWidgetChild';

const EDITABLE_WIDGET_CLASS = 'pr-EditableWidget';

const IN_DRAG_CLASS = 'pr-InDrag';

/**
 * Widget to wrap delete/move/etc functionality of widgets in a dashboard (future).
 */
export class DashboardWidget extends Widget {
  constructor(options: DashboardWidget.IOptions) {
    super();

    const { notebook, cell, cellId, notebookId, fit } = options;

    this._notebook = notebook || null;
    this._cell = cell || null;
    this.id = DashboardWidget.createDashboardWidgetId();

    // Makes widget focusable.
    this.node.setAttribute('tabindex', '-1');

    const _cellId = getCellId(cell);
    const _notebookId = getNotebookId(notebook);

    if (_notebookId === undefined) {
      this.node.style.background = 'red';
      if (notebookId === undefined) {
        console.warn('DashboardWidget has no notebook or notebookId');
      }
      this._notebookId = notebookId;
    } else if (_cellId === undefined) {
      this.node.style.background = 'yellow';
      if (cellId === undefined) {
        console.warn('DashboardWidget has no cell or cellId');
      }
      this._cellId = cellId;
    } else {
      if (notebookId && _notebookId !== notebookId) {
        console.warn(`DashboardWidget notebookId ('${notebookId}') and id of
                      notebook ('${_notebookId}') don't match. 
                      Using ${_notebookId}.`);
      }
      if (cellId && _cellId !== cellId) {
        console.warn(`DashboardWidget cellId ('${cellId}') and id of cell
                      ('${_cellId}') don't match. Using ${_cellId}.`);
      }

      this._cellId = _cellId;
      this._notebookId = _notebookId;

      void this._notebook.context.ready.then(() => {
        let clone: Widget;
        const cellType = cell.model.type;

        switch (cellType) {
          case 'markdown':
            clone = (cell as MarkdownCell).clone().editorWidget.parent;
            break;
          case 'code':
            clone = (cell as CodeCell).cloneOutputArea();
            break;
          default:
            throw new Error('Cell is not a code or markdown cell.');
        }

        // Make widget invisible until it's properly loaded/sized.
        this.node.style.opacity = '0';

        const container = document.createElement('div');
        container.classList.add(DASHBOARD_WIDGET_CHILD_CLASS);
        container.appendChild(clone.node);
        this.node.appendChild(container);
        this._content = clone;

        const done = (): void => {
          if (fit) {
            this.fitContent();
          }
          // Make widget visible again.
          this.node.style.opacity = null;
          // Emit the ready signal.
          this._ready.emit(undefined);
        };

        // Wait a moment then fit content. This allows all components to load
        // and for their width/height to adjust before fitting.
        setTimeout(done.bind(this), 2);
      });
    }

    const resizer = DashboardWidget.createResizer();
    this.node.appendChild(resizer);

    this.addClass(DASHBOARD_WIDGET_CLASS);
    this.addClass(EDITABLE_WIDGET_CLASS);
  }

  /**
   * Create click listeners on attach
   */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('click', this);
    this.node.addEventListener('contextmenu', this);
    this.node.addEventListener('mousedown', this);
    this.node.addEventListener('dblclick', this);
    this.node.addEventListener('keydown', this);
  }

  /**
   * Remove click listeners on detach
   */
  onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.node.removeEventListener('click', this);
    this.node.removeEventListener('contextmenu', this);
    this.node.removeEventListener('mousedown', this);
    this.node.removeEventListener('dblclick', this);
    this.node.removeEventListener('keydown', this);
  }

  handleEvent(event: Event): void {
    // Just do the default behavior in present mode.
    if (this._mode === 'present') {
      return;
    }

    switch (event.type) {
      case 'keydown':
        this._evtKeyDown(event as KeyboardEvent);
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
        break;
      case 'dblclick':
        this._evtDblClick(event as MouseEvent);
        break;
    }
  }

  /**
   * Handle the `'keydown'` event for the widget.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const pos = this.pos;
    const oldPos = { ...pos };

    const bumpDistance = event.altKey ? 1 : DashboardWidget.BUMP_DISTANCE;

    switch (event.keyCode) {
      // Left arrow key
      case 37:
        pos.left -= bumpDistance;
        break;
      // Up arrow key
      case 38:
        pos.top -= bumpDistance;
        break;
      // Right arrow key
      case 39:
        pos.left += bumpDistance;
        break;
      // Down arrow key
      case 40:
        pos.top += bumpDistance;
        break;
    }

    if (pos !== oldPos) {
      (this.parent as Dashboard).updateWidget(this, pos);
    }
  }

  /**
   * Handle the `'dblclick'` event for the widget.
   */
  private _evtDblClick(event: MouseEvent): void {
    // Do nothing if it's not a left mouse press.
    if (event.button !== 0) {
      return;
    }

    // Do nothing if any modifier keys are pressed.
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
      return;
    }

    // Stop the event propagation.
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle `mousedown` events for the widget.
   */
  private _evtMouseDown(event: MouseEvent): void {
    const { button, shiftKey, target } = event;

    // We only handle main or secondary button actions.
    if (
      !(button === 0 || button === 2) ||
      // Shift right-click gives the browser default behavior.
      (shiftKey && button === 2)
    ) {
      return;
    }

    event.preventDefault();

    window.addEventListener('mouseup', this);
    window.addEventListener('mousemove', this);

    this.node.style.opacity = '0.6';

    // Set mode to resize if the mousedown happened on a resizer.
    if ((target as HTMLElement).classList.contains('pr-Resizer')) {
      this._mouseMode = 'resize';
    } else {
      this._mouseMode = 'drag';
    }

    const cell = this.cell;

    const rect = this.node.getBoundingClientRect();

    this._clickData = {
      pressX: event.clientX,
      pressY: event.clientY,
      cell,
      pressWidth: parseInt(this.node.style.width, 10),
      pressHeight: parseInt(this.node.style.height, 10),
      target: this.node.cloneNode(true) as HTMLElement,
      widgetX: rect.left,
      widgetY: rect.top,
    };
  }

  /**
   * Handle `mousemove` event of widget
   */
  private _evtMouseMove(event: MouseEvent): void {
    switch (this._mouseMode) {
      case 'drag':
        this._dragMouseMove(event);
        break;
      case 'resize':
        this._resizeMouseMove(event);
        break;
      default:
        break;
    }
  }

  private _dragMouseMove(event: MouseEvent): void {
    const data = this._clickData;
    const { clientX, clientY } = event;

    if (data && shouldStartDrag(data.pressX, data.pressY, clientX, clientY)) {
      void this._startDrag(data.target, clientX, clientY);
    }
  }

  private _resizeMouseMove(event: MouseEvent): void {
    const { pressX, pressY, pressWidth, pressHeight } = this._clickData;

    const deltaX = event.clientX - pressX;
    const deltaY = event.clientY - pressY;

    const width = Math.max(pressWidth + deltaX, DashboardWidget.MIN_WIDTH);
    const height = Math.max(pressHeight + deltaY, DashboardWidget.MIN_HEIGHT);

    this.node.style.width = `${width}px`;
    this.node.style.height = `${height}px`;

    if (this.mode === 'grid') {
      (this.parent.layout as DashboardLayout).drawDropZone(this.pos);
    }
    if (this.mode !== 'grid' && this._fitToContent && !event.altKey) {
      this.fitContent();
    }
  }

  /**
   * Fit widget width/height to the width/height of the underlying content.
   */
  fitContent(): void {
    const element = this._content.node;
    // Pixels are added to prevent weird wrapping issues. Kind of a hack.
    this.node.style.width = `${element.clientWidth + 3}px`;
    this.node.style.height = `${element.clientHeight + 2}px`;
  }

  containsPoint(left: number, top: number): boolean {
    const pos = {
      left,
      top,
      width: 0,
      height: 0,
    };
    const overlap = this.overlaps(pos);
    return overlap.type !== 'none';
  }

  overlaps(_pos: Widgetstore.WidgetPosition): DashboardWidget.Overlap {
    const { left, top, width, height } = _pos;
    const pos = this.pos;
    const w = 0.5 * (width + pos.width);
    const h = 0.5 * (height + pos.height);
    const dx = left + 0.5 * width - (pos.left + 0.5 * pos.width);
    const dy = top + 0.5 * height - (pos.top + 0.5 * pos.height);
    let type: DashboardWidget.Direction = 'none';

    if (Math.abs(dx) < w && Math.abs(dy) < h) {
      if (top > pos.top + pos.height / 2) {
        type = 'up';
      } else {
        type = 'down';
      }
    }

    return { type, widget: this };
  }

  /**
   * Start a drag event
   */
  private _startDrag(
    target: HTMLElement,
    clientX: number,
    clientY: number
  ): Promise<void> {
    // const elems = document.elementsFromPoint()
    // each(elems, (elem) => {
    //   (elem as HTMLElement).style.pointerEvents = 'none';
    // });

    const dragImage = target;
    dragImage.style.opacity = '0.6';

    this.node.style.opacity = '0';
    this.node.style.pointerEvents = 'none';

    this._drag = new Drag({
      mimeData: new MimeData(),
      dragImage,
      proposedAction: 'move',
      supportedActions: 'copy-move',
      source: this,
      widgetX: this._clickData.widgetX,
      widgetY: this._clickData.widgetY,
    });

    this._drag.mimeData.setData(DASHBOARD_WIDGET_MIME, this);

    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);

    return this._drag.start(clientX, clientY).then(() => {
      if (this.isDisposed) {
        return;
      }
      this.node.style.opacity = null;
      this.node.style.pointerEvents = 'auto';
      this.removeClass(IN_DRAG_CLASS);
      this._drag = null;
      this._clickData = null;
    });
  }

  private _evtMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.node.style.opacity = null;

    if (this._mouseMode === 'resize' && this.parent !== undefined) {
      const pos = this.pos;
      (this.parent as Dashboard).updateWidget(this, pos);
    }

    this._mouseMode = 'none';
    (this.parent.layout as DashboardLayout).clearCanvas();
    window.removeEventListener('mouseup', this);
    window.removeEventListener('mousemove', this);
  }

  /**
   * The widget's position on its dashboard.
   */
  get pos(): WidgetPosition {
    return {
      left: parseInt(this.node.style.left, 10),
      top: parseInt(this.node.style.top, 10),
      width: parseInt(this.node.style.width, 10),
      height: parseInt(this.node.style.height, 10),
    };
  }
  set pos(newPos: WidgetPosition) {
    const style = this.node.style;
    for (const [key, value] of Object.entries(newPos)) {
      if (value !== undefined) {
        style.setProperty(key, `${value}px`);
      }
    }
  }

  /**
   * Information sufficient to reconstruct the widget.
   */
  get info(): Widgetstore.WidgetInfo {
    const pos = this.pos;
    return {
      pos,
      widgetId: this.id,
      cellId: this.cellId,
      notebookId: this.notebookId,
      removed: false,
    };
  }

  /**
   * The id of the cell the widget is generated from.
   */
  get cellId(): string {
    return this._cellId || getCellId(this._cell);
  }

  /**
   * The id of the notebook the widget is generated from.
   */
  get notebookId(): string {
    return this._notebookId || getNotebookId(this._notebook);
  }

  /**
   * Whether to constrain widget dimensions to the underlying content.
   */
  get fitToContent(): boolean {
    return this._fitToContent;
  }
  set fitToContent(newState: boolean) {
    this._fitToContent = newState;
  }

  /**
   * The cell the widget is generated from.
   */
  get cell(): CodeCell | MarkdownCell {
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
   * The widget's display mode.
   */
  get mode(): Dashboard.Mode {
    return this._mode;
  }
  set mode(newMode: Dashboard.Mode) {
    this._mode = newMode;
    if (newMode === 'present') {
      this.removeClass(EDITABLE_WIDGET_CLASS);
    } else {
      this.addClass(EDITABLE_WIDGET_CLASS);
    }
    if (newMode === 'grid') {
      if (this.parent) {
        (this.parent as Dashboard).updateWidget(this, this.pos);
      }
    }
  }

  /**
   * A signal emitted once the widget's content is added.
   */
  get ready(): ISignal<this, void> {
    return this._ready;
  }

  get locked(): boolean {
    return this._locked;
  }
  set locked(newState: boolean) {
    this._locked = newState;
  }

  private _notebook: NotebookPanel;
  private _notebookId: string;
  private _index: number;
  private _cell: CodeCell | MarkdownCell | null = null;
  private _cellId: string;
  private _ready = new Signal<this, void>(this);
  private _fitToContent = true;
  private _mouseMode: DashboardWidget.MouseMode = 'none';
  private _mode: Dashboard.Mode = 'edit';
  private _drag: Drag | null = null;
  private _clickData: {
    pressX: number;
    pressY: number;
    pressWidth: number;
    pressHeight: number;
    target: HTMLElement;
    cell: CodeCell | MarkdownCell;
    widgetX: number;
    widgetY: number;
  } | null = null;
  private _locked = false;
  private _content: Widget;
}

/**
 * Namespace for DashboardWidget options and constants.
 */
export namespace DashboardWidget {
  export interface IOptions {
    /**
     * The notebook associated with the cloned output area.
     */
    notebook: NotebookPanel;

    /**
     * The cell for which to clone the output area.
     */
    cell?: CodeCell | MarkdownCell;

    /**
     * If the cell is not available, provide the index
     * of the cell for when the notebook is loaded.
     */
    index?: number;

    /**
     * An optional cell id used for placeholder widgets.
     */
    cellId?: string;

    /**
     * An optional notebook id used for placeholder widgets.
     */
    notebookId?: string;

    /**
     * Whether to fit the widget to content when created.
     */
    fit?: boolean;
  }

  export type Direction = 'left' | 'right' | 'up' | 'down' | 'none';

  export type Overlap = {
    widget: DashboardWidget;
    type: Direction;
  };

  export function createDashboardWidgetId(): string {
    return `DashboardWidget-${UUID.uuid4()}`;
  }

  export function createResizer(): HTMLElement {
    const resizer = document.createElement('div');
    resizer.classList.add('pr-Resizer');
    DashboardIcons.resizer2.element({
      container: resizer,
      width: '15px',
      height: '15px',
      pointerEvents: 'none',
    });

    return resizer;
  }

  export function createWidget(
    options: Widgetstore.WidgetInfo,
    notebookTracker: INotebookTracker,
    fit = false
  ): DashboardWidget {
    const { notebookId, cellId, pos, widgetId } = options;

    const notebook = getNotebookById(notebookId, notebookTracker);

    let cell: CodeCell | MarkdownCell | undefined;
    const _cell = getCellById(cellId, notebookTracker);

    if (_cell === undefined) {
      cell = undefined;
    } else if (_cell.model.type === 'code') {
      cell = _cell as CodeCell;
    } else if (_cell.model.type === 'markdown') {
      cell = _cell as MarkdownCell;
    } else {
      throw new Error('cell is not a code or markdown cell');
    }

    const widget = new DashboardWidget({
      notebookId,
      cellId,
      notebook,
      cell,
      fit,
    });

    widget.pos = pos;
    widget.id = widgetId;

    return widget;
  }

  export type MouseMode = 'drag' | 'resize' | 'none';

  /**
   * Default width of added widgets.
   */
  export const DEFAULT_WIDTH = 500;

  /**
   * Default height of added widgets.
   */
  export const DEFAULT_HEIGHT = 500;

  /**
   * Minimum width of added widgets.
   */
  export const MIN_WIDTH = 10;

  /**
   * Minimum height of added widgets.
   */
  export const MIN_HEIGHT = 10;

  /**
   * How many pixels to adjust a widget by using the arrow keys.
   */
  export const BUMP_DISTANCE = 10;
}

export default DashboardWidget;
