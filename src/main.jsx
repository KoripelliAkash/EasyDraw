import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@excalidraw/excalidraw/index.css';
import './index.css';

if (typeof window !== 'undefined' && (!window.name || window.name === '')) {
  window.name = 'easydraw_app';
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
