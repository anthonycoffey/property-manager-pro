import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import type { Property } from '../../types'; // Assuming Property type is defined in types/index.ts

const PropertyDetailsView: React.FC = () => {
  const { currentUser, organizationId, propertyId } = useAuth();
  const [propertyDetails, setPropertyDetails] = useState<Property | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (organizationId && propertyId) {
        setLoading(true);
        setError(null);
        try {
          const propertyDocRef = doc(
            db,
            'organizations',
            organizationId,
            'properties',
            propertyId
          );
          const propertyDocSnap = await getDoc(propertyDocRef);

          if (propertyDocSnap.exists()) {
            setPropertyDetails(propertyDocSnap.data() as Property);
          } else {
            setError('Property details not found.');
          }
        } catch (err) {
          console.error('Error fetching property details:', err);
          setError('Failed to fetch property details. Please try again later.');
        } finally {
          setLoading(false);
        }
      } else {
        setError(
          'Organization ID or Property ID is missing. Cannot fetch details.'
        );
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [currentUser, organizationId, propertyId]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>;
  }

  if (!propertyDetails) {
    return <Alert severity='info'>No property details available.</Alert>;
  }

  return (
    <>
      <Typography variant='h5' gutterBottom component='div'>
        Property Information
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant='subtitle1' gutterBottom>
          <strong>Name:</strong> {propertyDetails.name}
        </Typography>
        <Typography variant='subtitle1' gutterBottom>
          <strong>Type:</strong> {propertyDetails.type}
        </Typography>
        {propertyDetails.address && (
          <>
            <Typography variant='subtitle1' gutterBottom>
              <strong>Address:</strong>
            </Typography>
            <Typography variant='body2' sx={{ pl: 2 }}>
              {propertyDetails.address.street}
              <br />
              {propertyDetails.address.city}, {propertyDetails.address.state}{' '}
              {propertyDetails.address.zip}
            </Typography>
          </>
        )}
      </Box>
    </>
  );
};

export default PropertyDetailsView;
