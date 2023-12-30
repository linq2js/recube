import { render, fireEvent, act } from '@testing-library/react';
import { PropsWithChildren, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { action } from '../action';
import { state } from '../state';
import { delay, loadable, race, wait } from '../async';
import { swallowError } from '../testUtils';
import { alter } from '../alter';
import { cube } from './cube';

// swallow the React error boundary log
swallowError(
  /The above error occurred in one of your React components|Error: Uncaught \[Error: error\]/,
);

describe('rendering', () => {
  const Wrapper = (props: PropsWithChildren) => (
    <ErrorBoundary fallbackRender={() => <div>error</div>}>
      <Suspense fallback={<div>loading</div>}>{props.children}</Suspense>
    </ErrorBoundary>
  );

  test('should not re-render if given callbacks changed', () => {
    const rendered = jest.fn();
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const Comp = cube(
      (props: { callback: VoidFunction; otherProp: number }) => {
        rendered();
        return <div onClick={props.callback}>button{props.otherProp}</div>;
      },
    );
    const { getByText, rerender } = render(
      <Wrapper>
        <Comp callback={() => callback1()} otherProp={1} />
      </Wrapper>,
    );

    rerender(
      <Wrapper>
        <Comp callback={() => callback1()} otherProp={1} />
      </Wrapper>,
    );
    rerender(
      <Wrapper>
        <Comp callback={() => callback2()} otherProp={1} />
      </Wrapper>,
    );

    // expect component should not re-render if the input callback has been changed many times
    expect(rendered).toHaveBeenCalledTimes(1);

    // make sure otherProp passed to renderFn
    fireEvent.click(getByText('button1'));

    // make sure callback2 is called
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  test('counter', () => {
    const incrementAction = action();
    const countState = state(0).when(incrementAction, value => value + 1);

    const Comp = cube(() => {
      return <div>{countState()}</div>;
    });

    const { getByText } = render(
      <Wrapper>
        <Comp />
      </Wrapper>,
    );

    getByText('0');

    act(() => {
      incrementAction();
      incrementAction();
    });

    getByText('2');
  });

  test('wait all: success', async () => {
    const incrementReducer = (prev: number) => prev + 1;
    const increment = action();
    const state1 = state(async () => {
      await delay(10);
      return 1;
    }).when(increment, alter(incrementReducer));

    const state2 = state(async () => {
      await delay(10);
      return 2;
    }).when(increment, alter(incrementReducer));

    const Comp = cube(() => {
      const [s1, s2] = wait([state1, state2]);

      return <div>{s1 + s2}</div>;
    });

    const { getByText } = render(
      <Wrapper>
        <Comp />
      </Wrapper>,
    );

    getByText('loading');

    await act(() => delay(50));

    getByText('3');

    act(increment);

    // no need to wait for async update because mutate() function already handle resolved promise

    getByText('5');
  });

  test('wait all: error #1', async () => {
    const cond = true;
    const state1 = state(async () => {
      if (cond) {
        throw new Error('error');
      }
      return 1;
    });

    const state2 = state(async () => {
      await delay(10);
      return 2;
    });

    const Comp = cube(() => {
      const [s1, s2] = wait([state1, state2]);
      return <div>{s1 + s2}</div>;
    });

    const { getByText } = render(
      <Wrapper>
        <Comp />
      </Wrapper>,
    );

    getByText('loading');

    await act(() => delay(50));

    getByText('error');
  });

  test('wait all: error #2', async () => {
    const state1 = state((): number => {
      throw new Error('error');
    });

    const state2 = state(async () => {
      await delay(10);
      return 2;
    });

    const Comp = cube(() => {
      const [s1, s2] = wait([state1, state2] as const);
      return <div>{s1 + s2}</div>;
    });

    const { getByText } = render(
      <Wrapper>
        <Comp />
      </Wrapper>,
    );

    getByText('error');
  });

  test('loadable: success', async () => {
    const state1 = state(async () => {
      await delay(50);
      return 1;
    });

    const state2 = state(async () => {
      await delay(5);
      return 2;
    });

    const Comp = cube(() => {
      const [s1, s2] = wait(race([state1, state2]));
      return <div>{s1 || s2}</div>;
    });

    const { getByText } = render(
      <Wrapper>
        <Comp />
      </Wrapper>,
    );

    getByText('loading');

    await act(() => delay(30));

    getByText('2');
  });

  test('async action: should re-render if action result changed', async () => {
    const doSomething = action(() => delay(10));

    const Comp = cube(() => {
      const { loading } = loadable(doSomething.result);
      return <div>{loading ? 'loading' : 'none'}</div>;
    });
    const { getByText } = render(<Comp />);

    getByText('none');

    act(() => {
      doSomething();
    });

    getByText('loading');

    await act(() => delay(50));

    getByText('none');
  });

  test('sync action: should re-render if action result changed', async () => {
    const doSomething = action<number>();

    const Comp = cube(() => {
      const { data } = loadable(doSomething.result);
      return <div>{data ?? 'none'}</div>;
    });
    const { getByText } = render(<Comp />);

    getByText('none');

    act(() => doSomething(1));

    getByText('1');

    act(() => doSomething(2));

    getByText('2');
  });
});
