import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button as MuiButton,
  Divider,
  Chip,
} from '@mui/material';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import type { ServiceRequest } from '../../types'; // Removed ServiceRequestStatus as it's part of ServiceRequest
import ServiceJobDetailModal from '../Job/ServiceJobDetailModal'; // Import the modal

// Assuming ServiceRequestStatus is part of ServiceRequest type, e.g. ServiceRequest['status']
const getStatusChipColor = (
  status: ServiceRequest['status']
):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning' => {
  switch (status) {
    case 'submitted':
      return 'primary';
    case 'in_progress':
      return 'info';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'error';
    case 'on_hold':
      return 'warning';
    default:
      return 'default';
  }
};

interface ServiceRequestListItemProps {
  request: ServiceRequest;
  onViewJobClick: (phoenixSubmissionId: string) => void;
}

const ServiceRequestListItem: React.FC<ServiceRequestListItemProps> = ({
  request,
  onViewJobClick,
}) => {
  const formatDate = (timestamp: Timestamp | Date | undefined): string => {
    if (!timestamp) return 'N/A';
    const date = (timestamp as Timestamp).toDate
      ? (timestamp as Timestamp).toDate()
      : new Date(timestamp as Date);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <>
      <ListItem>
        <ListItemText
          primary={`${request.requestType} - Submitted: ${formatDate(
            request.submittedAt
          )}`}
          secondaryTypographyProps={{ component: 'div' }} // Ensures secondary text container is a div
          secondary={
            <Box
              component='span' // This Box is fine as it's now inside a div
              sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}
            >
              <Typography component='span' variant='body2' color='text.primary'>
                Status:
              </Typography>
              <Chip
                label={request.status.toUpperCase()}
                color={getStatusChipColor(request.status)}
                size='small'
                sx={{ ml: 1 }}
              />
            </Box>
          }
        />
        {request.phoenixSubmissionId && (
          <ListItemSecondaryAction>
            <MuiButton
              variant="outlined"
              size="small"
              onClick={() => onViewJobClick(request.phoenixSubmissionId!)}
            >
              View Job
            </MuiButton>
          </ListItemSecondaryAction>
        )}
      </ListItem>

      <Divider component='li' />
    </>
  );
};

const ServiceRequestList: React.FC = () => {
  const { currentUser, organizationId } = useAuth();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isJobDetailModalOpen, setIsJobDetailModalOpen] = useState<boolean>(false);
  const [selectedPhoenixSubmissionId, setSelectedPhoenixSubmissionId] = useState<string | null>(null);

  const handleViewJobClick = (phoenixSubmissionId: string) => {
    setSelectedPhoenixSubmissionId(phoenixSubmissionId);
    setIsJobDetailModalOpen(true);
  };

  useEffect(() => {
    if (!currentUser || !organizationId) {
      setError('User not authenticated or organization ID missing.');
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    setError(null);

    const requestsCollectionRef = collection(
      db,
      'organizations',
      organizationId,
      'services'
    );
    const q = query(
      requestsCollectionRef,
      where('residentId', '==', currentUser.uid),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const requests: ServiceRequest[] = [];
        querySnapshot.forEach((doc) => {
          requests.push({ id: doc.id, ...doc.data() } as ServiceRequest);
        });
        setServiceRequests(requests);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching service requests:', err);
        setError('Failed to fetch service requests.');
        setLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [currentUser, organizationId]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (serviceRequests.length === 0) {
    return <Alert severity='info'>You have no service requests.</Alert>;
  }

  return (
    <Paper elevation={0}>
      <Typography variant='h6' gutterBottom>
        Your Service Requests
      </Typography>
      <List sx={{ bgcolor: 'background.paper' }}>
        {serviceRequests.map((request) => (
          <ServiceRequestListItem
            key={request.id}
            request={request}
            onViewJobClick={handleViewJobClick}
          />
        ))}
      </List>
      {selectedPhoenixSubmissionId && (
        <ServiceJobDetailModal
          isOpen={isJobDetailModalOpen}
          onClose={() => {
            setIsJobDetailModalOpen(false);
            setSelectedPhoenixSubmissionId(null); // Reset when closing
          }}
          phoenixSubmissionId={selectedPhoenixSubmissionId}
        />
      )}
    </Paper>
  );
};

export default ServiceRequestList;
