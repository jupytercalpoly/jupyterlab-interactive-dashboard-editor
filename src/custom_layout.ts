import { Widget, Layout, LayoutItem, PanelLayout } from '@lumino/widgets';

import { ArrayExt, IIterator, map } from '@lumino/algorithm';

import { MessageLoop } from '@lumino/messaging';

import { DashboardWidget } from './widget';

/**
 * Layout for DashboardArea widget.
 */
export class DashboardLayout extends PanelLayout {
  _dropLocation: number[];
  /**
   * Construct a new dashboard layout.
   *
   * @param options - The options for initializing the layout.
   */
  constructor(options: DashboardLayout.IOptions = {}) {
    super(options);
  }

  /**
   * Attach a widget to the parent's DOM node.
   *
   * @param widget - The widget to attach to the parent.
   */
  protected attachWidget(index: number, widget: Widget): void {
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
   * Add a widget to Dashboard layout.
   *
   * @param widget - The widget to add to the layout.
   *
   */
  addWidget(widget: DashboardWidget): void {
    // Add the widget to the layout.
    const item = new LayoutItem(widget);
    this._items.push(item);

    // Attach the widget to the parent.
    if (this.parent) {
      this.attachWidget(-1, widget);

      const numPos = this._dropLocation;
      this._update(numPos, item);
    }
  }

  /**
   * Create an iterator over the widgets in the layout.
   *
   * @returns A new iterator over the widgets in the layout.
   */
  iter(): IIterator<Widget> {
    return map(this._items, item => item.widget);
  }

  /**
   * Update the item given postion in the layout.
   *
   */
  private _update(pos: number[], item: LayoutItem) {
    if (pos !== undefined) {
      item.update(pos[0], pos[1], pos[2], pos[3]);
    }
  }

  /**
   * Insert a widget at position specified.
   */
  placeWidget(index: number, widget: DashboardWidget, pos: number[]): void {
    this._dropLocation = pos;
    this.addWidget(widget);
  }

  /**
   * Detach a widget from the parent's DOM node.
   *
   * @param widget - The widget to detach from the parent.
   */
  protected detachWidget(index: number, widget: Widget): void {
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

  /**
   * Remove a widget from Dashboard layout.
   *
   * @param widget - The widget to remove from the layout.
   *
   */
  removeWidget(widget: Widget): void {
    // Look up the index for the widget.
    const i = ArrayExt.findFirstIndex(this._items, it => it.widget === widget);

    // Bail if the widget is not in the layout.
    if (i === -1) {
      return;
    }

    // Remove the widget from the layout.
    const item = ArrayExt.removeAt(this._items, i)!;

    // Detach the widget from the parent.
    if (this.parent) {
      this.detachWidget(-1, widget);
    }

    // Dispose the layout item.
    item.dispose();
  }

  private _items: LayoutItem[] = [];
}

/**
 * The namespace for the `DashboardLayout` class statics.
 */
export namespace DashboardLayout {
  /**
   * An options object for initializing a Dashboard layout.
   */

  export type IOptions = Layout.IOptions;
}
