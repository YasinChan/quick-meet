import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import { config as AmapReactConfig } from '@amap/amap-react';

AmapReactConfig.key = '8331532e931a9af572b0409028801e6b';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);
