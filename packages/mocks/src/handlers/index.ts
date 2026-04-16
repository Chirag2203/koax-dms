import { vehicleHandlers } from './vehicles';
import { outletHandlers } from './outlets';
import { articleHandlers } from './articles';

export const handlers = [
  ...vehicleHandlers,
  ...outletHandlers,
  ...articleHandlers,
];
