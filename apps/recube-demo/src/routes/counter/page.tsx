import { action, state } from 'recube';
import { cube } from 'recube/react';
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

const CounterPage = () => {
  return (
    <main>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <CounterActions />
        <CounterValue />
      </div>
    </main>
  );
};

export default CounterPage;
