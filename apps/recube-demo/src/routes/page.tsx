import { Link } from '@modern-js/runtime/router';

const links = {
  '/counter': 'Counter',
  '/render': 'Extreme Rendering Optimization',
  '/search': 'Search',
  '/todo': 'Todo',
  '/cancellable': 'Cancellable',
} as Record<string, string>;

const IndexPage = () => (
  <div className="container-box">
    <main>
      <h1>Recube Demo</h1>
      <ul>
        {Object.keys(links).map(key => (
          <li key={key}>
            <Link to={key}>{links[key]}</Link>
          </li>
        ))}
      </ul>
    </main>
  </div>
);

export default IndexPage;
