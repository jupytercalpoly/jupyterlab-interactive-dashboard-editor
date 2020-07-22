import { Widget, Layout, LayoutItem } from '@lumino/widgets';

import { IIterator, map, each } from '@lumino/algorithm';

import { MessageLoop } from '@lumino/messaging';

import { DashboardWidget } from './widget';

import { Message } from '@lumino/messaging';

import { Widgetstore } from './widgetstore';

import { WidgetTracker } from '@jupyterlab/apputils';

export class DashboardLayout extends Layout {
  constructor(options: DashboardLayout.IOptions) {
    super(options);
    this._items = new Map<string, LayoutItem>();
    this._store = options.store;
    this._outputTracker = options.outputTracker;
  }

  /**
   * Dispose of resources held by the layout.
   */
  dispose(): void {
    this._items.forEach((item) => item.dispose());
    this._outputTracker = null;
    this._store = null;
    super.dispose();
  }

  /**
   * Perform layout initialization which requires the parent widget.
   */
  protected init(): void {
    super.init();
    each(this, (widget) => {
      this.attachWidget(widget);
    });
    console.log('initialized');
  }

  /**
   * Add a widget to Dashboard layout.
   *
   * @param widget - The widget to add to the layout.
   *
   */
  addWidget(widget: DashboardWidget, pos: Widgetstore.WidgetPosition): void {
    // Add the widget to the layout.
    const item = new LayoutItem(widget);
    this._items.set(widget.id, item);

    // Attach the widget to the parent.
    if (this.parent) {
      this.attachWidget(widget);
      this.moveWidget(widget, pos);
      this._outputTracker.add(widget);
    }
  }

  moveWidget(
    widget: DashboardWidget,
    pos: Widgetstore.WidgetPosition
  ): boolean {
    // Get the item from the map.
    const item = this._items.get(widget.id);

    // If the item doesn't exist, exit.
    if (item === undefined) {
      return false;
    }

    // Send an update request to the layout item.
    const { left, top, width, height } = pos;
    item.update(left, top, width, height);

    return true;
  }

  removeWidget(widget: Widget): void {
    void this.deleteWidget(widget);
  }

  /**
   * Remove a widget from Dashboard layout.
   *
   * @param widget - The widget to remove from the layout.
   *
   */
  deleteWidget(widget: Widget): boolean {
    // Look up the widget in the _items map.
    const item = this._items.get(widget.id);

    // Bail if it's not there.
    if (item === undefined) {
      return false;
    }

    // Remove the item from the map.
    this._items.delete(widget.id);

    // Detach the widget from the parent.
    if (this.parent) {
      this.detachWidget(-1, widget);
    }

    // Dispose the layout item.
    item.dispose();

    return true;
  }

  /**
   * Create an iterator over the widgets in the layout.
   *
   * @returns A new iterator over the widgets in the layout.
   */
  iter(): IIterator<Widget> {
    // Is there a lazy way to iterate through the map?
    const arr = Array.from(this._items.values());
    return map(arr, (item) => item.widget);
  }

  /**
   * Attach a widget to the parent's DOM node.
   *
   * @param widget - The widget to attach to the parent.
   */
  protected attachWidget(widget: Widget): void {
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

    // Post a fit request for the parent widget.
    this.parent!.fit();
  }

  protected onUpdateRequest(msg: Message): void {
    // Return if guard is set to prevent infinite looping.
    if (this._updateGuard) {
      return;
    }

    // Set the guard.
    this._updateGuard = true;
    this._store.beginTransaction();

    // Process all changed widgets in the store.
    each(this._store.getChangedWidgets(), (widgetInfo) => {
      const item = this._items.get(widgetInfo.widgetId);
      const pos = widgetInfo as Widgetstore.WidgetPosition;
      let removed = false;

      // Widget added for first time or was undeleted.
      if (item === undefined) {
        console.log('added widget');
        const newWidget = this._store.createWidget(
          widgetInfo as Widgetstore.WidgetInfo
        );
        this.addWidget(newWidget, pos);
      }
      // Widget was just deleted.
      else if (widgetInfo.removed) {
        console.log('deleted widget');
        const widget = item.widget;
        this.removeWidget(widget);
        removed = true;
      }
      // Widget was moved or resized.
      else {
        console.log('moved widget');
        this.moveWidget(item.widget as DashboardWidget, pos);
      }

      // Mark record as processed and removed if applicable.
      this._store.updateRecord(
        {
          schema: Widgetstore.WIDGET_SCHEMA,
          record: widgetInfo.widgetId,
        },
        {
          changed: false,
          removed,
        }
      );
    });

    this._store.endTransaction();

    // Remove guard.
    this._updateGuard = false;
  }

  private _items: Map<string, LayoutItem>;
  private _store: Widgetstore;
  private _outputTracker: WidgetTracker<DashboardWidget>;
  private _updateGuard = false;
}

// /**
//  * Layout for DashboardArea widget.
//  */
// export class DashboardLayout extends PanelLayout {
//   _dropLocation: number[];
//   /**
//    * Construct a new dashboard layout.
//    *
//    * @param options - The options for initializing the layout.
//    */
//   constructor(options: DashboardLayout.IOptions) {
//     super(options);
//     this._items = new Map<string, LayoutItem>();
//     this._store = options.store;
//     console.log(this._store);
//   }

//   /**
//    * Attach a widget to the parent's DOM node.
//    *
//    * @param widget - The widget to attach to the parent.
//    */
//   protected attachWidget(index: number, widget: Widget): void {
//     // Send a `'before-attach'` message if the parent is attached.
//     if (this.parent!.isAttached) {
//       MessageLoop.sendMessage(widget, Widget.Msg.BeforeAttach);
//     }

//     // Add the widget's node to the parent.
//     this.parent!.node.appendChild(widget.node);

//     // Send an `'after-attach'` message if the parent is attached.
//     if (this.parent!.isAttached) {
//       MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
//     }

//     // Post a fit request for the parent widget.
//     this.parent!.fit();
//   }

//   /**
//    * Add a widget to Dashboard layout.
//    *
//    * @param widget - The widget to add to the layout.
//    *
//    */
//   addWidget(widget: DashboardWidget): void {
//     // Add the widget to the layout.
//     const item = new LayoutItem(widget);
//     this._items.set(widget.id, item);

//     // Attach the widget to the parent.
//     if (this.parent) {
//       this.attachWidget(-1, widget);

//       const numPos = this._dropLocation;
//       this._update(numPos, item);
//     }
//   }

//   /**
//    * Create an iterator over the widgets in the layout.
//    *
//    * @returns A new iterator over the widgets in the layout.
//    */
//   iter(): IIterator<Widget> {
//     // Is there a lazy way to iterate through the map?
//     let arr = Array.from(this._items.values());
//     return map(arr, item => item.widget);
//   }

//   /**
//    * Update the item given postion in the layout.
//    */
//   private _update(pos: number[], item: LayoutItem) {
//     if (pos !== undefined) {
//       const [ left, top, width, height ] = pos;
//       item.update(left, top, width, height);
//     }
//   }

//   protected onUpdateRequest(msg: Message): void {

//     console.log('update recieved');
//     each(this._store.getChangedWidgets(),
//       widgetInfo => {
//         let item = this._items.get(widgetInfo.widgetId);
//         let pos = [
//           widgetInfo.left,
//           widgetInfo.top,
//           widgetInfo.width,
//           widgetInfo.height
//         ];

//         // Widget added for first time or was undeleted.
//         if (item === undefined) {
//           console.log('widget added or undeleted', widgetInfo, item);
//           let newWidget = this._store.createWidget(widgetInfo as Widgetstore.WidgetInfo);
//           this.placeWidget(-1, newWidget, pos);
//         }
//         // Widget was just deleted.
//         else if (widgetInfo.removed) {
//           console.log('widget removed', widgetInfo, item);
//           let widget = item.widget;
//           this.removeWidget(widget);
//         }
//         // Widget was moved or resized.
//         else {
//           console.log('widget moved or resized', widgetInfo, item);
//           this._update(pos, item);
//         }
//       }
//     );

//     super.onUpdateRequest(msg);

//     this._store.markAllAsUnchanged();
//   }

//   /**
//    * Insert a widget at position specified.
//    */
//   placeWidget(index: number, widget: DashboardWidget, pos: number[]): void {
//     this._dropLocation = pos;
//     this.addWidget(widget);
//   }

//   /**
//    * Detach a widget from the parent's DOM node.
//    *
//    * @param widget - The widget to detach from the parent.
//    */
//   protected detachWidget(_index: number, widget: Widget): void {
//     // Send a `'before-detach'` message if the parent is attached.
//     if (this.parent!.isAttached) {
//       MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);
//     }

//     // Remove the widget's node from the parent.
//     this.parent!.node.removeChild(widget.node);

//     // Send an `'after-detach'` message if the parent is attached.
//     if (this.parent!.isAttached) {
//       MessageLoop.sendMessage(widget, Widget.Msg.AfterDetach);
//     }

//     // Post a fit request for the parent widget.
//     this.parent!.fit();
//   }

//   /**
//    * Remove a widget from Dashboard layout.
//    *
//    * @param widget - The widget to remove from the layout.
//    *
//    */
//   removeWidget(widget: Widget): void {
//     // Look up the widget in the _items map.
//     const item = this._items.get(widget.id)

//     // Bail if it's not there.
//     if (item === undefined) {
//       return;
//     }

//     // Remove the item from the map.
//     this._items.delete(widget.id);

//     // Detach the widget from the parent.
//     if (this.parent) {
//       this.detachWidget(-1, widget);
//     }

//     // Dispose the layout item.
//     item.dispose();

//   }

//   private _items: Map<string, LayoutItem>;
//   private _store: Widgetstore;
// }

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
  }
}
