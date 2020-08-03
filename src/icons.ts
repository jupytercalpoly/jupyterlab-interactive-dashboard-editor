import { LabIcon } from '@jupyterlab/ui-components';

import whiteDashboardSvgstr from '../style/icons/dashboard_icon_filled_white.svg';
import greyDashboardSvgstr from '../style/icons/dashboard_icon_filled_grey.svg';
import blueDashboardSvgstr from '../style/icons/dashboard_icon_filled_blue.svg';
import whiteDashboardOutlineSvgstr from '../style/icons/dashboard_icon_outline_white.svg';
import greyDashboardOutlineSvgstr from '../style/icons/dashboard_icon_outline_grey.svg';
import redoIcon from '../style/icons/redo.svg';
import fullscreenIcon from '../style/icons/fullscreen.svg';
import statusIcon from '../style/icons/dummy.svg';
import resizerSvgstr from '../style/icons/mdi_drag_indicator.svg';

/**
 * Dashboard icons
 */
export namespace Icons {
  export const whiteDashboard = new LabIcon({
    name: 'pr-icons:white-dashboard',
    svgstr: whiteDashboardSvgstr,
  });

  export const greyDashboard = new LabIcon({
    name: 'pr-icons:grey-dashboard',
    svgstr: greyDashboardSvgstr,
  });

  export const blueDashboard = new LabIcon({
    name: 'pr-icons:blue-dashboard',
    svgstr: blueDashboardSvgstr,
  });

  export const whiteDashboardOutline = new LabIcon({
    name: 'pr-icons:white-dashboard-icon',
    svgstr: whiteDashboardOutlineSvgstr,
  });

  export const greyDashboardOutline = new LabIcon({
    name: 'pr-icons:grey-dashboard-outline',
    svgstr: greyDashboardOutlineSvgstr,
  });

  export const redoToolbarIcon = new LabIcon({
    name: 'pr-icons:redo-icon',
    svgstr: redoIcon,
  });

  export const fullscreenToolbarIcon = new LabIcon({
    name: 'pr-icons:fullscreen-icon',
    svgstr: fullscreenIcon,
  });

  export const statusToolbarIcon = new LabIcon({
    name: 'pr-icons:status-icon',
    svgstr: statusIcon,
  });

  export const resizer = new LabIcon({
    name: 'pr-cons:resizer',
    svgstr: resizerSvgstr,
  });
}

export default Icons;
