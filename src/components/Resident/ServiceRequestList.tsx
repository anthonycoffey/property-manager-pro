import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button as MuiButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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

const formatDate = (timestamp: Timestamp | Date | undefined): string => {
  if (!timestamp) return 'N/A';
  const date = (timestamp as Timestamp).toDate
    ? (timestamp as Timestamp).toDate()
    : new Date(timestamp as Date);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

const ServiceRequestList: React.FC = () => {
  const { currentUser, organizationId } = useAuth();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isJobDetailModalOpen, setIsJobDetailModalOpen] = useState<boolean>(false);
  const [selectedPhoenixSubmissionId, setSelectedPhoenixSubmissionId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
    <Paper elevation={0} sx={{ p: 2 }}>
      <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
        Your Service Requests
      </Typography>
      <TableContainer component={Paper} elevation={1}>
        <Table sx={{ minWidth: 650 }} aria-label='service requests table'>
          <TableHead>
            <TableRow>
              <TableCell>Date Submitted</TableCell>
              <TableCell>Service Type(s)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceRequests
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((request) => (
                <TableRow
                  key={request.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component='th' scope='row'>
                    {formatDate(request.submittedAt)}
                  </TableCell>
                  <TableCell>{request.requestType}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status.toUpperCase()}
                      color={getStatusChipColor(request.status)}
                      size='small'
                    />
                  </TableCell>
                  <TableCell>
                    {request.serviceLocationData?.fullAddress ||
                      request.serviceLocation ||
                      'N/A'}
                  </TableCell>
                  <TableCell>
                    {request.phoenixSubmissionId && (
                      <MuiButton
                        variant='outlined'
                        size='small'
                        onClick={() =>
                          handleViewJobClick(request.phoenixSubmissionId!)
                        }
                      >
                        View Job
                      </MuiButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
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
      />
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
