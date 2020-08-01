export const DASHBOARD_VERSION = 1;

/**
 * A type that's serialized to create a dashboard file.
 */
export type DashboardSpec = {
  /**
   * The dashboard spec version.
   */
  version: number;

  /**
   * The name of the dashboard.
   */
  name: string;

  /**
   * The width of the dashboad in pixels (0 if unconstrained).
   */
  dashboardWidth: number;

  /**
   * The height of the dashboard in pixels (0 if unconstrained).
   */
  dashboardHeight: number;

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
  cellId: string;

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
