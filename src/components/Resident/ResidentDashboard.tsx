import React from 'react';
import { Box, Typography, Paper, Container, Divider } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom'; // Import Outlet & useLocation
import { useAuth } from '../../hooks/useAuth';
import TestimonialCard from '../Marketing/TestimonialCard';
import ResidentQuickNav from './ResidentQuickNav'; // Import ResidentQuickNav

const ResidentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation(); // Get current location

  if (!currentUser) {
    return <Typography>Loading resident data...</Typography>;
  }

  return (
    <>
      {/* Conditionally render QuickNav for the 'My Profile' page */}
      {location.pathname === '/dashboard/resident/my-profile' && (
        <ResidentQuickNav />
      )}
      <Paper elevation={3} sx={{ mb: 4, p: { xs: 1, sm: 2 } }}>
        {/* Outlet will render the specific resident view (My Profile, My Property, etc.) */}
        <Outlet />
      </Paper>

      <Divider sx={{ mt: 8 }} />
      {/* Testimonials Section */}
      <Box
        sx={{
          mt: 4,
          p: 2,
          backgroundColor: 'background.default',
        }}
      >
        <Typography
          variant='h5'
          gutterBottom
          sx={{ mb: 2, textAlign: 'center' }}
        >
          What Other Residents Are Saying
        </Typography>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            justifyContent: 'center',
            alignItems: 'stretch',
          }}
        >
          <TestimonialCard
            quote='Friendly fast service 😊🙏'
            author='Samalam C'
            authorRole='Resident'
          />
          <TestimonialCard
            quote='He did amazing!! Very professional!!'
            author='A&A kidz'
            authorRole='Resident'
          />
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 2, md: 10 },
            justifyContent: 'center',
            alignItems: 'center',
            mt: 3,
          }}
        >
          <Box
            component='img'
            src='/review1.png'
            alt='5.0 rating'
            sx={{
              width: { xs: 100, sm: 140 },
              height: 'auto',
            }}
          />
          <Box
            component='img'
            src='/review2.png'
            alt='35 years experience'
            sx={{
              width: { xs: 100, sm: 140 },
              height: 'auto',
            }}
          />
          <Box
            component='img'
            src='/review3.png'
            alt='satisfaction guaranteed'
            sx={{
              width: { xs: 100, sm: 140 },
              height: 'auto',
            }}
          />
        </Box>
      </Box>
    </>
  );
};

export default ResidentDashboard;
