import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, CssBaseline, Container } from '@mui/material';
import Footer from './Footer';
import BreadcrumbsComponent from './BreadcrumbsComponent';

const MainLayout: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <CssBaseline />
      <Container
        component='main'
        sx={{
          flexGrow: 1,
          mt: 4,
          mb: 4,
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
