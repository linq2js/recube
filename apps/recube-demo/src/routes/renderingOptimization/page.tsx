import { useEffect, useState } from 'react';
import { action, state } from 'recube';
import { cube, propsChangeOptimization } from 'recube/react';
import { Box } from '@/components/box';

const log = action<string>();
const logs = state<string[]>([]).when(log, (prev, text) => prev.concat(text));

const LogSection = cube(() => {
  return (
    <div>
      <h2>Log</h2>
      <pre>{logs().join('\n')}</pre>
    </div>
  );
});

/**
 * this component has no prop usages, it renders one time only even its props is changed by parent component
 */
const RenderOnce = cube((_: { callback: VoidFunction }) => {
  useEffect(() => {
    log('RenderOnce');
  });

  return (
    <Box flash>
      <strong>Render Once</strong>
      <div>This component render once. It has no prop accessing</div>
    </Box>
  );
});

const RenderOnceButCallbacksAreStable = cube(
  (props: { callback: VoidFunction }) => {
    useEffect(() => {
      log('RenderOnceButCallbacksAreStable');
    });

    return (
      <Box flash>
        <strong>Render Once But Callbacks Are Stable</strong>
        <div>This component renders once but all callbacks are stable</div>
        <button onClick={() => props.callback()}>Show count</button>
      </Box>
    );
  },
);

const ReRenderIfNonFunctionPropsChanged = cube(
  ({ count, callback }: { count: number; callback: VoidFunction }) => {
    useEffect(() => {
      log(`RenderIfNonFunctionPropsChanged count = ${count}`);
    });

    return (
      <Box flash>
        <strong>ReRender If Non-Function Props Changed</strong>
        <div>This component re-renders when non-function props changed</div>
        <button onClick={callback}>Show count</button>
      </Box>
    );
  },
);

const Parent = () => {
  const [count, setCount] = useState(1);
  const rerender = useState({})[1];
  // every time the Parent component re-renders, the `callback` is new
  const callback = () => (window as any).alert(count);

  useEffect(() => {
    log('Parent');
  });

  return (
    <div
      style={{
        border: '1px solid black',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <strong>Parent component</strong>
      <div>
        <button onClick={() => rerender({})}>Re-render</button>
        <button onClick={() => setCount(count + 1)}>
          Change count {count}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <RenderOnce callback={callback} />
        <ReRenderIfNonFunctionPropsChanged count={count} callback={callback} />
        <RenderOnceButCallbacksAreStable callback={callback} />
      </div>
    </div>
  );
};

const RenderPage = () => {
  const [enabled, setEnabled] = useState(() => propsChangeOptimization());
  const handleChange = (value: boolean) => {
    setEnabled(value);
    propsChangeOptimization(value);
  };

  useEffect(() => () => propsChangeOptimization(true), []);

  return (
    <div className="container-box">
      <main>
        <h1>Rendering Optimization</h1>
        <div>
          <label>
            Enable Props Change Optimization{' '}
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => handleChange(!enabled)}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Parent key={String(enabled)} />
          <LogSection />
        </div>
      </main>
    </div>
  );
};

export default RenderPage;
