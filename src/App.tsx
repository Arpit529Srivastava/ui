import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routesConfig } from './routes/routes-config';

// Test changeset integration - This comment was added to test the automated changeset system
const router = createBrowserRouter(routesConfig);

const App: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default App;
