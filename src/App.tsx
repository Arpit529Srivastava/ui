import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routesConfig } from './routes/routes-config';

// Minor test change: This comment is for testing changeset automation
const router = createBrowserRouter(routesConfig);

const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
