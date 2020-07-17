import { filter, each, IIterator, ArrayExt, toArray } from '@lumino/algorithm';

import { Litestore } from './litestore';

import { Datastore, Fields, Record } from '@lumino/datastore';

import { Widget } from '@lumino/widgets';

import { DashboardWidget } from './widget';

import { NotebookPanel, INotebookTracker } from '@jupyterlab/notebook';

import { UUID } from '@lumino/coreutils';

import { Cell } from '@jupyterlab/cells';

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
  }

  updateWidgetPos(widget: DashboardWidget): void {
    const loc = this._getWidgetLocation(widget);

    this.beginTransaction();

    this.updateRecord(
      {
        schema: Widgetstore.WIDGET_SCHEMA,
        record: widget.id,
      },
      {
        cellId: widget.cellId,
        notebookId: widget.notebookId,
        ...loc,
        removed: false,
        changed: true,
      }
    );

    this.endTransaction();
  }

  deleteWidget(widget: DashboardWidget): void {
    this.beginTransaction();

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

    this.endTransaction();
  }

  getWidgetInfo(
    widget: DashboardWidget
  ): Record.Value<WidgetSchema> | undefined {
    const record = this.getRecord({
      schema: Widgetstore.WIDGET_SCHEMA,
      record: widget.id,
    });
    if (record === undefined) {
      return undefined;
    }
    return record;
  }

  getChangedWidgets(): IIterator<Record<WidgetSchema>> {
    const table = this.get(Widgetstore.WIDGET_SCHEMA);
    const changed = filter(table, (record) => record.changed);
    return changed;
  }

  markAllAsUnchanged(): void {
    const changedRecords = this.getChangedWidgets();

    this.beginTransaction();

    each(changedRecords, (record) =>
      this.updateRecord(
        {
          schema: Widgetstore.WIDGET_SCHEMA,
          record: record.$id,
        },
        {
          ...record,
          changed: false,
        }
      )
    );

    this.endTransaction();
  }

  private _getWidgetLocation(widget: Widget): WidgetPosition {
    const left = widget.node.offsetLeft;
    const top = widget.node.offsetTop;
    const width = widget.node.offsetWidth;
    const height = widget.node.offsetHeight;

    return {
      left,
      top,
      width,
      height,
    };
  }

  static addNotebookId(notebook: NotebookPanel): string {
    const metadata: any | undefined = notebook.model.metadata.get('presto');
    let id: string;

    if (metadata !== undefined) {
      if (metadata.id !== undefined) {
        return metadata.id;
      }
      id = UUID.uuid4();
      notebook.model.metadata.set('presto', { ...metadata, id });
    } else {
      id = UUID.uuid4();
      notebook.model.metadata.set('presto', { id });
    }

    return id;
  }

  static getNotebookId(notebook: NotebookPanel): string | undefined {
    const metadata: any | undefined = notebook.model.metadata.get('presto');
    if (metadata === undefined || metadata.id === undefined) {
      return undefined;
    }
    return metadata.id;
  }

  static getNotebookById(
    id: string,
    tracker: INotebookTracker
  ): NotebookPanel | undefined {
    return tracker.find(
      (notebook) => Widgetstore.getNotebookId(notebook) === id
    );
  }

  static addCellId(cell: Cell): string {
    const metadata: any | undefined = cell.model.metadata.get('presto');
    let id: string;

    if (metadata !== undefined) {
      if (metadata.id !== undefined) {
        return metadata.id;
      }
      id = UUID.uuid4();
      cell.model.metadata.set('presto', { ...metadata, id });
    } else {
      id = UUID.uuid4();
      cell.model.metadata.set('presto', { id });
    }

    return id;
  }

  static getCellId(cell: Cell): string | undefined {
    const metadata: any | undefined = cell.model.metadata.get('presto');
    if (metadata === undefined || metadata.id === undefined) {
      return undefined;
    }
    return metadata.id;
  }

  static getCellById(id: string, tracker: INotebookTracker): Cell | undefined {
    const notebooks = toArray(tracker.filter(() => true));
    for (const notebook of notebooks) {
      const cells = notebook.content.widgets;
      const value = ArrayExt.findFirstValue(
        cells,
        (cell) => this.getCellId(cell) === id
      );
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }
}

export namespace Widgetstore {
  /**
   * Main schema for storing info about DashboardWidgets.
   */
  export const WIDGET_SCHEMA = {
    id: 'widgets',
    fields: {
      cellId: Fields.String(),
      notebookId: Fields.String(),
      top: Fields.Number(),
      left: Fields.Number(),
      width: Fields.Number(),
      height: Fields.Number(),
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
  }
}
