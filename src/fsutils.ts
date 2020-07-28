import { Contents, ContentsManager } from '@jupyterlab/services';
// import {ServiceManager} from '@jupyterlab/services';

// import { DocumentManager } from '@jupyterlab/docmanager';

// import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Dashboard } from './dashboard';

/**
 * Creates a new untitled .dashboard in current dir
 *
 * @return file created
 */
export async function newfile(contents: ContentsManager) {
  const file = await contents.newUntitled({
    path: '/',
    type: 'file',
    ext: 'dashboard',
  });
  return file;
}
/**
 * Saves content as string to dashboard file
 *
 * @param content - content of any type to save as a string
 * @param dashboard - dashboard with its path to be saved
 */
export function dashboard2file(dashboard: Dashboard, content: any) {
  const DASHBOARD: Partial<Contents.IModel> = {
    path: dashboard.path,
    type: 'file',
    mimetype: 'text/plain',
    content: JSON.stringify(content),
    format: 'text',
  };
  dashboard.contents.save(dashboard.path, DASHBOARD);
}

/**
 * Renames the dashboard file to name of the dashboard
 *
 * @param dashboard - dashboard with its path to be renamed
 */
export function renameDashboardFile(dashboard: Dashboard) {
  const newPath = '/' + dashboard.getName() + '.dashboard';
  dashboard.contents.rename(dashboard.path, newPath);
  dashboard.path = newPath;
}

/**
 * deletes the dashboard file
 * Used when a dashboard file is created when open new dashboard
 * But new dashboard is not saved later
 * @param dashboard - dashboard with its path to be deleted
 */
export function deleteDashboardFile(dashboard: Dashboard) {
  dashboard.contents.delete(dashboard.path);
}

/**
 * Reads the content of .dashboard file
 *
 * @param dashboard - dashboard whose .dashboard file to be read
 * @return content of .dashboard file
 */
export async function readDashboardFile(dashboard: Dashboard) {
    const content = await dashboard.contents.get(dashboard.path);
    return content.content as string;
  }

// function test(){
//     const opener = {
//       open: (widget: Widget) => {
//         // Do nothing for sibling widgets for now.
//       }
//     };
    
//     const manager = new ServiceManager();
//     void manager.ready.then(() => {
//       createApp(manager);
//     });
    
//     const docRegistry = new DocumentRegistry();
//     const docManager = new DocumentManager({
//       registry: docRegistry,
//       manager,
//       opener
//     });
//     const nbWidget = docManager.open("./Untitled-Copy1.ipynb") as NotebookPanel;
//     console.log("here", nbWidget)
//   }