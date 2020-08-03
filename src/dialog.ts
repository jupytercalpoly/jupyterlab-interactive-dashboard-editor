import { Dialog } from '@jupyterlab/apputils';
import { Dashboard } from './dashboard';

export function unsaveDialog(dashboard: Dashboard): Dialog<unknown> {
  const dialog = new Dialog({
    title: 'Close without saving?',
    body:
      '"' +
      dashboard.getName() +
      '.dashboard"' +
      ' has unsaved changes, close without saving?',
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({
        label: 'OK',
      }),
    ],
  });
  return dialog;
}

export function saveDialog(dashboard: Dashboard): Dialog<unknown> {
  const dialog = new Dialog({
    title: 'Dashboard saved',
    body:
      'All changes to "' + dashboard.getName() + '.dashboard"' + ' is saved',
    buttons: [Dialog.okButton()],
  });
  return dialog;
}
