import { StrictMode } from 'react';
import './index.css';
import { Link, Outlet, useLocation } from '@modern-js/runtime/router';

export default function Layout() {
  const location = useLocation();

  return (
    <StrictMode>
      <div>
        {location.pathname !== '/' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              margin: 20,
            }}
          >
            <Link to="/">Back to Home</Link>
          </div>
        )}
        <Outlet />
      </div>
    </StrictMode>
  );
}
