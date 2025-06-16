import React from 'react';
import {
  Box,
  Typography,
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
      <Outlet />

      {/* Conditionally render ServiceRequestList for the 'My Profile' page */}
      {location.pathname === '/dashboard/resident/my-profile' && (
        <ServiceRequestList />
      )}

      {location.pathname !== '/dashboard/resident/ai-assistant' && (
        <>
          <Divider sx={{ mt: 8 }} />
          {/* Testimonials Section */}
          <Box
            sx={{
              my: 2,
              backgroundColor: 'background.default',
              py: { xs: 4, sm: 6, lg: 8 },
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
