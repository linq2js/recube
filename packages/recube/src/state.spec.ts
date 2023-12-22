import { action } from './action';
import { delay } from './async';
import { canceler } from './canceler';
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
});

describe('canceler', () => {
  test('canceler must exist when recomputing/reducing state', () => {
    const increment = action();
    const count = state(() => {
      const cc = canceler.current();
      expect(cc).not.toBeUndefined();

      return 1;
    }).when(increment, prev => {
      const cc = canceler.current();
      expect(cc).not.toBeUndefined();
      return prev;
    });

    count();
    increment();
  });
});
