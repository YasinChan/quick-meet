import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { config as AmapReactConfig } from '@amap/amap-react';

AmapReactConfig.key = process.env.REACT_APP_AMAP_WEB_KEY;

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);
