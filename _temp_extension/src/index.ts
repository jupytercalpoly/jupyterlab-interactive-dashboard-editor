import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyterlab-interactive-dashboard-editor extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-interactive-dashboard-editor',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyterlab-interactive-dashboard-editor is activated!');
  }
};

export default extension;
