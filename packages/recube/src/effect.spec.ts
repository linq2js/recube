import { disposable } from './disposable';
import { effect } from './effect';
import { state } from './state';

describe('effect', () => {
  test('dispose automatically', () => {
    const log = jest.fn();
    const count = state(0);
    const [{ dispose }] = disposable(() => {
      effect(() => {
        log(`run${count()}`);

        return () => {
          log('dispose');
        };
      });
    });
    count.set(1);
    dispose();

    expect(log.mock.calls).toEqual([['run0'], ['run1'], ['dispose']]);
  });
});
