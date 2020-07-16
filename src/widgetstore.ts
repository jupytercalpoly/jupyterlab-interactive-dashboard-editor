import { filter, toArray } from '@lumino/algorithm';

import { Litestore } from './litestore';

import { Datastore, Fields } from '@lumino/datastore';

import { Widget } from '@lumino/widgets';

export const WIDGET_SCHEMA = {
  id: 'dashboard',
  fields: {
    changed: Fields.Boolean(),
    removed: Fields.Boolean(),
    left: Fields.Number(),
    top: Fields.Number(),
    width: Fields.Number(),
    height: Fields.Number(),
  },
};

export type WidgetLocation = {
  /**
   * Left edge of widget.
   */
  left: number;

  /**
   * Top edge of widget.
   */
  top: number;

  /**
   * Width of widget.
   */
  width: number;

  /**
   * Height of widget.
   */
  height: number;
};

/**
 * A Litestore wrapper to work with widget data.
 */
export class Widgetstore extends Litestore {
  constructor(options: Datastore.IOptions) {
    if (options.schemas.indexOf(WIDGET_SCHEMA) === -1) {
      throw new Error('options.schema must contain WIDGET_SCHEMA');
    }
    super(options);
  }

  updateWidgetPos(widget: Widget): void {
    const loc = this._getWidgetLocation(widget);

    this.beginTransaction();

    this.updateRecord(
      {
        schema: WIDGET_SCHEMA,
        record: widget.id,
      },
      {
        ...loc,
        removed: false,
        changed: true,
      }
    );

    this.endTransaction();
  }

  deleteWidget(widget: Widget): void {
    this.beginTransaction();

    this.updateField(
      {
        schema: WIDGET_SCHEMA,
        record: widget.id,
        field: 'removed',
      },
      true
    );

    this.endTransaction();
  }

  getWidgetInfo(widget: Widget): WidgetLocation | undefined {
    const record = this.getRecord({
      schema: WIDGET_SCHEMA,
      record: widget.id,
    });
    if (record === undefined) {
      return undefined;
    }
    return record as WidgetLocation;
  }

  getChangedWidgets(): Record<string, any>[] {
    const table = this.get(WIDGET_SCHEMA);
    const changed = toArray(filter(table, (record) => record.changed));
    return changed;
  }

  markAllAsUnchanged(): void {
    const changed = this.getChangedWidgets();

    this.beginTransaction();

    changed.forEach((record) => {
      record.changed = false;
      this.updateTable({ schema: WIDGET_SCHEMA }, record);
    });

    this.endTransaction();
  }

  private _getWidgetLocation(widget: Widget): WidgetLocation {
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
