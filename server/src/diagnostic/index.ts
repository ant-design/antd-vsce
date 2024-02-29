import { cardDiagnostic } from './card';
import { drawerDiagnostic } from './drawer';
import { dropdownDiagnostic } from './dropdown';
import { inputDiagnostic } from './input';
import { menuDiagnostic } from './menu';
import { modalDiagnostic } from './modal';
import { tooltipDiagnostic } from './tooltip';

export const diagnosticMessageMap = new Map([
  ['Drawer', drawerDiagnostic],
  ['Menu', menuDiagnostic],
  ['Dropdown', dropdownDiagnostic],
  ['Modal', modalDiagnostic],
  ['Card', cardDiagnostic],
  ['Input', inputDiagnostic],
  ['Tooltip', tooltipDiagnostic],
  // ['Popconfirm', modalDiagnostic],
  // ['Popover', modalDiagnostic],
]);
