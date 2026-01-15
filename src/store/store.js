/**
 * Redux Store Configuration for Vital Data Dashboard
 *
 * This file configures the Redux store with the following features:
 * 1. Redux Toolkit for simplified state management
 * 2. Redux Persist for caching state in localStorage
 * 3. Study slice for managing study/site/ward filter selections
 *
 * The persisted state allows filter selections to survive page refreshes,
 * providing a better user experience.
 */

import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // Uses localStorage
import { combineReducers } from 'redux';

// Import reducers
import studyReducer from './studySlice';

/**
 * Redux Persist Configuration
 *
 * key: The key used to store data in localStorage
 * storage: The storage engine (localStorage in browser)
 * whitelist: Which reducers to persist (only 'study' in this case)
 *
 * The persisted state will be stored in localStorage under key 'vital-dashboard-root'
 * This allows filter selections to persist across browser refreshes
 */
const persistConfig = {
  key: 'vital-dashboard-root',
  storage,
  whitelist: ['study'], // Only persist the study slice
};

/**
 * Root Reducer
 *
 * Combines all feature-specific reducers into a single root reducer.
 * Currently includes:
 * - study: Manages study, site, and ward filter selections
 *
 * To add more features, import their reducers and add them here:
 * const rootReducer = combineReducers({
 *   study: studyReducer,
 *   user: userReducer,     // Add user management
 *   settings: settingsReducer, // Add app settings
 * });
 */
const rootReducer = combineReducers({
  study: studyReducer,
});

/**
 * Persisted Root Reducer
 *
 * Wraps the root reducer with Redux Persist functionality.
 * This enables automatic serialization/deserialization of state to/from localStorage.
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Configure and create the Redux store
 *
 * Uses Redux Toolkit's configureStore which includes:
 * - Redux DevTools Extension integration (automatic in development)
 * - Redux Thunk middleware for async actions (built-in)
 * - Immutability and serializability checks in development
 *
 * The middleware configuration disables serializability checks for Redux Persist
 * actions to prevent warnings about non-serializable values.
 */
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable serializability check for Redux Persist actions
      // Redux Persist uses non-serializable values internally (like PERSIST, REHYDRATE)
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

/**
 * Create the persistor
 *
 * The persistor manages the persistence lifecycle:
 * - Saves state to localStorage when state changes
 * - Loads persisted state on app initialization
 * - Provides methods to pause/purge persistence if needed
 *
 * Usage in App.js:
 * import { Provider } from 'react-redux';
 * import { PersistGate } from 'redux-persist/integration/react';
 * import store, { persistor } from './store/store';
 *
 * <Provider store={store}>
 *   <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
 *     <App />
 *   </PersistGate>
 * </Provider>
 */
export const persistor = persistStore(store);

// Export the store as default
export default store;
