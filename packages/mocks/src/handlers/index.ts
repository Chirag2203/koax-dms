import { vehicleHandlers } from './vehicles';
import { outletHandlers } from './outlets';
import { articleHandlers } from './articles';
import { portalHandlers } from './portal';
import { consignorHandlers } from './consignor';
import { staffHandlers } from './staff';
import { inventoryHandlers } from './inventory';
import { salesHandlers } from './sales';
import { serviceHandlers } from './service';

export const handlers = [
  ...vehicleHandlers,
  ...outletHandlers,
  ...articleHandlers,
  ...portalHandlers,
  ...consignorHandlers,
  ...staffHandlers,
  ...inventoryHandlers,
  ...salesHandlers,
  ...serviceHandlers,
];
