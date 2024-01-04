import { Link } from '@modern-js/runtime/router';

const links = {
  '/counter': 'Counter',
  '/todoList': 'TodoList',
  '/renderingOptimization': 'Rendering Optimization',
  '/search': 'Search',
  '/cancellable': 'Cancellable',
  '/conditionalDependency': 'Conditional Dependency',
  '/distinct': 'Distinct',
  '/loadable': 'Loadable',
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
