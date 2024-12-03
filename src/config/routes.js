import React, { lazy, Suspense } from 'react';
import ProtectedRoute from '../config/ProtectedRoute';

// Lazy-load pages
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Overview = lazy(() => import('../pages/Overview'));
const Wearables = lazy(() => import('../pages/Wearables'));
const Ultrasound = lazy(() => import('../pages/Ultrasound'));
const Images = lazy(() => import('../pages/Images'));
const Login = lazy(() => import('../pages/Login'));

// Fallback Component
const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <h3>Loading...</h3>
  </div>
);

const routes = (isAuthenticated, onLogin) => [
  {
    path: '/login',
    element: (
      <Suspense fallback={<Loading />}>
        <Login onLogin={onLogin} />
      </Suspense>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <Dashboard />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <Overview />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/wearables',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <Wearables />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/ultrasound',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <Ultrasound />
        </Suspense>
      </ProtectedRoute>
    ),
  },
  {
    path: '/images',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <Images />
        </Suspense>
      </ProtectedRoute>
    ),
  },
];

export default routes;