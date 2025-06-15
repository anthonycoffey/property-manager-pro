import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
} from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ResidentReviewSlider from './ResidentReviewSlider';
import ResidentQuickNav from './ResidentQuickNav';
import ServiceRequestList from './ServiceRequestList';

const ResidentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const testimonials = [
    {
      quote: 'Friendly fast service 😊🙏',
      author: 'Samalam C',
      authorRole: 'Resident',
    },
    {
      quote: 'He did amazing!! Very professional!!',
      author: 'A&A kidz',
      authorRole: 'Resident',
    },
  ];

  if (!currentUser) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
        }}
      >
        <Box component='span' sx={{ display: 'flex' }}>
          <CircularProgress />
        </Box>
      </Box>
    );
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

      {/* Conditionally render ServiceRequestList for the 'My Profile' page */}
      {location.pathname === '/dashboard/resident/my-profile' && (
        <Paper elevation={3} sx={{ mb: 4, p: { xs: 1, sm: 2 } }}>
          <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
            Your Service Requests
          </Typography>
          <ServiceRequestList />
        </Paper>
      )}

      {location.pathname !== '/dashboard/resident/ai-assistant' && (
        <>
          <Divider sx={{ mt: 8 }} />
          {/* Testimonials Section */}
          <Box
            sx={{
              my: 6,
              backgroundColor: 'background.default',
              py: 6,
            }}
          >
            <Typography
              variant='h5'
              gutterBottom
              sx={{ mb: 4, textAlign: 'center' }}
            >
              What Your Neighbors Are Saying
            </Typography>
            <ResidentReviewSlider reviews={testimonials} />
          </Box>
        </>
      )}
    </>
  );
};

export default ResidentDashboard;
