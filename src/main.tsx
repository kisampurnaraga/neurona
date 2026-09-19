import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { installAuthFetchInterceptor } from './utils/authFetch.ts';
import './index.css';

// Attach the stored session JWT to every same-origin /api request.
// Must run before the app issues any API call.
installAuthFetchInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

