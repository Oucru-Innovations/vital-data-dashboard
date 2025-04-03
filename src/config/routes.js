import React, { lazy, Suspense } from 'react';
import { Box, Typography, CircularProgress, Grid, Divider } from '@mui/material';
import ProtectedRoute from '../config/ProtectedRoute';

// Lazy-load pages
const Dashboard = lazy(() => import('../pages/deprecated/Dashboard'));
const Overview = lazy(() => import('../pages/deprecated/Overview'));
const Wearables = lazy(() => import('../pages/deprecated/Wearables'));
const Ultrasound = lazy(() => import('../pages/deprecated/Ultrasound'));
const Images = lazy(() => import('../pages/deprecated/Images'));
const Login = lazy(() => import('../pages/Login'));
const SummaryDataTypePage = lazy(() => import('../pages/Summary/SummaryDataType'));
const SummaryConditionPage = lazy(() => import('../pages/Summary/SummaryCondition'));
const SummaryDevicePage = lazy(() => import('../pages/Summary/SummaryDevice'));
const SummaryStudyPage = lazy(() => import('../pages/Summary/SummaryStudy'));
const TrackingOverallPage = lazy(() => import('../pages/Tracking/TrackingOverall'));
const TrackingStudyPage = lazy(() => import('../pages/Tracking/TrackingStudy'));

// Fallback Component
const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <h3>Loading...</h3>
    <CircularProgress />
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
    title: 'Vital Login',
  },
  {
    path: '/',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <Dashboard />
        </Suspense>
      </ProtectedRoute>
    ),
    title: 'Vital Home',
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
    title: 'Vital Dashboard',
  },
  {
    path: '/overview',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <Overview />
        </Suspense>
      </ProtectedRoute>
    ),
    title: 'Vital Overview',
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
    title: 'Vital Wearables',
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
    title: 'Vital Ultrasound',
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
    title: 'Vital Images',
  },
  {
    path: '/summary/datatype',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <SummaryDataTypePage />
        </Suspense>
      </ProtectedRoute>
    ),
    title: 'Vital Data Types',
  },
  {
    path: '/summary/condition',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <SummaryConditionPage />
        </Suspense>
      </ProtectedRoute>
    ),
    title: 'Vital Condition',
  },
  {
    path: '/summary/device',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <SummaryDevicePage />
        </Suspense>
      </ProtectedRoute>
    ),
    title: 'Vital Device',
  },
  {
    path: '/summary/study',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <SummaryStudyPage />
        </Suspense>
      </ProtectedRoute>
    ),
    title: 'Vital Study',
  },
  {
    path: '/tracking/overall',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <TrackingOverallPage />
        </Suspense>
      </ProtectedRoute>
    ),
    title: 'Vital Overall Recruitment',
  },
  {
    path: '/tracking/study',
    element: (
      <ProtectedRoute isAuthenticated={isAuthenticated}>
        <Suspense fallback={<Loading />}>
          <TrackingStudyPage />
        </Suspense>
      </ProtectedRoute>
    ),
    title: 'Vital Study Recruitment',
  },
];

export default routes;
