import { action, cube, state } from 'recube';
import { Box } from '@/components/box';

const increment = action();
const count = state(0).when(increment, prev => prev + 1);

const CounterActions = cube(() => {
  return (
    <Box>
      <button onClick={() => increment()}>Increment</button>
    </Box>
  );
});

const CounterValue = cube(() => {
  // no hook needed for state binding
  return <Box flash>{count()}</Box>;
});

export default () => {
  return (
    <main>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <CounterActions />
        <CounterValue />
      </div>
    </main>
  );
};
