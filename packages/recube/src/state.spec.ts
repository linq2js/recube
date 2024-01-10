import { action } from './action';
import { delay } from './async';
import { cancellable } from './cancellable';
import { state } from './state';

describe('family', () => {
  test('#1', () => {
    const increment = action();
    const countFamily = state((_name: 'first' | 'second') => 1).when(
      increment,
      prev => prev + 1,
    );

    expect(countFamily('first')).toBe(1);
    increment();
    expect(countFamily('first')).toBe(2);
    expect(countFamily('second')).toBe(1);
    increment();
    expect(countFamily('first')).toBe(3);
    expect(countFamily('second')).toBe(2);
  });
});

describe('mutable stable', () => {
  test('mutable', () => {
    const count = state(1);
    count.set(2);
    expect(count()).toBe(2);
    count.set(prev => prev + 1);
    expect(count()).toBe(3);
  });

  test('immutable', () => {
    const increment = action();
    const count = state(1).when(increment, prev => prev + 1);
    expect(() => (count as any).set(2)).toThrow();
  });
});

describe('when', () => {
  test('use action result as next state', async () => {
    const set = action<number>();
    const setAsync = action(async (payload: number) => {
      await delay(10);
      return payload;
    });
    const transform = action((payload: number) => payload + 1);
    const count = state(1).when(set).when(setAsync).when(transform);

    expect(count()).toBe(1);
    set(2);
    expect(count()).toBe(2);
    transform(3);
    expect(count()).toBe(4);
    setAsync(5);
    await delay(20);
    expect(count()).toBe(5);
  });

  test('error #1', () => {
    const increment = action();
    const count = state(1).when(increment, () => {
      throw new Error('error');
      return 1;
    });
    // It's necessary to create an instance of the state first; otherwise, dispatching an action will have no effect
    count();
    increment();
    expect(count).toThrow('error');
  });

  test('error #2', () => {
    const increment = action();
    const count = state(1).when(increment.recent(), () => {
      throw new Error('error');
      return 1;
    });
    increment();
    expect(count).toThrow('error');
  });
});

describe('derived state', () => {
  test('conditional', () => {
    type PriceType = 'discount' | 'origin';
    const changePrice = action<number>();
    const changePriceType = action<PriceType>();
    const changeDiscount = action<number>();
    const priceType = state<PriceType>('discount').when(changePriceType);
    const price = state(10).when(changePrice);
    const discount = state(0.1).when(changeDiscount);
    const finalPrice = state(() => {
      if (priceType() === 'discount') {
        return price() - price() * discount();
      }
      // no discount dependency
      return price();
    });

    expect(finalPrice()).toBe(9);
    // changing `price` should affects `finalPrice`
    changePrice(20);
    expect(finalPrice()).toBe(18);
    changePriceType('origin');
    expect(finalPrice()).toBe(20);
    // changing discount does not affect finalPrice
    changeDiscount(0.5);
    expect(finalPrice()).toBe(20);
  });

  test('error', () => {
    const root = state(() => {
      throw new Error('error');
      return 1;
    });
    const derived = state(() => root() * 2);
    expect(derived).toThrow('error');
  });
});

describe('canceler', () => {
  test('canceler must exist when recomputing/reducing state', () => {
    const increment = action();
    const count = state(() => {
      const cc = cancellable();
      expect(cc).not.toBeUndefined();

      return 1;
    }).when(increment, prev => {
      const cc = cancellable();
      expect(cc).not.toBeUndefined();
      return prev;
    });

    count();
    increment();
  });
});

describe('staling', () => {
  test('error', () => {
    let throwError = true;
    const log = jest.fn();
    const stale = action();
    const factor = state(() => {
      log('factor:compute');
      return 2;
    });
    const count = state(() => {
      if (throwError) {
        throwError = false;
        throw new Error('invalid');
      }
      return 1;
    });
    const doubledCount = state(
      () =>
        // dont put factor() behind count() because we need to make sure factor() must be called no matter count() throws error or not
        factor() * count(),
    ).when(stale, {
      stale: true,
    });
    expect(doubledCount).toThrow('invalid');
    stale();
    expect(doubledCount()).toBe(2);
    expect(log).toHaveBeenCalledTimes(1);
  });

  test('all', () => {
    let throwError = true;
    const log = jest.fn();
    const stale = action();
    const factor = state(() => {
      log('factor:compute');
      return 2;
    });
    const count = state(() => {
      if (throwError) {
        throwError = false;
        throw new Error('invalid');
      }
      return 1;
    });
    const doubledCount = state(
      () =>
        // dont put factor() behind count() because we need to make sure factor() must be called no matter count() throws error or not
        factor() * count(),
    ).when(stale, {
      stale: true,
      includeDependencies: 'all',
    });
    expect(doubledCount).toThrow('invalid');
    stale();
    expect(doubledCount()).toBe(2);
    expect(log).toHaveBeenCalledTimes(2);
  });
});
