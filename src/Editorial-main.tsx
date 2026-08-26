import React from 'react';
import ReactDOM from 'react-dom/client';
import EditorialApp from './EditorialApp.tsx';
import './EditorialApp.css'; // Points directly to your custom enterprise style rules

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EditorialApp />
  </React.StrictMode>,
);