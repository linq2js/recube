import { state } from '../../state';
import { count } from './count';

export const doubledCount = state(() => count() * 2);
