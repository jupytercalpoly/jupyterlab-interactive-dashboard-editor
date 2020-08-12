import { Widget, Layout, LayoutItem } from '@lumino/widgets';

import { Record } from '@lumino/datastore';

import { IIterator, map, each } from '@lumino/algorithm';

import { MessageLoop, Message } from '@lumino/messaging';

import { DashboardWidget } from './widget';

import { Widgetstore, WidgetSchema } from './widgetstore';

import { WidgetTracker } from '@jupyterlab/apputils';

import { Dashboard } from './dashboard';

import { Signal } from '@lumino/signaling';

const EDITABLE_CORNER_CLASS = 'pr-EditableBackground';

export class DashboardLayout extends Layout {
  constructor(options: DashboardLayout.IOptions) {
    super(options);

    this._items = new Map<string, LayoutItem>();
    this._store = options.store;
    this._outputTracker = options.outputTracker;

    this._width = options.width || 0;
    this._height = options.height || 0;

    this._corner = DashboardLayout.makeCorner(this._width, this._height);

    if (options.mode === 'edit') {
      this._corner.addClass(EDITABLE_CORNER_CLASS);
    }

    this._mode = options.mode;
  }

  get corner(): Widget {
    return this._corner;
  }

  /**
   * Perform initilization that requires a parent.
   */
  init(): void {
    super.init();
    each(this, (widget) => this.attachWidget(widget));
    this.attachWidget(this._corner);
  }

  /**
   * Dispose of resources held by the layout.
   */
  dispose(): void {
    this._items.forEach((item) => item.dispose());
    this._corner.dispose();
    this._outputTracker = null;
    this._store = null;
    super.dispose();
  }

  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._dashboard = this.parent.parent as Dashboard;
  }

  /**
   * Create an iterator over the widgets in the layout.
   *
   * @returns a new iterator over the widgets in the layout.
   */
  iter(): IIterator<Widget> {
    // Is there a lazy way to iterate through the map?
    const arr = Array.from(this._items.values());
    return map(arr, (item) => item.widget);
  }

  signalChange(change: IDashboardChange): void {
    if (!this._signalChanges) {
      console.log('not signaling changes');
      return;
    }
    this._changes.push(change);
    if (!this.inBatch) {
      this._changed.emit(this._changes);
      this._changes = [];
    }
  }

  /**
   * Attach a widget to the parent's DOM node.
   *
   * @param widget - The widget to attach to the parent.
   */
  protected attachWidget(widget: Widget): void {
    // Set widget's parent.
    widget.parent = this.parent;

    // Send a `'before-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
    }

    // Add the widget's node to the parent.
    this.parent!.node.appendChild(widget.node);

    // Send an `'after-attach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
    }

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  /**
   * Detach a widget from the parent's DOM node.
   *
   * @param widget - The widget to detach from the parent.
   */
  protected detachWidget(_index: number, widget: Widget): void {
    // Send a `'before-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
    }

    // Remove the widget's node from the parent.
    this.parent!.node.removeChild(widget.node);

    // Send an `'after-detach'` message if the parent is attached.
    if (this.parent!.isAttached) {
      MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
    }

    widget.parent = null;

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  /**
   * Add a widget to the layout.
   *
   * @param widget - the widget to add.
   */
  addWidget(
    widget: DashboardWidget,
    _pos: Widgetstore.WidgetPosition,
    fit = false
  ): void {
    // Add the widget to the layout.
    const item = new LayoutItem(widget);
    this._items.set(widget.id, item);
    console.log('item map update - add', this._items);

    // Attach the widget to the parent.
    if (this.parent) {
      if (this._dashboard !== undefined) {
        widget.mode = this._dashboard.mode;
      } else {
        widget.mode = 'present';
      }
      this.attachWidget(widget);
      this._updateWidget(widget, _pos);
      this._outputTracker.add(widget);

      const { id, notebookId, cellId } = widget;

      const ignore = !this._signalChanges;

      widget.ready.connect(() => {
        const change: IDashboardChange = {
          type: 'add',
          pos: widget.pos,
          widgetId: id,
          notebookId,
          cellId,
          ignore,
        };
        this.signalChange(change);
      });
    }
  }

  updateWidget(
    widget: DashboardWidget,
    pos: Widgetstore.WidgetPosition
  ): boolean {
    const success = this._updateWidget(widget, pos);
    if (success) {
      const change: IDashboardChange = {
        type: 'move',
        widgetId: widget.id,
        pos: widget.pos,
      };
      this.signalChange(change);
    }
    return success;
  }

  private _updateWidget(
    widget: DashboardWidget,
    pos: Widgetstore.WidgetPosition
  ): boolean {
    // Get the item from the map.
    const item = this._items.get(widget.id);

    // If the item doesn't exist, exit.
    if (item === undefined) {
      return false;
    }

    let { left, top } = pos;
    const { width, height } = pos;

    // Constrain the widget to the dashboard dimensions.
    if (this._width !== 0 && left + width > this._width) {
      left = this._width - width;
    }
    if (this._height !== 0 && top + height > this._height) {
      top = this._height - height;
    }

    item.update(left, top, width, height);

    return true;
  }

  /**
   * Remove a widget from the layout.
   *
   * @param widget - the widget to remove.
   *
   * ### Notes
   * This is basically the same as deleteWidget but fulfills the type
   * signature requirements of the extended class.
   */
  removeWidget(widget: DashboardWidget): void {
    void this.deleteWidget(widget);
  }

  /**
   * Remove a widget from the layout.
   *
   * @param widget - the widget to remove.
   *
   */
  deleteWidget(widget: DashboardWidget): boolean {
    // Look up the widget in the _items map.
    const item = this._items.get(widget.id);
    console.log('item map update - remove', this._items);

    // Bail if it's not there.
    if (item === undefined) {
      return false;
    }

    const change: IDashboardChange = {
      type: 'remove',
      widgetId: widget.id,
    };

    // Remove the item from the map.
    this._items.delete(widget.id);

    // Detach the widget from the parent.
    if (this.parent) {
      this.detachWidget(-1, widget);
    }

    // Dispose the layout item.
    item.dispose();

    this.signalChange(change);

    return true;
  }

  /**
   * Adds a dashboard widget's information to the widgetstore.
   *
   * @param info - the information to add to the widgetstore.
   */
  updateWidgetInfo(info: Widgetstore.WidgetInfo): void {
    this._store.addWidget(info);
  }

  /**
   * Mark a widget as deleted in the widgetstore.
   *
   * @param widget - the widget to mark as deleted.
   */
  deleteWidgetInfo(widget: DashboardWidget): void {
    this._store.deleteWidget(widget.id);
  }

  /**
   * Update a widgetstore entry for a widget given that widget.
   *
   * @param widget - the widget to update from.
   */
  updateInfoFromWidget(widget: DashboardWidget): void {
    this.updateWidgetInfo(widget.info);
  }

  /**
   * Update the layout from a widgetstore record.
   *
   * @param record - the record to update from.
   */
  private _updateLayoutFromRecord(record: Record<WidgetSchema>): void {
    console.log('record id', record.$id);
    const item = this._items.get(record.$id);
    const pos = record.pos;

    console.log('record to update from', record);
    console.log('\titem', item);

    if (record.widgetId === '') {
      // Widget has already been removed; ignore.
      if (item === undefined) {
        return;
      }

      // Widget is empty; remove.
      this.deleteWidget(item.widget as DashboardWidget);
    } else if (item === undefined) {
      // Widget has already been removed; ignore.
      if (record.removed) {
        return;
      } else {
        // Widget is newly added or undeleted; add.
        const newWidget = this._store.createWidget(
          record as Widgetstore.WidgetInfo
        );
        this.addWidget(newWidget, pos);
      }
    } else {
      // Widget was just removed; delete.
      if (record.removed) {
        this.deleteWidget(item.widget as DashboardWidget);
      }

      // Widget was moved or resized; update.
      this.updateWidget(item.widget as DashboardWidget, pos);
    }
  }

  /**
   * Updates the layout based on the state of the datastore.
   */
  updateLayoutFromWidgetstore(): void {
    console.log('history', this._store.getHistory());
    this._signalChanges = false;
    const records = this._store.getWidgets();
    each(records, (record) => this._updateLayoutFromRecord(record));
    this._signalChanges = true;
  }

  /**
   * Undo the last change to the layout.
   */
  undo(): void {
    console.log('history before undo', this._store.getHistory());
    this._store.undo();
    this.updateLayoutFromWidgetstore();
  }

  /**
   * Redo the last change to the layout.
   */
  redo(): void {
    this._store.redo();
    this.updateLayoutFromWidgetstore();
  }

  get width(): number {
    return this._width;
  }
  set width(newWidth: number) {
    if (newWidth < 0) {
      newWidth = 0;
    }
    this._width = newWidth;
    this._corner.node.style.width = `${newWidth}px`;
  }

  get height(): number {
    return this._height;
  }
  set height(newHeight: number) {
    if (newHeight < 0) {
      newHeight = 0;
    }
    this._height = newHeight;
    this._corner.node.style.height = `${newHeight}px`;
  }

  get mode(): Dashboard.Mode {
    return this._mode;
  }
  set mode(newMode: Dashboard.Mode) {
    this._mode = newMode;
    each(this, (_widget) => {
      const widget = _widget as DashboardWidget;
      widget.mode = newMode;
    });
    this._corner.toggleClass(EDITABLE_CORNER_CLASS);
  }

  startBatch(): void {
    this._inBatch = true;
  }

  endBatch(): void {
    this._inBatch = false;
  }

  get inBatch(): boolean {
    return this._inBatch;
  }

  /**
   * Creates a dashboard widget from a widgetinfo object.
   *
   * @param info - info to create widget from.
   *
   * @param fit - whether to fit the widget to content when it's created.
   *
   * @returns - the created widget.
   *
   * @throws - an error if a notebook or cell isn't found from the ids in the
   * widgetinfo object.
   */
  createWidget(info: Widgetstore.WidgetInfo, fit?: boolean): DashboardWidget {
    return this._store.createWidget(info, fit);
  }

  get changed(): Signal<this, IDashboardChange[]> {
    return this._changed;
  }

  // Map from widget ids to LayoutItems
  private _items: Map<string, LayoutItem>;
  // Datastore widgets are rendered from / saved to.
  private _store: Widgetstore | undefined;
  // Output tracker to add new widgets to.
  private _outputTracker: WidgetTracker<DashboardWidget>;
  // Dummy corner widget to set dimensions of dashboard.
  private _corner: Widget;
  // Dashboard width (zero if unconstrained).
  private _width: number;
  // Dashboard height (zero if unconstrained).
  private _height: number;
  // Mode (either interactive or edit);
  private _mode: Dashboard.Mode;
  // Parent dashboard.
  private _dashboard: Dashboard;

  // Changed signal
  private _changed = new Signal<this, IDashboardChange[]>(this);

  private _changes: IDashboardChange[] = [];

  private _inBatch = false;

  private _signalChanges = true;
}

/**
 * The namespace for the `DashboardLayout` class statics.
 */
export namespace DashboardLayout {
  /**
   * An options object for initializing a Dashboard layout.
   */

  export interface IOptions extends Layout.IOptions {
    /**
     * The tracker to handle deleting and widget focus.
     */
    outputTracker: WidgetTracker<DashboardWidget>;

    /**
     * The widgetstore to update from.
     */
    store: Widgetstore;

    /**
     * The static width of the dashboard area.
     */
    width?: number;

    /**
     * The static height of the dashboard area.
     */
    height?: number;

    /**
     * The layout mode (either interactive or edit).
     */
    mode: Dashboard.Mode;
  }

  /**
   * Create a widget to put in the corner of a layout to set the length/width.
   *
   * @param x - width.
   *
   * @param y - height.
   */
  export function makeCorner(x: number, y: number): Widget {
    const corner = new Widget();
    corner.node.style.width = `${x}px`;
    corner.node.style.height = `${y}px`;
    corner.node.style.left = '0';
    corner.node.style.top = '0';
    corner.node.style.position = 'absolute';
    return corner;
  }
}

export type DashboardChangeType = 'add' | 'remove' | 'move';

export interface IDashboardChange {
  type: DashboardChangeType;

  widgetId: string;

  pos?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  };

  notebookId?: string;

  cellId?: string;

  ignore?: boolean;
}
