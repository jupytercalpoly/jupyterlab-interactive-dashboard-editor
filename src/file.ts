/**
 * A type that's serialized to create a dashboard file.
 */
export type DashboardFile = {
  /**
   * The dashboard spec version.
   */
  version: number;

  /**
   * Information about the dashboard grid.
   */
  gridSpec: {
    /**
     * Unit width of the grid.
     */
    width: number;

    /**
     * Unit height of the grid.
     */
    height: number;

    /**
     * Default width padding.
     */
    padX: number;

    /**
     * Default height padding.
     */
    padY: number;
  };

  /**
   * A map from notebook paths to IDs.
   */
  paths: { [notebookPath: string]: string };

  /**
   * A map from notebook IDs to an array of widgets used from that notebook.
   */
  outputs: { [notebookId: string]: WidgetInfo[] };
};

/**
 * A type to hold information to recreate a dashboard widget.
 */
export type WidgetInfo = {
  /**
   * The cell ID the widget is created from.
   */
  id: string;

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
};