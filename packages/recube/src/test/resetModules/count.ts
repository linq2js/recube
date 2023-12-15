import { action } from '@/action';
import { state } from '@/state';

export const increment = action();

export const count = state(1).when(increment, prev => prev + 1);
