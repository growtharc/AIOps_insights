
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';

// const basename = import.meta.env.PROD ? '/aiinsights/' : '/';
const basename = '/insight_aiops/';
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
    <App />
    </BrowserRouter>
  </React.StrictMode>
);
