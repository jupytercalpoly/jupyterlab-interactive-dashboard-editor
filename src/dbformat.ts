import { PartialJSONObject } from '@lumino/coreutils';

import { WidgetPosition } from './widgetstore';

export const DASHBOARD_VERSION = 1;

/**
 * An interface that's serialized to create a dashboard file.
 */
export interface IDashboardContent extends PartialJSONObject {
  /**
   * The dashboard spec version.
   */
  version: number;

  /**
   * The dashboard metadata.
   */
  metadata: IDashboardMetadata;

  /**
   * A map from notebook paths to IDs.
   */
  paths: { [notebookPath: string]: string };

  /**
   * A map from notebook IDs to an array of widgets used from that notebook.
   */
  outputs: { [notebookId: string]: IOutputInfo[] };
}

/**
 * An interface to hold dashboard metadata.
 */
export interface IDashboardMetadata extends PartialJSONObject {
  name: string;
  dashboardWidth: number;
  dashboardHeight: number;
}

/**
 * An interface to hold information to recreate a dashboard widget.
 */
export interface IOutputInfo extends PartialJSONObject {
  /**
   * The cell ID the widget is created from.
   */
  cellId: string;

  /**
   * The position and size of an output.
   */
  pos: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export interface ICellView {
  name: string;
  pos: WidgetPosition;
  hidden: boolean;
  snapToGrid: boolean;
}

export interface ICellMetadataFormat {
  id: string;
  views: { [id: string]: ICellView };
}

export interface IDashboardView {
  name: string;
  cellWidth: number;
  cellHeight: number;
  dashboardWidth: number;
  dashboardHeight: number;
}

export interface INBMetadataFormat {
  id: string;
  views: { [id: string]: IDashboardView };
}
