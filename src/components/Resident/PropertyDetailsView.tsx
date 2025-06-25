import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CardContent,
  Card,
  CardHeader,
} from '@mui/material';
import {
  HomeWork as HomeWorkIcon,
  Person as PersonIcon,
  Apartment as ApartmentIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
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
    <Card>
      <CardHeader
        avatar={<HomeWorkIcon color='primary' />}
        title={
          <Typography variant='h5' component='div'>
            Property Information
          </Typography>
        }
      />
      <CardContent>
        <List>
          <ListItem sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText
              primary='Property Name'
              secondary={propertyDetails.name}
            />
          </ListItem>
 <ListItem sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <ListItemIcon>
              <ApartmentIcon />
            </ListItemIcon>
            <ListItemText
              primary='Property Type'
              secondary={propertyDetails.type}
            />
          </ListItem>
          {propertyDetails.address && (
            <ListItem alignItems='flex-start' >
              <ListItemIcon sx={{ mt: 1 }}>
                <LocationOnIcon />
              </ListItemIcon>
              <ListItemText
                primary='Address'
                secondary={
                  <>
                    <Typography
                      component='span'
                      variant='body2'
                      color='text.primary'
                    >
                      {propertyDetails.address.street}
                    </Typography>
                    <br />
                    <Typography
                      component='span'
                      variant='body2'
                      color='text.primary'
                    >
                      {propertyDetails.address.city},{' '}
                      {propertyDetails.address.state}{' '}
                      {propertyDetails.address.zip}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );
};

export default PropertyDetailsView;
