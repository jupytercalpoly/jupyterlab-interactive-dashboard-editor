import { INotebookTracker } from '@jupyterlab/notebook';

import { Widget } from '@lumino/widgets';

import { ToolbarButton, InputDialog } from '@jupyterlab/apputils';

import { saveIcon } from '@jupyterlab/ui-components';

import { Dashboard } from './dashboard';

/**
 * Create save button toolbar item.
 */

export function createSaveButton(
  dashboard: Dashboard,
  notebookTracker: INotebookTracker
): Widget {
  const button = new ToolbarButton({
    icon: saveIcon,
    onClick: (): void => {
      const filename = `${dashboard.getName()}.dashboard`;
      InputDialog.getText({ title: 'Save as', text: filename }).then(
        (value) => {
          dashboard.save(notebookTracker, value.value);
        }
      );
    },
    tooltip: 'Save Dashboard',
  });
  return button;
}
