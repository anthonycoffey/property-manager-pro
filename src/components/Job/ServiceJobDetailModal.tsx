import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Avatar,
  Button as MuiButton, // Renamed to avoid conflict if 'Button' is used elsewhere
  useTheme, // Import useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
// ShareIcon was removed from the plan, but if it's needed, it should be imported.
// import ShareIcon from '@mui/icons-material/Share'; 
import SmsIcon from '@mui/icons-material/Sms';
import PhoneIcon from '@mui/icons-material/Phone';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api'; // Add DirectionsRenderer

import type { Job } from '../../types'; // Assuming Job type is in src/types
import JobStatusStepper from './JobStatusStepper.tsx';
import JobDetailsDisplay from './JobDetailsDisplay.tsx';
// import { formatDateTime } from '../../utils/dateUtils'; // Placeholder for date formatting

// Define librariesToLoad outside the component to prevent re-creation on each render.
// 'routes' library is often used for DirectionsService.
const LIBRARIES_TO_LOAD: ("places" | "routes")[] = ['places', 'routes'];

const mapContainerStyle = {
  width: '100%',
  height: '300px', // Adjust as needed
  marginBottom: '16px',
};

const customMapStyles = [
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
];

interface ServiceJobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoenixSubmissionId: string | null;
}

const ServiceJobDetailModal: React.FC<ServiceJobDetailModalProps> = ({
  isOpen,
  onClose,
  phoenixSubmissionId,
}) => {
  const [jobData, setJobData] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // ETA and distance would typically come from a directions service
  const [eta, setEta] = useState<string>('Calculating...'); // Make dynamic
  const [distance, setDistance] = useState<string>('Calculating...'); // Make dynamic
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const theme = useTheme(); // For accessing theme colors


  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    // @ts-ignore // Ignoring if exact type for 'routes' causes issues with installed @types
    libraries: LIBRARIES_TO_LOAD,
  });

  useEffect(() => {
    // Reset directions, ETA, distance when modal reopens or phoenixSubmissionId changes
    setDirections(null);
    setEta('Calculating...');
    setDistance('Calculating...');
    
    if (isOpen && phoenixSubmissionId) {
      const fetchJobData = async () => {
        setIsLoading(true);
        setError(null);
        setJobData(null);
        try {
          const response = await fetch(
            `https://phoenix-staging-data-3d6054f8c3ef.herokuapp.com/jobs/public/search/${phoenixSubmissionId}`
          );
          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Job not found.');
            }
            throw new Error(
              `Failed to fetch job details: ${response.statusText}`
            );
          }
          const data: Job = await response.json();
          setJobData(data);
        } catch (err: any) {
          setError(err.message || 'An unexpected error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchJobData();
    }
  }, [isOpen, phoenixSubmissionId]);

  // New useEffect for fetching directions
  useEffect(() => {
    if (isLoaded && jobData?.assignedTechnician && jobData?.Address) {
      const technicianLoc = {
        lat: jobData.assignedTechnician.latitude,
        lng: jobData.assignedTechnician.longitude,
      };
      const addressLoc = {
        lat: jobData.Address.lat,
        lng: jobData.Address.lng,
      };

      if (technicianLoc.lat && technicianLoc.lng && addressLoc.lat && addressLoc.lng) {
        const directionsService = new google.maps.DirectionsService();
        const request: google.maps.DirectionsRequest = {
          origin: new google.maps.LatLng(technicianLoc.lat, technicianLoc.lng),
          destination: new google.maps.LatLng(addressLoc.lat, addressLoc.lng),
          travelMode: google.maps.TravelMode.DRIVING,
        };

        directionsService.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            setDirections(result);
            const route = result.routes[0];
            if (route && route.legs.length > 0) {
              setDistance(route.legs[0].distance?.text || 'N/A');
              setEta(route.legs[0].duration?.text || 'N/A');
            }
          } else {
            console.error('Directions request failed due to:', status);
            setEta('N/A');
            setDistance('N/A');
            setDirections(null);
          }
        });
      }
    }
  }, [isLoaded, jobData]); // Dependencies for directions

  const getJobTitle = (): string => {
    if (!jobData) return 'Job Details';
    switch (jobData.status) {
      case 'pending':
      case 'assigned':
      case 'en-route':
        return 'Technician En Route';
      case 'in-progress':
        return 'Service in Progress';
      case 'completed':
        return 'Service Completed';
      case 'canceled':
        return 'Job Canceled';
      default:
        return `Job Status: ${jobData.status}`;
    }
  };

  const getCurrentStep = (): number => {
    if (!jobData) return 0;
    switch (jobData.status) {
      case 'pending':
      case 'assigned':
      case 'en-route':
        return 1;
      case 'in-progress':
        return 2;
      case 'completed':
        return 3;
      case 'canceled':
      default:
        return 0; // Or a specific step for canceled
    }
  };

  const technician = jobData?.assignedTechnician;
  const serviceAddress = jobData?.Address;
  const proxyNumber = jobData?.proxy?.ProxyNumber?.number;

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {getJobTitle()}
        <Box>
          <IconButton onClick={onClose} aria-label='close'>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity='error' sx={{ my: 2 }}>
            {error}
          </Alert>
        )}
        {jobData && !isLoading && !error && (
          <>
            {/* Technician Info */}
            {technician && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  p: 2,
                  border: '1px solid #eee',
                  borderRadius: 1,
                }}
              >
                <Avatar
                  src={technician.avatar}
                  alt={technician.fullName}
                  sx={{ width: 56, height: 56, mr: 2 }}
                />
                <Box flexGrow={1}>
                  <Typography variant='h6'>{technician.fullName}</Typography>
                  <Typography variant='body2' color='textSecondary'>
                    ETA: {eta} ({distance})
                  </Typography>
                </Box>
                <Box>
                  <IconButton
                    component={proxyNumber ? 'a' : 'button'}
                    aria-label='sms technician'
                    disabled={!proxyNumber}
                    href={proxyNumber ? `sms:${proxyNumber}` : undefined}
                  >
                    <SmsIcon />
                  </IconButton>
                  <IconButton
                    component={proxyNumber ? 'a' : 'button'}
                    aria-label='call technician'
                    disabled={!proxyNumber}
                    href={proxyNumber ? `tel:${proxyNumber}` : undefined}
                  >
                    <PhoneIcon />
                  </IconButton>
                </Box>
              </Box>
            )}

            {/* Status Stepper */}
            <JobStatusStepper currentStep={getCurrentStep()} />

            {/* Map */}
            {isLoaded && serviceAddress && technician && (
              <Box sx={mapContainerStyle}>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={{ lat: serviceAddress.lat, lng: serviceAddress.lng }}
                  zoom={12}
                  options={{
                    styles: customMapStyles,
                    zoomControl: false,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                  }}
                >
                  {/* Technician Marker (using default pin for now) */}
                  {technician.latitude && technician.longitude && (
                    <Marker
                      position={{ lat: technician.latitude, lng: technician.longitude }}
                      title="Technician"
                    />
                  )}
                  {/* Service Address Marker (using default pin for now) */}
                  {serviceAddress.lat && serviceAddress.lng && (
                    <Marker
                      position={{ lat: serviceAddress.lat, lng: serviceAddress.lng }}
                      title="Service Location"
                    />
                  )}

                  {/* Directions Polyline */}
                  {directions && (
                    <DirectionsRenderer
                      directions={directions}
                      options={{
                        suppressMarkers: true, // We are using our own markers above
                        polylineOptions: {
                          strokeColor: theme.palette.primary.main, 
                          strokeOpacity: 0.8,
                          strokeWeight: 5,
                        },
                      }}
                    />
                  )}
                </GoogleMap>
              </Box>
            )}
            {loadError && (
              <Alert severity='warning'>Map or Directions could not be loaded.</Alert>
            )}

            {/* Job Details Display */}
            <JobDetailsDisplay job={jobData} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <MuiButton onClick={onClose}>Close</MuiButton>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceJobDetailModal;
