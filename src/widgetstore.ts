import { filter, each, IIterator } from '@lumino/algorithm';

import { Litestore } from './litestore';

import { Datastore, Fields, Record } from '@lumino/datastore';

import { Widget } from '@lumino/widgets';

import { DashboardWidget } from './widget';

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
