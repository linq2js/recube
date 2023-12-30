/* eslint-disable max-nested-callbacks */
import { action } from './action';
import { alter } from './alter';
import { asyncResult, delay, all, loadable, wait } from './async';
import { state } from './state';

describe('async', () => {
  test('wait() should inject current watcher to async thread automatically', async () => {
    const change4 = action();
    const s1 = state(1);
    const s2 = state(2);
    const s3 = state(3);
    const s4 = state(Promise.resolve(4)).when(
      change4,
      alter(prev => prev + 1),
    );
    const sum = state(() => {
      const v1 = s1() + s2();
      return all([s3, delay(10)] as const).then(([v2]) =>
        all(s4).then(v3 => v1 + v2 + v3),
      );
    });
    const sum1 = sum();
    sum1.catch(console.log);
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

describe('loadable', () => {
  test('loadable: array', () => {
    const [l1, l2, l3] = loadable([
      undefined,
      asyncResult.resolve(1),
      asyncResult.reject('error'),
    ] as const);

    expect(l1).toEqual({ data: undefined });
    expect(l2).toEqual({ data: 1 });
    expect(l3).toEqual({ error: 'error' });
  });

  test('loadable: object', () => {
    const r = loadable({
      l1: undefined,
      l2: asyncResult.resolve(1),
      l3: asyncResult.reject('error'),
    });

    expect(r.l1).toEqual({ data: undefined });
    expect(r.l2).toEqual({ data: 1 });
    expect(r.l3).toEqual({ error: 'error' });
  });
});

describe('wait', () => {
  test('wait: fulfilled', () => {
    const r = wait([asyncResult.resolve(1), asyncResult.resolve(true)]);
    expect(r).toEqual([1, true]);
  });

  test('wait: loading', () => {
    expect(() => wait(Promise.resolve(1))).toThrow();
  });

  test('wait: error', () => {
    expect(() => wait(asyncResult.reject('error'))).toThrow('error');
  });
});
