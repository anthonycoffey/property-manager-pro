import { Box } from '@mui/material';
import AppRoutes from './routes';
import { useThemeMode } from './hooks/useThemeMode';
import AppBarComponent from './components/Layout/AppBarComponent';
import { useFCM } from './hooks/useFCM';

function App() {
  const { toggleColorMode, mode } = useThemeMode();
  useFCM();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBarComponent toggleColorMode={toggleColorMode} mode={mode} />
      <AppRoutes />
    </Box>
  );
}

export default App;
