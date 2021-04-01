// import { CommandToolbarButton, Toolbar, ReactWidget } from '@jupyterlab/apputils';

// import { Widget } from '@lumino/widgets';

// import { CommandRegistry } from '@lumino/commands';

// import { CommandIDs } from './commands';

// import { DashboardPanel, NewDashboard } from './dashboard';

// import { HTMLSelect } from '@jupyterlab/ui-components';

// import * as React from 'react';

// const TOOLBAR_MODE_SWITCHER_CLASS = 'pr-ToolbarModeSwitcher';
// const TOOLBAR_SELECT_CLASS = 'pr-ToolbarSelector';

// function makeToolbarButton(
//   commands: CommandRegistry,
//   dashboardId: string,
//   commandId: string,
//   tooltip: string
// ): CommandToolbarButton {
//   const args = {
//     toolbar: true,
//     dashboardId
//   }
//   const button = new CommandToolbarButton({ args, commands, id: commandId });
//   button.node.title = tooltip;
//   return button;
// }

// class DashboardModeSwitcher extends ReactWidget {
//   constructor(dashboard: NewDashboard) {
//     super();
//     this.addClass(TOOLBAR_MODE_SWITCHER_CLASS);
//     this._dashboard = dashboard;

//     if (dashboard.model) {
//       this.update();
//     }

//     dashboard.model.stateChanged.connect((_sender, change) => {
//       if (change.name === 'mode') {
//         this.update();
//       }
//     }, this);
//   }

//   private _handleChange(
//     that: DashboardModeSwitcher
//   ): (event: React.ChangeEvent<HTMLSelectElement>) => void {
//     return (event: React.ChangeEvent<HTMLSelectElement>): void => {
//       that.dashboard.model.mode = event.target.value as NewDashboard.Mode;
//     };
//   }

//   render(): JSX.Element {
//     const value = this._dashboard.model.mode;
//     return (
//       <HTMLSelect
//         className={TOOLBAR_SELECT_CLASS}
//         onChange={this._handleChange(this)}
//         value={value}
//         aria-label={'Mode'}
//       >
//         <option value="present">Present</option>
//         <option value="grid-edit">Edit</option>
//       </HTMLSelect>
//     );
//   }

//   get dashboard(): NewDashboard {
//     return this._dashboard;
//   }

//   private _dashboard: NewDashboard;
// }

// export function buildToolbar(
//   toolbar: Toolbar<Widget>,
//   commands: CommandRegistry,
//   dashboardPanel: DashboardPanel
// ): void {
//   const dashboard = dashboardPanel.dashboard;
//   const dashboardId = dashboard.id;
//   const { save, undo, redo, cut, copy, paste } = CommandIDs;

//   const commandPairs = [
//     [save, 'Save'],
//     [undo, 'Undo'],
//     [redo, 'Redo'],
//     [cut, 'Cut the selected outputs'],
//     [copy, 'Cut the selected outputs'],
//     [paste, 'Paste outputs from the clipboard'],
//   ];

//   for (const pair of commandPairs) {
//     const [ commandId, tooltip ] = pair;
//     const button = makeToolbarButton(commands, dashboardId, commandId, tooltip);
//     toolbar.addItem(commandId, button);
//   }

//   toolbar.addItem('spacer', Toolbar.createSpacerItem());

//   toolbar.addItem('switchMode', new DashboardModeSwitcher(dashboard));
// }
