import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import Header from './components/toolbars/Header';
import Footer from './components/toolbars/Footer';
import PageTitle from './components/PageTitle';
import Sidebar from './components/toolbars/Sidebar';
import routes from './config/routes';
import store, { persistor } from './store/store';


const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check localStorage for authToken after the component mounts
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(token !== null);
  }, []);

  
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
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
        <Router>
          <PageTitle isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
          <div
            style={{
              display: 'flex',
              height: '100vh',
              overflow: 'hidden',
              backgroundColor: '#f5f5f5',
            }}
          >
            {isAuthenticated && <Sidebar />}
            <div
              style={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {isAuthenticated && <Header onLogout={handleLogout} />}
              <div
                style={{
                  flexGrow: 1,
                  overflow: 'auto',
                  padding: '20px',
                  backgroundColor: 'white',
                }}
              >
                <Routes>
                  {routes(isAuthenticated, setIsAuthenticated).map(({ path, element }, idx) => (
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
