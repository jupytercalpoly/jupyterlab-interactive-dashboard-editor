import { ContentsManager} from '@jupyterlab/services';
import {DashboardWidget} from './widget';

export class DBUtils {
    public clipboard: Set<DashboardWidget>;
    public fullsreen: boolean;
    public contents: ContentsManager; 
    constructor() {
        this.clipboard = new Set<DashboardWidget>();
        this.fullsreen = false;
        this.contents = new ContentsManager();
    }
}