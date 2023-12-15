import { count } from './count';
import { state } from '@/state';

export const doubledCount = state(() => count() * 2);
