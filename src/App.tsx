import { Box } from '@mui/material';
import AppRoutes from './routes';
import { useThemeMode } from './hooks/useThemeMode';
import AppBarComponent from './components/Layout/AppBarComponent'; // Import new AppBar

function App() {
  const { toggleColorMode, mode } = useThemeMode();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBarComponent toggleColorMode={toggleColorMode} mode={mode} /> {/* Use new AppBar */}
      <Box sx={{ p: 3 }}>
        <AppRoutes />
      </Box>
    </Box>
  );
}

export default App;
