import React from 'react';
import ReactDOM from 'react-dom/client';
import { Providers } from '@microsoft/mgt-element';
import { Msal2Provider } from '@microsoft/mgt-msal2-provider';
// import { Provider } from 'react-redux';

import App from './App';
// import store from './store';
import reportWebVitals from './reportWebVitals';

import './index.css';

const rootTag = document.getElementById('root');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const clientId = rootTag?.getAttribute('data-client-id');
const authority = rootTag?.getAttribute('data-authority');

if (
  clientId && clientId !== '%REACT_APP_CLIENT_ID%' 
  && authority && authority !== '%REACT_APP_DATA_AUTHORITY%'
  ) {
  Providers.globalProvider = new Msal2Provider({
    clientId: clientId,
    authority: authority,
    scopes: ['user.read', 'MailboxSettings.ReadWrite']
  });

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {

  root.render(
    <React.StrictMode>
      <div className="flex h-screen">
        <div className="m-auto text-center">
          <h1 className="font-bold text-2xl">Missing configuration</h1>
          <p>
            The following environment variables are missing on the server:

            <ul className="list-disc list-inside">
              {(clientId && clientId !== '%MAILROOMINTERN_CLIENT_ID%') ? null : <li><code>MAILROOMINTERN_CLIENT_ID</code></li>}
              {authority && authority !== '%MAILROOMINTERN_APP_AUTHORITY%' ? null : <li><code>MAILROOMINTERN_APP_AUTHORITY</code></li>}
            </ul>
          </p>
        </div>
      </div>
    </React.StrictMode>
  );
}

reportWebVitals();
