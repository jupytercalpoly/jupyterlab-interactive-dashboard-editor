import { Contents, ContentsManager } from '@jupyterlab/services';
import { Dashboard } from './dashboard';

/**
 * Creates a new untitled .dashboard in current dir
 *
 * @param dashboard - the dashboard to associate the file with
 *
 * @return file created
 */
export async function newfile(dashboard: Dashboard): Promise<Contents.IModel> {
  const file = await dashboard.model.contentsManager.newUntitled({
    path: '/',
    type: 'file',
    ext: 'dashboard',
  });

  dashboard.model.path = file.path;

  return file;
}

/**
 * Saves content as string to dashboard file
 *
 * @param contents - the contents manager to use to write
 *
 * @param path - the path to the file
 *
 * @param dashboard - dashboard with its path to be saved
 */
export async function writeFile(
  contents: ContentsManager,
  path: string,
  content: any
): Promise<Contents.IModel> {
  const DASHBOARD: Partial<Contents.IModel> = {
    path,
    type: 'file',
    mimetype: 'text/plain',
    content: JSON.stringify(content, undefined, 2),
    format: 'text',
  };
  return contents.save(path, DASHBOARD);
}

/**
 * Renames the dashboard file to name of the dashboard
 *
 * @param name - the new name for the dashboard
 *
 * @param dashboard - dashboard with its path to be renamed
 */
export async function renameDashboardFile(
  name: string,
  dashboard: Dashboard
): Promise<Contents.IModel> {
  const newPath = '/' + name;
  return dashboard.model.contentsManager.rename(dashboard.model.path, newPath).then(
    (f: Contents.IModel): Contents.IModel => {
      dashboard.model.path = newPath;
      return f;
    }
  );
}

/**
 * deletes the dashboard file
 * Used when a dashboard file is created when open new dashboard
 * But new dashboard is not saved later
 * @param dashboard - dashboard with its path to be deleted
 */
export function deleteDashboardFile(dashboard: Dashboard): void {
  dashboard.model.contentsManager.delete(dashboard.model.path);
}

/**
 * Reads the content of .dashboard file
 *
 * @param dashboard - dashboard whose .dashboard file to be read
 * @return content of .dashboard file
 */
export async function readDashboardFile(dashboard: Dashboard): Promise<string> {
  const content = await dashboard.model.contentsManager.get(dashboard.model.path);
  return content.content as string;
}
