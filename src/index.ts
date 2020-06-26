import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './jupyterlab-interactive-dashboard-editor';

/**
 * Initialization data for the jupyterlab-interactive-dashboard-editor extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-interactive-dashboard-editor',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-interactive-dashboard-editor is activated!');

    requestAPI<any>('get_example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyterlab_interactive_dashboard_editor server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default extension;
