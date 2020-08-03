import { ContentsManager } from '@jupyterlab/services';
import { DashboardWidget } from './widget';

export class DBUtils {
  public clipboard: Set<DashboardWidget>;
  public fullscreen: boolean;
  public contents: ContentsManager;
  constructor() {
    this.clipboard = new Set<DashboardWidget>();
    this.fullscreen = false;
    this.contents = new ContentsManager();
  }
}
