import { createActionFactory } from './createAction';
import { createState } from './createState';
import { CreateAction } from './types';

export const action: CreateAction = createActionFactory((init, options) =>
  createState(() => ({}), init, options),
);
