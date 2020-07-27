import { filter, IIterator, each } from '@lumino/algorithm';

import { Litestore } from './litestore';

import { Datastore, Fields, Record } from '@lumino/datastore';

import { DashboardWidget } from './widget';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Cell, CodeCell } from '@jupyterlab/cells';

import { getNotebookById, getCellById, getPathFromNotebookId } from './utils';

import { DashboardSpec, WidgetInfo, DASHBOARD_VERSION } from './file';

/**
 * Alias for widget schema type.
 */
export type WidgetSchema = Widgetstore.WidgetSchema;

/**
 * Alias for dashboard schema type.
 */
export type DashboardSchema = Widgetstore.DashboardSchema;

/**
 * Alias for widget position type.
 */
export type WidgetPosition = Widgetstore.WidgetPosition;

/**
 * A Litestore wrapper to work with DashboardWidget metadata.
 */
export class Widgetstore extends Litestore {
  /**
   * Construct a new Widgetstore.
   *
   * @param options - the options for creating the Widgetstore.
   */
  constructor(options: Widgetstore.IOptions) {
    const schemas = [Widgetstore.DASHBOARD_SCHEMA, Widgetstore.WIDGET_SCHEMA];
    super({ ...options, schemas });
    this._notebookTracker = options.notebookTracker;
    this._inBatch = false;
  }

  /**
   * Adds a dashboard widget to the widgetstore.
   *
   * @param info - the information to add to the widgetstore.
   */
  addWidget(info: Widgetstore.WidgetInfo): void {
    if (!this._inBatch) {
      this.beginTransaction();
    }

    this.updateRecord(
      {
        schema: Widgetstore.WIDGET_SCHEMA,
        record: info.widgetId,
      },
      {
        ...info,
        removed: false,
        changed: true,
      }
    );

    if (!this._inBatch) {
      this.endTransaction();
    }
  }

  /**
   * Updates the position of a widget already in the widgetstore.
   *
   * @param widget - the widget to update.
   *
   * @param pos - the new widget position.
   *
   * @returns whether the update was successful.
   *
   * ### Notes
   * The update will be unsuccesful if the widget isn't in the store or was
   * previously removed.
   */
  moveWidget(
    widget: DashboardWidget,
    pos: Widgetstore.WidgetPosition
  ): boolean {
    if (!this._inBatch) {
      this.beginTransaction();
    }

    const recordLoc = {
      schema: Widgetstore.WIDGET_SCHEMA,
      record: widget.id,
    };

    const oldRecord = this.getRecord(recordLoc);

    if (oldRecord === undefined || oldRecord.removed) {
      return false;
    }

    this.updateRecord(recordLoc, {
      ...pos,
      changed: true,
    });

    if (!this._inBatch) {
      this.endTransaction();
    }

    return true;
  }

  /**
   * Mark a widget as removed.
   *
   * @param widget - widget to delete.
   *
   * @returns whether the deletion was successful.
   */
  deleteWidget(widget: DashboardWidget): boolean {
    if (!this._inBatch) {
      this.beginTransaction();
    }

    const recordLoc = {
      schema: Widgetstore.WIDGET_SCHEMA,
      record: widget.id,
    };

    const oldRecord = this.getRecord(recordLoc);

    if (oldRecord === undefined) {
      return false;
    }

    this.updateRecord(
      {
        schema: Widgetstore.WIDGET_SCHEMA,
        record: widget.id,
      },
      {
        removed: true,
        changed: true,
      }
    );

    if (!this._inBatch) {
      this.endTransaction();
    }

    return true;
  }

  /**
   * Retrieves a dashboard widget's info.
   *
   * @param widget - Widget to retrieve info for.
   *
   * @returns the widget's info, or undefined if it's not in the store.
   */
  getWidget(widget: DashboardWidget): Widgetstore.WidgetInfo | undefined {
    const record = this.getRecord({
      schema: Widgetstore.WIDGET_SCHEMA,
      record: widget.id,
    });
    if (record === undefined) {
      return undefined;
    }
    return record as Widgetstore.WidgetInfo;
  }

  /**
   * Returns an iterator over contained widgets marked as changed.
   */
  getChangedWidgets(): IIterator<Record<WidgetSchema>> {
    const table = this.get(Widgetstore.WIDGET_SCHEMA);
    const changed = filter(table, (record) => record.changed);
    return changed;
  }

  getWidgets(): IIterator<Record<WidgetSchema>> {
    const table = this.get(Widgetstore.WIDGET_SCHEMA);
    return filter(table, (record) => true);
  }

  /**
   * Gets a cell by id using the instances' notebook tracker.
   */
  getCellById(id: string): Cell {
    return getCellById(id, this._notebookTracker);
  }

  /**
   * Gets a notebook by id using the instances' notebook tracker.
   */
  getNotebookById(id: string): NotebookPanel {
    return getNotebookById(id, this._notebookTracker);
  }

  /**
   * Creates a dashboard widget from a widgetinfo object.
   *
   * @param info - info to create widget from.
   *
   * @returns - the created widget.
   *
   * @throws - an error if a notebook or cell isn't found from the ids in the
   * widgetinfo object.
   */
  createWidget(info: Widgetstore.WidgetInfo): DashboardWidget {
    const notebook = this.getNotebookById(info.notebookId);
    if (notebook === undefined) {
      throw new Error('notebook not found');
    }
    const cell = this.getCellById(info.cellId) as CodeCell;
    if (cell === undefined) {
      throw new Error('cell not found');
    }
    const widget = new DashboardWidget({ notebook, cell });
    widget.id = info.widgetId;
    widget.node.style.left = `${info.left}px`;
    widget.node.style.top = `${info.top}px`;
    widget.node.style.width = `${info.width}px`;
    widget.node.style.height = `${info.height}px`;

    return widget;
  }

  /**
   * Starts a batch transfer. Functions modifying widgets won't start or end
   * a new transaction.
   */
  startBatch(): void {
    if (this._inBatch) {
      return;
    }
    this._inBatch = true;
    this.beginTransaction();
  }

  /**
   * Ends a batch transfer. Functions modifying widgets will start/end transactions.
   */
  endBatch(): void {
    if (!this._inBatch) {
      return;
    }
    this._inBatch = false;
    this.endTransaction();
  }

  /**
   * Saves the store to file.
   *
   * @param path - file path to save the store to.
   *
   * @throws an error if saving fails.
   */
  save(path: string): void {
    console.log('saving to', path);

    // Get all widgets that haven't been removed or un-added.
    const widgets = filter(
      this.getWidgets(),
      (widget) => widget.widgetId && !widget.removed
    );

    const file: DashboardSpec = {
      version: DASHBOARD_VERSION,
      dashboardWidth: 0,
      dashboardHeight: 0,
      paths: {},
      outputs: {},
    };

    each(widgets, (widget) => {
      // Currently just returns a dummy path.
      const widgetInfo: WidgetInfo = {
        id: widget.cellId,
        left: widget.left,
        top: widget.top,
        width: widget.width,
        height: widget.height,
      };
      const path = getPathFromNotebookId(widget.notebookId);
      file.paths[path] = widget.notebookId;
      if (file.outputs[widget.notebookId] === undefined) {
        file.outputs[widget.notebookId] = [];
      }
      file.outputs[widget.notebookId].push(widgetInfo);
    });

    console.log(file);
  }

  private _notebookTracker: INotebookTracker;
  private _inBatch: boolean;
}

export namespace Widgetstore {
  /**
   * Main schema for storing info about DashboardWidgets.
   */
  export const WIDGET_SCHEMA = {
    id: 'widgets',
    fields: {
      widgetId: Fields.String(),
      cellId: Fields.String(),
      notebookId: Fields.String(),
      top: Fields.Number(),
      left: Fields.Number(),
      width: Fields.Number(),
      height: Fields.Number(),
      // changed field is currently unused/defunct.
      changed: Fields.Boolean(),
      removed: Fields.Boolean(),
    },
  };

  /**
   * Schema for storing dashboard metadata.
   */
  export const DASHBOARD_SCHEMA = {
    id: 'dashboard',
    fields: {
      name: Fields.String(),
    },
  };

  export type WidgetSchema = typeof WIDGET_SCHEMA;

  export type DashboardSchema = typeof DASHBOARD_SCHEMA;

  export type WidgetInfo = {
    /**
     * The widget ID.
     */
    widgetId: string;

    /**
     * The cell ID the widget is created from.
     */
    cellId: string;

    /**
     * The notebook ID the widget is created from.
     */
    notebookId: string;

    /**
     * The top edge position of the widget.
     */
    top: number;

    /**
     * The left edge position of the widget.
     */
    left: number;

    /**
     * The width of the widget.
     */
    width: number;

    /**
     * The height of the widget.
     */
    height: number;

    /**
     * Whether the widget has been changed since last read.
     */
    changed?: boolean;

    /**
     * Whether the widget has been removed.
     */
    removed?: boolean;
  };

  export type WidgetPosition = {
    /**
     * Left edge of the widget.
     */
    left: number;

    /**
     * Top edge of the widget.
     */
    top: number;

    /**
     * Width of the widget.
     */
    width: number;

    /**
     * Height of the widget.
     */
    height: number;
  };

  /**
   * An options object for initializing a widgetstore.
   */
  export interface IOptions {
    /**
     * The unique id of the widgetstore.
     */
    id: number;

    /**
     * Initialize the state to a previously serialized one.
     */
    restoreState?: string;

    /**
     * An optional transaction id factory to override the default.
     */
    transactionIdFactory?: Datastore.TransactionIdFactory;

    /**
     * The notbook tracker used by Jupyterlab.
     */
    notebookTracker: INotebookTracker;
  }

  /**
   * Default width of added widgets.
   */
  export const DEFAULT_WIDTH = 500;

  /**
   * Default height of added widgets.
   */
  export const DEFAULT_HEIGHT = 100;
}
