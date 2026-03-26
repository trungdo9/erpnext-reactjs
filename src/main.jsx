import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import { queryClient } from './api/queries/queryConfig';
import ErrorTracker from './services/ErrorTracker';
import { initPerformanceMonitoring } from './utils/performance';
import { initAnalytics } from './utils/analytics';
import './index.css';

// Initialize error tracking
ErrorTracker.init({
    enabled: true,
    sampleRate: import.meta.env.PROD ? 1.0 : 1.0,
});

// Initialize performance monitoring (Web Vitals)
initPerformanceMonitoring();

// Initialize analytics (configure provider in production)
initAnalytics({
    enabled: import.meta.env.PROD,
    debug: import.meta.env.DEV,
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);
