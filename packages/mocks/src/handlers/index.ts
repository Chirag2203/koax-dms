import { vehicleHandlers } from './vehicles';
import { outletHandlers } from './outlets';
import { articleHandlers } from './articles';
import { portalHandlers } from './portal';

export const handlers = [
  ...vehicleHandlers,
  ...outletHandlers,
  ...articleHandlers,
  ...portalHandlers,
];
