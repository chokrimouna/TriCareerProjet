import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from './router/routes';
import { useTheme } from './store/context/ThemeContext';

export default function App() {
  const { theme } = useTheme();
  return (
    <>
      <RouterProvider router={router} />
      <Toaster theme={theme} richColors position="top-right" />
    </>
  );
}

