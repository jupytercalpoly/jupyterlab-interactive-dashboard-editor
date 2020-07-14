
  import {
    Widget,
    Layout,
    LayoutItem, 
    PanelLayout
  } from '@lumino/widgets';
  
  import {
    Cell
  } from '@jupyterlab/cells';

  import {
    ArrayExt, IIterator, map
  } from '@lumino/algorithm';
  
   import {
    MessageLoop
  } from '@lumino/messaging';

  import {
      DashboardWidget
  }from './widget';
  
/**
 * Layout for DashboardArea widget.
 */
export class DashboardLayout extends PanelLayout {
    /**
     * Construct a new dashboard layout.
     *
     * @param options - The options for initializing the layout.
     */
    constructor(options: DashboardLayout.IOptions = {}) {
      super(options);
      // if (options.rowCount !== undefined) {
      //   Private.reallocSizers(this._rowSizers, options.rowCount);
      // }
      // if (options.columnCount !== undefined) {
      //   Private.reallocSizers(this._columnSizers, options.columnCount);
      // }
      // if (options.rowSpacing !== undefined) {
      //   this._rowSpacing = Private.clampValue(options.rowSpacing);
      // }
      // if (options.columnSpacing !== undefined) {
      //   this._columnSpacing = Private.clampValue(options.columnSpacing);
      // }
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
      let item = new LayoutItem(widget);
      this._items.push(item);
  
      // Attach the widget to the parent.
      if (this.parent) {
        this.attachWidget(-1, widget);
        let pos = ((widget.cell as Cell).model.metadata.get("pos")) as string[];
        this._update(pos, item);
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
  
    private _update(pos: string[], item: LayoutItem){
      if(pos == undefined){
  
      }else{
        item.update(Number(pos[0]), Number(pos[1]), Number(pos[2]), Number(pos[3])); 
      }
    }
  
    /**
     * Insert a widget at a specified position in the list view.
     * Near-synonym for the protected insertWidget method.
     * Adds widget to the last possible posiiton if index is set to -1.
     */
    placeWidget(index: number, widget: DashboardWidget): void {
      if (index === -1) {
        this.addWidget(widget);
      } else {
        this.addWidget(widget);
        // this.insertWidget(index, widget);
      }
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
      let i = ArrayExt.findFirstIndex(this._items, it => it.widget === widget);
  
      // Bail if the widget is not in the layout.
      if (i === -1) {
        return;
      }
  
      // Remove the widget from the layout.
      let item = ArrayExt.removeAt(this._items, i)!;
  
      // Detach the widget from the parent.
      if (this.parent) {
        this.detachWidget(-1, widget);
      }
  
      // Dispose the layout item.
      item.dispose();
    }
  
    // private _dirty = false;
    // private _rowSpacing = 4;
    // private _columnSpacing = 4;
    private _items: LayoutItem[] = [];
    // private _rowStarts: number[] = [];
    // private _columnStarts: number[] = [];
    // private _rowSizers: BoxSizer[] = [new BoxSizer()];
    // private _columnSizers: BoxSizer[] = [new BoxSizer()];
    // private _box: ElementExt.IBoxSizing | null = null;
  }

  /**
 * The namespace for the `DashboardLayout` class statics.
 */
export
namespace DashboardLayout {
  /**
   * An options object for initializing a grid layout.
   */
  
  export
  interface IOptions extends Layout.IOptions {
    /**
     * The initial row count for the layout.
     *
     * The default is `1`.
     */
    rowCount?: number;

    /**
     * The initial column count for the layout.
     *
     * The default is `1`.
     */
    columnCount?: number;

    /**
     * The spacing between rows in the layout.
     *
     * The default is `4`.
     */
    rowSpacing?: number;

    /**
     * The spacing between columns in the layout.
     *
     * The default is `4`.
     */
    columnSpacing?: number;
  }
}