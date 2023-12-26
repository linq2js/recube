import { state } from '../../state';
import { action } from '../../action';

export const increment = action();

export const count = state(1).when(increment, prev => prev + 1);
