import Cookies from 'js-cookie';

const DOMAIN = '.oucru.org';
const AUTH_DOMAIN = 'vital-auth.oucru.org';

const getAccessToken = () => Cookies.get('access_token');
const getRefreshToken = () => Cookies.get('refresh_token');


const removeAccessToken = () => {
    Cookies.remove('access_token');
    Cookies.remove('access_token', { domain: DOMAIN });
    Cookies.remove('access_token', { domain: AUTH_DOMAIN });
};

const removeRefreshToken = () => {
    Cookies.remove('refresh_token');
    Cookies.remove('refresh_token', { domain: DOMAIN });
    Cookies.remove('refresh_token', { domain: AUTH_DOMAIN });
};

const isAuthenticated = () =>
    getAccessToken() !== undefined && getRefreshToken() !== undefined;

export {
    getAccessToken,
    getRefreshToken,
    removeAccessToken,
    removeRefreshToken,
    isAuthenticated,
};
