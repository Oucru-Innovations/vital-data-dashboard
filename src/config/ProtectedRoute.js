import React, { useEffect } from 'react';
import { isAuthenticated } from '../state/cookies';

const VITAL_LOG_URL = process.env.REACT_APP_VITAL_LOG_URL;
const VITAL_LOG_LOGIN = `${VITAL_LOG_URL}/login`;

const ProtectedRoute = ({ children }) => {
    useEffect(() => {
        if (!isAuthenticated()) {
            window.location.href = VITAL_LOG_LOGIN;
        }
    }, []);

    if (!isAuthenticated()) {
        return null;
    }

    return children;
};

export default ProtectedRoute;
