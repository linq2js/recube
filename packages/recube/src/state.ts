import { createDef } from './createState';
import { StateOptions } from './types';

/**
 * create a state
 * @param init initial value or a function returns initial value
 * @param stateOptions
 * @returns
 */
export const state = <T, P = void>(
  init: T | ((params: P) => T),
  stateOptions?: StateOptions<T>,
) => {
  return createDef(init, stateOptions);
};
