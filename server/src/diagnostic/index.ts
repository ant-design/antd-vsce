import { cardDiagnostic } from './card';
import { drawerDiagnostic } from './drawer';
import { dropdownDiagnostic } from './dropdown';
import { inputDiagnostic } from './input';
import { menuDiagnostic } from './menu';
import { modalDiagnostic } from './modal';

export const diagnosticMessageMap = new Map([
  ['Drawer', drawerDiagnostic],
  ['Menu', menuDiagnostic],
  ['Dropdown', dropdownDiagnostic],
  ['Modal', modalDiagnostic],
  ['Card', cardDiagnostic],
  ['Input', inputDiagnostic],
  // ['Popconfirm', modalDiagnostic],
  // ['Popover', modalDiagnostic],
]);
