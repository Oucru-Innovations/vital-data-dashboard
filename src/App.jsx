import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { isAuthenticated, removeAccessToken, removeRefreshToken } from './state/cookies';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Header from './components/toolbars/Header';
import Footer from './components/toolbars/Footer';
import PageTitle from './components/PageTitle';
import Sidebar from './components/toolbars/Sidebar';
import routes from './config/routes';
import store, { persistor } from './store/store';

const routerBaseName = (process.env.REACT_APP_BASENAME || '').replace(/\/$/, '');
const VITAL_LOG_URL = process.env.REACT_APP_VITAL_LOG_URL;

const App = () => {
  const [authed, setAuthed] = useState(isAuthenticated());

  const handleLogout = () => {
    removeAccessToken();
    removeRefreshToken();
    window.location.href = `${VITAL_LOG_URL}/logout`;
  };

  return (
    // Redux Provider: Makes Redux store available to all components
    <Provider store={store}>
      {/*
        PersistGate: Delays rendering until persisted state is retrieved from localStorage
        loading: Optional loading component shown while rehydrating state
        persistor: The persistor instance from store configuration
      */}
      <PersistGate loading={null} persistor={persistor}>
        <Router basename={routerBaseName || undefined}>
          <PageTitle isAuthenticated={authed} setIsAuthenticated={setAuthed} />
          <div
            style={{
              display: 'flex',
              height: '100vh',
              overflow: 'hidden',
              backgroundColor: '#f5f5f5',
            }}
          >
            {authed && <Sidebar />}
            <div
              style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {authed && <Header onLogout={handleLogout} />}
              <div
                style={{
                  flexGrow: 1,
                  overflow: 'auto',
                  padding: '20px',
                  backgroundColor: 'white',
                }}
              >
                <Routes>
                  {routes(authed, setAuthed).map(({ path, element }, idx) => (
                    <Route key={idx} path={path} element={element} />
                  ))}
                </Routes>
              </div>
              {/* {isAuthenticated && <Footer />} */}
            </div>
          </div>
        </Router>
      </PersistGate>
    </Provider>
  );
};

export default App;
