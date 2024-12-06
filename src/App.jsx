import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/toolbars/Header';
import Sidebar from './components/toolbars/Sidebar';
import routes from './config/routes';

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
    <Router>
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
        </div>
      </div>
    </Router>
  );
};

export default App;
