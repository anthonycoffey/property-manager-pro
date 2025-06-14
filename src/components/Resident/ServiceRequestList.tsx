import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  TablePagination,
  Button,
  Stack,
  useTheme,
  List,
  ListItem,
  ListItemText,
  Divider,
  useMediaQuery,
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
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
import type { ServiceRequest } from '../../types';
import ServiceJobDetailModal from '../Job/ServiceJobDetailModal';

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
    default:
      return 'default';
  }
};

const formatDate = (timestamp: Timestamp | Date | undefined): string => {
  if (!timestamp) return 'N/A';
  const date = (timestamp as Timestamp).toDate
    ? (timestamp as Timestamp).toDate()
    : new Date(timestamp as Date);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

const ServiceRequestList: React.FC = () => {
  const { currentUser, organizationId } = useAuth();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isJobDetailModalOpen, setIsJobDetailModalOpen] =
    useState<boolean>(false);
  const [selectedPhoenixSubmissionId, setSelectedPhoenixSubmissionId] =
    useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Default to 5 per page

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
    <Box sx={{ width: '100%' }}>
      <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
        Your Service Requests
      </Typography>
      <Paper
        elevation={0}
        sx={{
          background: 'transparent',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <List disablePadding>
          {serviceRequests
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((request, index) => (
              <React.Fragment key={request.id}>
                <ListItem
                  sx={{
                    py: 2,
                    px: 2,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      width: '100%',
                      mb: isSmallScreen ? 2 : 0,
                    }}
                  >
                    <ListItemText
                      primary={
                        request.serviceLocationData?.fullAddress ||
                        request.serviceLocation ||
                        'N/A'
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            component='span'
                            variant='body2'
                            color='text.primary'
                            display='block'
                            sx={{ mt: 1 }}
                          >
                            {`Submitted: ${formatDate(request.submittedAt)}`}
                          </Typography>
                          <Stack
                            direction='row'
                            spacing={1}
                            useFlexGap
                            flexWrap='wrap'
                            sx={{ mt: 1, pr: isSmallScreen ? 0 : '120px' }} // Add padding to avoid overlap
                          >
                            {request.requestType.split(',').map((type) => (
                              <Chip
                                key={type.trim()}
                                label={type.trim()}
                                size='small'
                              />
                            ))}
                          </Stack>
                        </React.Fragment>
                      }
                      primaryTypographyProps={{
                        fontWeight: 'medium',
                        mb: 1,
                      }}
                    />
                    {!isSmallScreen && (
                      <Stack
                        spacing={1}
                        alignItems='flex-end'
                        sx={{
                          position: 'absolute',
                          top: theme.spacing(2),
                          right: theme.spacing(2),
                        }}
                      >
                        <Chip
                          size='small'
                          variant='outlined'
                          label={request.status.toUpperCase().replace('_', ' ')}
                          color={getStatusChipColor(request.status)}
                          sx={{
                            position: 'relative',
                            top: -6,
                            left: 6,
                            border: 1,
                            borderColor: `${getStatusChipColor(
                              request.status
                            )}`,
                          }}
                        />
                        {request.phoenixSubmissionId && (
                          <Button
                            size='small'
                            onClick={() =>
                              handleViewJobClick(request.phoenixSubmissionId!)
                            }
                            startIcon={<LaunchIcon />}
                          >
                            View Job
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Box>
                  {isSmallScreen && (
                    <Stack
                      direction='row'
                      justifyContent='space-between'
                      alignItems='center'
                      sx={{ width: '100%', mt: 2 }}
                    >
                      <Chip
                        label={request.status.toUpperCase().replace('_', ' ')}
                        color={getStatusChipColor(request.status)}
                        size='small'
                        variant='outlined'
                        sx={{
                          position: 'relative',
                          border: 1,
                          borderColor: `${getStatusChipColor(request.status)}`,
                        }}
                      />
                      {request.phoenixSubmissionId && (
                        <Button
                          size='small'
                          onClick={() =>
                            handleViewJobClick(request.phoenixSubmissionId!)
                          }
                          startIcon={<LaunchIcon />}
                        >
                          View Job
                        </Button>
                      )}
                    </Stack>
                  )}
                </ListItem>
                {index <
                  serviceRequests.slice(
                    page * rowsPerPage,
                    page * rowsPerPage + rowsPerPage
                  ).length -
                    1 && <Divider component='li' />}
              </React.Fragment>
            ))}
        </List>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component='div'
          count={serviceRequests.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          sx={{ mt: 2, borderTop: `1px solid ${theme.palette.divider}` }}
        />
      </Paper>
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
    </Box>
  );
};

export default ServiceRequestList;
