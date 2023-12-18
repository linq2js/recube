import { Link } from '@modern-js/runtime/router';

const Index = () => (
  <div className="container-box">
    <main>
      <h1>Recube Demo</h1>
      <ul>
        <li>
          <Link to="/counter">Counter</Link>
        </li>
        <li>
          <Link to="/render">Extreme Rendering Optimization</Link>
        </li>
        <li>
          <Link to="/search">Search</Link>
        </li>
        <li>
          <Link to="/todo">Todo</Link>
        </li>
      </ul>
    </main>
  </div>
);

export default Index;
