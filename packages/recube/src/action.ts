import { createAction } from './createAction';
import { CreateAction } from './types';

export const action: CreateAction = (...args: any[]) => {
  if (typeof args[0] === 'function') {
    return createAction(args[0], args[1]);
  }
  return createAction(undefined, args[0]);
};
