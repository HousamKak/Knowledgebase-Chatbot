// Update React 18 rendering method
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/App.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);