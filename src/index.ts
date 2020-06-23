import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { requestAPI } from './jupyterlabvoilaext';

/**
 * Initialization data for the jupyterlab_voila_ext extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-voila-ext',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-voila-ext is activated!');

    requestAPI<any>('get_example')
      .then(data => {
        console.log(data);
      })
      .catch(reason => {
        console.error(
          `The jupyterlab_voila_ext server extension appears to be missing.\n${reason}`
        );
      });
  }
};

export default extension;
