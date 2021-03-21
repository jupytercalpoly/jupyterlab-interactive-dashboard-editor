import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IJupyterWidgetRegistry } from '@jupyter-widgets/base';

/* import {
  registerWidgetManager,
  WidgetRenderer
} from '@jupyter-widgets/jupyterlab-manager';
 */
import {
  //Dashboard,
  IDashboardTracker
} from '../dashboard';

/* function* widgetRenderers(
  editor: Dashboard
): IterableIterator<WidgetRenderer> {
  for (const w of editor.gridWidgets) {
    if (w instanceof WidgetRenderer) {
      yield w;
    }
  }
} */

/**
 * A plugin to add support for rendering Jupyter Widgets in the dashboard.
 */
export const widgets: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-interactive-dashboard-editor:widgets',
  autoStart: true,
  optional: [IDashboardTracker, IJupyterWidgetRegistry],
  activate: (
    app: JupyterFrontEnd,
    dashboardTracker: IDashboardTracker | null,
    widgetRegistry: IJupyterWidgetRegistry | null
  ) => {
    if (!widgetRegistry) {
      return;
    }
    dashboardTracker?.forEach(panel => {
     /*  registerWidgetManager(
        panel.context,
        panel.content.rendermime,
        widgetRenderers(panel.content)
      ); */
    });

    dashboardTracker?.widgetAdded.connect((sender, panel) => {
      /* registerWidgetManager(
        panel.context,
        panel.content.rendermime,
        widgetRenderers(panel.content)
      ); */
    });
    console.log(widgets.id, 'activated');
  }
};
