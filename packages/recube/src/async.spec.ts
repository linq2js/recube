import { action } from './action';
import { alter } from './alter';
import { all, async, delay, loadable, race, wait } from './async';
import { state } from './state';

describe('async', () => {
  test('no need to wait if all promises are resolved', () => {
    const v1 = async(1);
    const v2 = async(2);
    const v3 = race({ v1, v2 });
    const v4 = all({ v3 });
    const v5 = async({ v4 }, x => x.v4);
    expect(v5.data).toEqual({ v3: { v1: 1 } });
  });

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

      return async(
        { _delay: delay(10), v2: s3() },
        ({ v2 }) => ({ v2, v3: s4() }),
        ({ v2, v3 }) => v1 + v2 + v3,
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

  test('func #1', async () => {
    const fn = (p: number) => p;
    const increment = action(async.func(() => Promise.resolve(fn)));
    const count = state(1).when(increment, (prev, result) => prev + result);
    expect(count()).toBe(1);
    increment(2);
    await delay(10);
    expect(count()).toBe(3);
  });

  test('func #2', async () => {
    const fn = (p: number) => p;
    const increment = action(
      async.func(() => Promise.resolve({ default: fn })),
    );
    const count = state(1).when(increment, (prev, result) => prev + result);
    expect(count()).toBe(1);
    increment(2);
    await delay(10);
    expect(count()).toBe(3);
  });
});

describe('loadable', () => {
  test('loadable: array', () => {
    const [l1, l2, l3] = loadable([
      undefined,
      async(1),
      async.reject('error'),
    ] as const);

    expect(l1).toEqual({ data: undefined });
    expect(l2).toEqual({ data: 1 });
    expect(l3).toEqual({ error: 'error' });
  });

  test('loadable: object', () => {
    const r = loadable({
      l1: undefined,
      l2: async(1),
      l3: async.reject('error'),
    });

    expect(r.l1).toEqual({ data: undefined });
    expect(r.l2).toEqual({ data: 1 });
    expect(r.l3).toEqual({ error: 'error' });
  });
});

describe('wait', () => {
  test('wait: fulfilled', () => {
    const r = wait([async(1), async(true)]);
    expect(r).toEqual([1, true]);
  });

  test('wait: loading', () => {
    expect(() => wait(Promise.resolve(1))).toThrow();
  });

  test('wait: error', () => {
    expect(() => wait(async.reject('error'))).toThrow('error');
  });
});
