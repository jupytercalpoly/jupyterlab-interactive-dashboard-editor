import { NotebookPanel } from '@jupyterlab/notebook';

import { Widget } from '@lumino/widgets';

import { ToolbarButton } from '@jupyterlab/apputils';

// import { Cell } from '@jupyterlab/cells';

import { saveIcon } from '@jupyterlab/ui-components';

import { Dashboard } from './dashboard';

// import { DashboardWidget } from './widget';

import { saveDialog } from './dialog';

/**
 * Create save button toolbar item.
 */

export function createSaveButton(
  dashboard: Dashboard,
  panel: NotebookPanel
): Widget {
  const button = new ToolbarButton({
    icon: saveIcon,
    onClick: (): void => {
      dashboard.dirty = false;
      const dialog = saveDialog(dashboard);
      dialog.launch().then((result) => {
        dialog.dispose();
      });
    },
    tooltip: 'Save Dashboard',
  });
  return button;
}
