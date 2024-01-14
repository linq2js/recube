import { batch, state } from 'recube';
import { cube, rx } from 'recube/react';
import { useEffect } from 'react';

const startTime = Date.now();
const duration = 30000;
const numElements = 100;

const colors = state((_: number) => '');
const numColorUpdates = state(0);
const secondsRunning = state(0);
const updateInfo = () => {
  numColorUpdates.set(x => x + 1);
  secondsRunning.set((Date.now() - startTime) / 1000);
};

const Cell = cube(({ n }) => {
  return (
    <div
      style={{
        width: 50,
        height: 50,
        textAlign: 'center',
        float: 'left',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors(n),
      }}
    >
      {n}
    </div>
  );
});

const Matrix = () => {
  return (
    <div style={{ width: 500 }}>
      {new Array(numElements).fill(null).map((_, n) => (
        <Cell key={n} n={n} />
      ))}
    </div>
  );
};

const Info = () => {
  return (
    <>
      <h1 style={{ fontWeight: 100 }}>{rx(secondsRunning)}</h1>
      <div>{rx(numColorUpdates)} colors</div>
      <div>
        {rx(() => Math.floor(numColorUpdates() / secondsRunning()))} colors per
        second
      </div>
    </>
  );
};

function setColor(n: number) {
  batch(() => {
    colors.set(`#${Math.floor(Math.random() * 16777215).toString(16)}`, n);
    updateInfo();
  });
  if (Date.now() - startTime >= duration) {
    return;
  }
  setTimeout(() => setColor(n), 0);
}

const PerformancePage = () => {
  useEffect(() => {
    setTimeout(() => {
      for (let n = 0; n < numElements; n++) {
        setColor(n);
      }
    });
  }, []);

  return (
    <div className="container-box">
      <main>
        <div>
          <h1>RECUBE</h1>
          <a
            href="https://codesandbox.io/s/redux-performance-hbit7?file=/src/App.js"
            target="_blank"
          >
            Checkout Redux implementation
          </a>
          <div>
            <Info />
            <Matrix />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PerformancePage;
