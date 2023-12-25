/* eslint-disable max-nested-callbacks */
import { action } from './action';
import { delay, wait } from './async';
import { state } from './state';

describe('async', () => {
  test('wait() should inject current watcher to async thread automatically', async () => {
    const s1 = state(1);
    const s2 = state(2);
    const s3 = state(3);
    const s4 = state(4);
    const change4 = s4.action(prev => prev + 1);
    const sum = state(() => {
      const v1 = s1() + s2();
      return wait([s3, delay(10)] as const, ([v2]) => {
        return wait(s4, v3 => v1 + v2 + v3);
      });
    });
    const sum1 = sum();
    await expect(sum1).resolves.toBe(10);
    // when I change s4, I expect the sum state should be recomputed
    change4();
    const sum2 = sum();
    await expect(sum2).resolves.toBe(11);
  });

  test('loading', async () => {
    const updateProfile = action(async () => {
      await delay(10);
      return 'Updated';
    });
    const value = state('Origin')
      .when(updateProfile.loading, () => 'Updating')
      .when(updateProfile);

    expect(value()).toBe('Origin');
    updateProfile();
    expect(value()).toBe('Updating');
    await delay(20);
    expect(value()).toBe('Updated');
  });

  test('failed', async () => {
    const updateProfile = action(async () => {
      await delay(10);
      throw new Error();
      return 'Updated';
    });
    const value = state('Origin')
      .when(updateProfile.loading, () => 'Updating')
      .when(updateProfile.failed, () => 'Failed')
      .when(updateProfile);

    expect(value()).toBe('Origin');
    updateProfile();
    expect(value()).toBe('Updating');
  });
});
