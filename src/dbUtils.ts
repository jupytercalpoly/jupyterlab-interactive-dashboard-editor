import { ContentsManager } from '@jupyterlab/services';
import { Widgetstore } from './widgetstore';

export class DBUtils {
  public clipboard: Set<Widgetstore.WidgetInfo>;
  public fullscreen: boolean;
  public contents: ContentsManager;
  constructor() {
    this.clipboard = new Set<Widgetstore.WidgetInfo>();
    this.fullscreen = false;
    this.contents = new ContentsManager();
  }
}
