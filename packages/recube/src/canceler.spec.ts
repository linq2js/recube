import { canceler } from './canceler';

describe('cancellable', () => {
  test('cancel if any', () => {
    const c1 = canceler();
    const c2 = canceler();
    const c3 = canceler.any(c1, c2);
    expect(c3.cancelled()).toBeFalsy();
    c1.cancel('C');
    expect(c3.cancelled).toBeTruthy();
    expect(() => c3.throwIfCancelled()).toThrow('C');
  });
});
