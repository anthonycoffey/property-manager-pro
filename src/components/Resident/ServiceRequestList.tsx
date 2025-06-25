import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
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
  Card,
  CardContent,
  CardHeader,
  CardActions,
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
import { CheckCircle, ViewList } from '@mui/icons-material';

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
    <Card>
      <CardHeader
        avatar={<ViewList color='primary' />}
        title={
          <Typography variant='h5' component='div'>
            Your Service Requests
          </Typography>
        }
        sx={{ mb: 2 }}
      />
      <CardContent>
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
                  {isSmallScreen && (
                    <Stack
                      direction='row'
                      justifyContent='space-between'
                      alignItems='center'
                      sx={{ mb: 1 }}
                    >
                      <Chip
                        icon={<CheckCircle sx={{ mr: 2 }} />}
                        size='small'
                        variant='outlined'
                        label={request.status.toUpperCase().replace('_', ' ')}
                        color={getStatusChipColor(request.status)}
                      />

                      {request.phoenixSubmissionId && (
                        <Button
                          size='small'
                          variant='contained'
                          onClick={() =>
                            handleViewJobClick(request.phoenixSubmissionId!)
                          }
                          endIcon={<LaunchIcon />}
                        >
                          View Job
                        </Button>
                      )}
                    </Stack>
                  )}
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
                        <Stack spacing={2} alignItems='flex-start'>
                          {!isSmallScreen && (
                            <Chip
                              icon={<CheckCircle sx={{ mr: 2 }} />}
                              size='small'
                              variant='outlined'
                              label={request.status
                                .toUpperCase()
                                .replace('_', ' ')}
                              color={getStatusChipColor(request.status)}
                            />
                          )}
                          {/* {isSmallScreen ? (
                            <Typography
                              variant='subtitle1'
                              color='text.secondary'
                            >
                              {formatDate(request.submittedAt)}
                            </Typography>
                          ) : ( */}
                          <Typography variant='body1' fontWeight='medium'>
                            {request.serviceLocationData?.fullAddress ||
                              request.serviceLocation ||
                              'N/A'}
                          </Typography>
                          {/* )} */}
                        </Stack>
                      }
                      secondary={
                        <Stack
                          direction='row'
                          spacing={1}
                          useFlexGap
                          flexWrap='wrap'
                          sx={{ mt: 1, pr: isSmallScreen ? 0 : '150px' }} // Add padding to avoid overlap
                        >
                          {isSmallScreen ? (
                            <>
                              <Typography
                                variant='subtitle1'
                                color='text.secondary'
                              >
                                {formatDate(request.submittedAt)}
                              </Typography>
                            </>
                          ) : (
                            <>
                              {request.requestType.split(',').map((type) => (
                                <Chip
                                  key={type.trim()}
                                  label={type.trim()}
                                  size='small'
                                />
                              ))}
                            </>
                          )}
                        </Stack>
                      }
                    />
                    {!isSmallScreen && (
                      <Stack
                        spacing={2}
                        alignItems='flex-end'
                        sx={{
                          position: 'absolute',
                          top: theme.spacing(2),
                          right: theme.spacing(2),
                        }}
                      >
                        <Typography variant='subtitle1' color='text.secondary'>
                          {formatDate(request.submittedAt)}
                        </Typography>
                        {request.phoenixSubmissionId && (
                          <Button
                            variant='contained'
                            // size='small'
                            onClick={() =>
                              handleViewJobClick(request.phoenixSubmissionId!)
                            }
                            endIcon={<LaunchIcon />}
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
                      spacing={1}
                      useFlexGap
                      flexWrap='wrap'
                    >
                      {request.requestType.split(',').map((type) => (
                        <Chip
                          key={type.trim()}
                          label={type.trim()}
                          size='small'
                        />
                      ))}
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
      </CardContent>

      <CardActions sx={{ display: 'block', width: '100%' }}>
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
      </CardActions>
    </Card>
  );
};

export default ServiceRequestList;
