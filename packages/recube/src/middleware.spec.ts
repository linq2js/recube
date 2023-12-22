import { action } from './action';
import { delay } from './async';
import {
  debounce,
  throttle,
  droppable,
  restartable,
  sequential,
  toggle,
} from './middleware';

const asyncCall = async (payload: { value: number; ms?: number }) => {
  await delay(payload.ms ?? 10);
  return payload.value;
};

describe('droppable', () => {
  test('#1', async () => {
    const log = jest.fn();
    const doSomething = action(asyncCall).use(droppable());
    doSomething.on(log);

    doSomething({ value: 1 });
    doSomething({ value: 2 });
    doSomething({ value: 3 });
    await delay(15);
    expect(log).toHaveBeenCalledWith(1);
  });
});

describe('restartable', () => {
  test('#1', async () => {
    const log = jest.fn();
    const doSomething = action(asyncCall).use(restartable());
    doSomething.on(log);

    doSomething({ value: 1 });
    doSomething({ value: 2 });
    doSomething({ value: 3 });
    await delay(15);
    expect(log).toHaveBeenCalledWith(3);
  });
});

describe('sequential', () => {
  test('#1', async () => {
    const log = jest.fn();
    const doSomething = action(asyncCall).use(sequential());
    doSomething.on(log);

    doSomething({ value: 1, ms: 10 });
    doSomething({ value: 2, ms: 5 });
    doSomething({ value: 3, ms: 0 });
    await delay(30);
    expect(log.mock.calls).toEqual([[1], [2], [3]]);
  });
});

describe('toggle', () => {
  test('should enable action after specified action dispatched', () => {
    const log = jest.fn();
    const login = action(log.bind(null, 'login'));
    const logout = action(log.bind(null, 'logout')).use(toggle({ on: login }));

    logout();
    logout();
    logout();

    expect(log).toHaveBeenCalledTimes(0);
    login();
    logout();
    expect(log.mock.calls).toEqual([['login'], ['logout']]);
  });

  test('self disabled', () => {
    const log = jest.fn();
    const login = action(log.bind(null, 'login')).use(toggle({ off: 'self' }));

    login();
    // at this time, the login action is disabled
    login();
    login();
    login();

    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe('debounce', () => {
  test('#1', async () => {
    const log = jest.fn();
    const doSomething = action(log.bind(null, 'doSomething')).use(debounce(10));
    doSomething();
    doSomething();
    doSomething();

    expect(log).toHaveBeenCalledTimes(0);
    await delay(50);
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  test('#1', async () => {
    const log = jest.fn();
    const doSomething = action(log.bind(null, 'doSomething')).use(throttle(50));
    doSomething();
    expect(log).toHaveBeenCalledTimes(1);
    await delay(10);
    expect(log).toHaveBeenCalledTimes(1);
    doSomething();
    expect(log).toHaveBeenCalledTimes(1);
    await delay(60);
    doSomething();
    expect(log).toHaveBeenCalledTimes(2);
  });
});
