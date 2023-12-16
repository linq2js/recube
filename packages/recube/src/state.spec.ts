import { action } from './action';
import { delay } from './async';
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
