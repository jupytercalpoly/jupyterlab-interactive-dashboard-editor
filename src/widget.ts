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

// import { Widget } from '@lumino/widgets';

import { shouldStartDrag } from './widgetdragutils';

import { DashboardArea } from './dashboard';

import { getNotebookId, getCellId } from './utils';

// HTML element classes

const DASHBOARD_WIDGET_CLASS = 'pr-DashboardWidget';

/**
 * The mimetype used for DashboardWidget.
 */
const DASHBOARD_WIDGET_MIME = 'pr-DashboardWidgetMine';

/**
 * Widget to wrap delete/move/etc functionality of widgets in a dashboard (future).
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

    if (options.placeholder) {
      this.node.style.background = 'red';
      if (options.cellId === undefined) {
        console.warn('DashboardWidget has no cell or cellId');
      }
      this._cellId = options.cellId;
    } else {
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

      // Might have weird interactions where options.cellId !== actual cellId
      this._cellId =
        options.cellId !== undefined ? options.cellId : getCellId(options.cell);
    }

    // Might have weird interactions where options.notebookId !== actual notebookId
    this._notebookId =
      options.notebookId !== undefined
        ? options.notebookId
        : getNotebookId(options.notebook);

    const resizer = document.createElement('div');
    resizer.classList.add('pr-Resizer');

    this.node.appendChild(resizer);
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

    if ((target as HTMLElement).classList.contains('pr-Resizer')) {
      this._mouseMode = 'resize';
    } else {
      this._mouseMode = 'drag';
    }

    const cell = this.cell;

    this._clickData = {
      pressX: event.clientX,
      pressY: event.clientY,
      cell,
      pressWidth: parseInt(this.node.style.width, 10),
      pressHeight: parseInt(this.node.style.height, 10),
      target: this.node.cloneNode(true) as HTMLElement,
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

    if (
      data &&
      shouldStartDrag(data.pressX, data.pressY, event.clientX, event.clientY)
    ) {
      void this._startDrag(data.target, event.clientX, event.clientY);
    }
  }

  private _resizeMouseMove(event: MouseEvent): void {
    const { pressX, pressY, pressWidth, pressHeight } = this._clickData;

    // const newWidth = Math.round((pressWidth + (event.clientX - pressX)) / 100) * 100;
    // const newHeight = Math.round((pressHeight + (event.clientY - pressY)) / 100) * 100;

    const newWidth = Math.max(pressWidth + (event.clientX - pressX), 60);
    const newHeight = Math.max(pressHeight + (event.clientY - pressY), 60);

    this.node.style.width = `${newWidth}px`;
    this.node.style.height = `${newHeight}px`;
  }

  fitContent(): void {
    // Hacky way to clamp dimensions to child widget dimensions.
    this.node.style.width = `${this.widgets[0].node.clientWidth}px`;
    this.node.style.height = `${this.widgets[0].node.clientHeight}px`;
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

    // Make drag image partially transparent.
    dragImage.style.opacity = '0.6';
    // Make original image invisible.
    this.node.style.opacity = '0';

    this._drag = new Drag({
      mimeData: new MimeData(),
      dragImage,
      proposedAction: 'move',
      supportedActions: 'copy-move',
      source: [this, this.parent],
    });

    this._drag.mimeData.setData(DASHBOARD_WIDGET_MIME, this);

    document.removeEventListener('mousemove', this, true);
    document.removeEventListener('mouseup', this, true);

    return this._drag.start(clientX, clientY).then(() => {
      if (this.isDisposed) {
        return;
      }
      // Make original image visible again.
      this.node.style.opacity = '1.0';
      this._drag = null;
      this._clickData = null;
    });
  }

  private _evtMouseUp(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    switch (this._mouseMode) {
      case 'resize': {
        if (this.parent === undefined || this.parent === null) {
          return;
        }
        const pos = {
          left: parseInt(this.node.style.left, 10),
          top: parseInt(this.node.style.top, 10),
          width: parseInt(this.node.style.width, 10),
          height: parseInt(this.node.style.height, 10),
        };
        // FIXME: There has to be a better solution than this!
        (this.parent as DashboardArea).updateWidget(this, pos);
        (this.parent as DashboardArea).updateInfoFromWidget(this);
        break;
      }
      default:
        break;
    }

    this._mouseMode = 'none';

    window.removeEventListener('mouseup', this);

    window.removeEventListener('mousemove', this);
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
  private _clickData: {
    pressX: number;
    pressY: number;
    pressWidth: number;
    pressHeight: number;
    target: HTMLElement;
    cell: CodeCell;
  } | null = null;
  private _drag: Drag | null = null;
  private _mouseMode: DashboardWidget.MouseMode = 'none';
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

    /**
     * Whether the widget is a placeholder for a missing cell.
     */
    placeholder?: boolean;

    /**
     * An optional cell id used for placeholder widgets.
     */
    cellId?: string;

    /**
     * An optional notebook id used for placeholder widgets.
     */
    notebookId?: string;
  }

  export type MouseMode = 'drag' | 'resize' | 'none';
}

export default DashboardWidget;
