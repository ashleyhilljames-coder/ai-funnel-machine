import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MissionControlApp from './components/mission-control/MissionControlApp';
import './index.css';

const urlParams = new URLSearchParams(window.location.search);
const pathname = window.location.pathname;

const isMissionControl =
  urlParams.has('view') ||
  urlParams.has('admin') ||
  pathname.startsWith('/admin') ||
  pathname.startsWith('/mission-control');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isMissionControl ? <MissionControlApp /> : <App />}
  </React.StrictMode>,
);
