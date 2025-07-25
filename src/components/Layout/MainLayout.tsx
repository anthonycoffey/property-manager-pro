import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, Container } from '@mui/material';
import Footer from './Footer';
import BreadcrumbsComponent from './BreadcrumbsComponent';
import { useFCM } from '../../hooks/useFCM';

const MainLayout: React.FC = () => {
  useFCM();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <CssBaseline />
      <Container
        component='main'
        sx={{
          flexGrow: 1,
        }}
      >
        <BreadcrumbsComponent />
        <Outlet />
      </Container>
      <Footer />
    </Box>
  );
};

export default MainLayout;
