import {
  LabIcon
} from '@jupyterlab/ui-components';

import whiteDashboardSvgstr from '../style/icons/dashboard_icon_filled_white.svg';
import greyDashboardSvgstr from '../style/icons/dashboard_icon_filled_grey.svg';
import blueDashboardSvgstr from '../style/icons/dashboard_icon_filled_blue.svg';
import whiteDashboardOutlineSvgstr from '../style/icons/dashboard_icon_outline_white.svg';
import greyDashboardOutlineSvgstr from '../style/icons/dashboard_icon_outline_grey.svg';


/**
 * Dashboard icons
 */
export
namespace Icons {

  export const whiteDashboard = new LabIcon({ name: 'pr-icons:white-dashboard', svgstr: whiteDashboardSvgstr});

  export const greyDashboard = new LabIcon({ name: 'pr-icons:grey-dashboard', svgstr: greyDashboardSvgstr});

  export const blueDashboard = new LabIcon({ name: 'pr-icons:blue-dashboard', svgstr: blueDashboardSvgstr});

  export const whiteDashboardOutline = new LabIcon({ name: 'pr-icons:white-dashboard-icon', svgstr: whiteDashboardOutlineSvgstr});

  export const greyDashboardOutline = new LabIcon({ name: 'pr-icons:grey-dashboard-outline', svgstr: greyDashboardOutlineSvgstr});
}


export default Icons;