import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import routes from '../config/routes';

const PageTitle = ({ isAuthenticated, setIsAuthenticated }) => {
  const location = useLocation();

  useEffect(() => {
    const currentRoute = routes(isAuthenticated, setIsAuthenticated).find(
      (route) => route.path === location.pathname
    );
    document.title = currentRoute?.title || 'Vital Dashboard';
  }, [location, isAuthenticated, setIsAuthenticated]);

  return null; // This component doesn't render anything
};

export default PageTitle;
