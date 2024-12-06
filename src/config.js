// src/config.js

// const config = {
//     useMock: process.env.REACT_APP_USE_MOCK === 'true',
// };

// src/config.js

const env = process.env;

const config = {
    mode: env.REACT_APP_MODE || 'dev', // Default to 'dev'
    dataMode: env.REACT_APP_DATA_MODE || 'mock', // Default to 'mock'

    // Base URLs
    baseUrls: {
        mock: env.REACT_APP_API_URL_MOCK,
        local: env.REACT_APP_API_URL_LOCAL,
        dev: env.REACT_APP_API_URL_DEV,
        deploy: env.REACT_APP_API_URL_DEPLOY,
    },

    getBaseUrl() {
        const dataMode = this.dataMode;
        return this.baseUrls[dataMode] || this.baseUrls.mock; // Fallback to mock URL
    },
};

export default config;
