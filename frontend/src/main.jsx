import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { SelectionProvider } from './context/SelectionContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/global.css';
import './styles/admin.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SelectionProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SelectionProvider>
    </BrowserRouter>
  </React.StrictMode>
);
