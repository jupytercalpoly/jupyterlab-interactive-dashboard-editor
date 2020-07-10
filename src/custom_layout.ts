// import {
//     PanelLayout,
//     Layout,
//     LayoutItem,
//     Widget
// } from '@lumino/widgets';

// import {
//     MessageLoop
// } from '@lumino/messaging';

// import {
//     ArrayExt, IIterator, each, iter
// } from '@lumino/algorithm';

// export default
// class DashboardLayout extends PanelLayout {
//     constructor(options: Layout.IOptions = {}) {
//         super(options);
//     }

//     /**
//      * Disposes of resources held by the layout.
//      *
//      * This method is called automatically when the parent is disposed.
//      */
//     dispose(): void {
//         // Dispose of the layout items.
//         each(this._items, item => { item.dispose()})

//         // Dispose of the rest.
//         super.dispose();
//     }

//     private _items: LayoutItem[] = [];
// }
