'use server';

import { revalidatePath } from 'next/cache';
import { action, alter, delay, state } from 'recube';

export const increment = action();
export const asyncCount = state(async () => {
  await delay(1000);
  return 1;
}).when(
  increment,
  alter(prev => prev + 1),
);

export async function doSomething() {
  increment();
  revalidatePath('/rsc');
}
