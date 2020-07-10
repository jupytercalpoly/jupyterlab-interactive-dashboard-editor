import { BoxLayout, BoxPanel } from '@lumino/widgets';

import { DashboardWidget } from './widget';

/**
 * Layout for DashboardArea widget.
 */
export class DashboardLayout extends BoxLayout {
  constructor(options: BoxPanel.IOptions) {
    super(options);
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
      this.insertWidget(index, widget);
    }
  }
}
