import React, { useEffect, useState } from 'react'; // useCallback removed
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import type { ServiceRequest, ServiceRequestStatus } from '../../types';

const getStatusChipColor = (status: ServiceRequestStatus): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
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

const ServiceRequestListItem: React.FC<{ request: ServiceRequest }> = ({ request }) => {
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
  };

  const formatDate = (timestamp: Timestamp | Date | undefined): string => {
    if (!timestamp) return 'N/A';
    const date = (timestamp as Timestamp).toDate ? (timestamp as Timestamp).toDate() : new Date(timestamp as Date);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <>
      <ListItem 
        secondaryAction={
          <IconButton edge="end" aria-label="expand" onClick={handleToggleExpand}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        }
      >
        <ListItemText
          primary={`${request.requestType} - Submitted: ${formatDate(request.submittedAt)}`}
          secondary={
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <Typography component="span" variant="body2" color="text.primary">
                Status: 
              </Typography>
              <Chip 
                label={request.status.toUpperCase()} 
                color={getStatusChipColor(request.status)} 
                size="small" 
                sx={{ ml: 1 }}
              />
            </Box>
          }
        />
      </ListItem>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 2, pr:2, pb: 2, ml: 2, borderLeft: '2px solid #eee' }}>
          <Typography variant="subtitle2" gutterBottom sx={{mt:1}}>Description:</Typography>
          <Typography variant="body2" sx={{whiteSpace: 'pre-wrap', mb:1}}>{request.description}</Typography>
          
          {request.unitNumber && <Typography variant="caption" display="block">Unit: {request.unitNumber}</Typography>}
          {request.assignedToName && <Typography variant="caption" display="block">Assigned To: {request.assignedToName}</Typography>}
          {request.completedAt && <Typography variant="caption" display="block">Completed: {formatDate(request.completedAt)}</Typography>}

          {request.notes && request.notes.length > 0 && (
            <>
              <Typography variant="subtitle2" gutterBottom sx={{mt:1}}>Notes:</Typography>
              <List dense disablePadding>
                {request.notes.map((note, index) => (
                  <ListItem key={index} sx={{pl:1}}>
                    <ListItemText 
                      primary={`${note.userName} (${formatDate(note.timestamp)}):`}
                      secondary={note.note}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Collapse>
      <Divider component="li" />
    </>
  );
};


const ServiceRequestList: React.FC = () => {
  const { currentUser, organizationId } = useAuth(); // Removed propertyId as services are at org level
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !organizationId ) { // Check for organizationId
      setError('User not authenticated or organization ID missing.');
      setLoading(false);
      return () => {}; // Return an empty cleanup function
    }

    setLoading(true);
    setError(null);

    const requestsCollectionRef = collection(db, 'organizations', organizationId, 'services');
    const q = query(
      requestsCollectionRef,
      where('residentId', '==', currentUser.uid),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
  }

  if (serviceRequests.length === 0) {
    return <Alert severity="info" sx={{ mt: 2 }}>You have no service requests.</Alert>;
  }

  return (
    <Paper elevation={1} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Your Service Requests
      </Typography>
      <List sx={{ bgcolor: 'background.paper' }}>
        {serviceRequests.map((request) => (
          <ServiceRequestListItem key={request.id} request={request} />
        ))}
      </List>
    </Paper>
  );
};

export default ServiceRequestList;
