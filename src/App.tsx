import { Box } from '@mui/material';
import AppRoutes from './routes';
import { useThemeMode } from './hooks/useThemeMode';
import AppBarComponent from './components/Layout/AppBarComponent';

function App() {
  const { toggleColorMode, mode } = useThemeMode();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBarComponent toggleColorMode={toggleColorMode} mode={mode} />
      <AppRoutes />
    </Box>
  );
}

export default App;
