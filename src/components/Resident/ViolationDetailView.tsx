import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Card, CardContent, CardActions, Alert } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';

// Define the structure of a violation
interface Violation {
  id: string;
  licensePlate: string;
  violationType: string;
  photoUrl: string;
  status: 'pending_acknowledgement' | 'acknowledged' | 'escalated_to_manager' | 'reported';
  createdAt: Date;
  acknowledgedAt?: Date;
}

interface Timestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface ViolationData extends Omit<Violation, 'createdAt' | 'acknowledgedAt'> {
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;
}

const ViolationDetailView: React.FC = () => {
  const { violationId } = useParams<{ violationId: string }>();
  const { currentUser } = useAuth();
  const [violation, setViolation] = useState<Violation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    const fetchViolationDetails = async () => {
      if (!currentUser || !violationId) return;

      const functions = getFunctions();
      const getViolationDetails = httpsCallable(functions, 'getViolationDetails');

      try {
        const organizationId = currentUser.customClaims?.organizationId;
        const propertyId = currentUser.customClaims?.propertyId;
        if (!organizationId || !propertyId) {
          throw new Error('Organization ID or Property ID not found in user claims.');
        }

        const result = await getViolationDetails({ violationId, organizationId, propertyId });
        const data = result.data as ViolationData;
        
        const newViolation: Violation = {
          ...data,
          createdAt: new Date(data.createdAt._seconds * 1000),
          acknowledgedAt: data.acknowledgedAt ? new Date(data.acknowledgedAt._seconds * 1000) : undefined,
        };

        setViolation(newViolation);
      } catch (err) {
        console.error('Error fetching violation details:', err);
        setError('Failed to load violation details. You may not have permission to view this.');
      } finally {
        setLoading(false);
      }
    };

    fetchViolationDetails();
  }, [currentUser, violationId]);

  const handleAcknowledge = async () => {
    if (!currentUser || !violationId) return;

    setAcknowledging(true);
    const functions = getFunctions();
    const acknowledgeViolation = httpsCallable(functions, 'acknowledgeViolation');

    try {
      const organizationId = currentUser.customClaims?.organizationId;
      const propertyId = currentUser.customClaims?.propertyId;
      if (!organizationId || !propertyId) {
        throw new Error('Organization ID or Property ID not found in user claims.');
      }

      await acknowledgeViolation({ violationId, organizationId, propertyId });
      setViolation((prev) => (prev ? { ...prev, status: 'acknowledged' } : null));
    } catch (err) {
      console.error('Error acknowledging violation:', err);
      setError('Failed to acknowledge the violation. Please try again.');
    } finally {
      setAcknowledging(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!violation) {
    return <Typography>Violation not found.</Typography>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Violation Details
        </Typography>
        <Typography><strong>License Plate:</strong> {violation.licensePlate}</Typography>
        <Typography><strong>Violation Type:</strong> {violation.violationType}</Typography>
        <Typography><strong>Status:</strong> {violation.status}</Typography>
        <Typography><strong>Reported At:</strong> {violation.createdAt.toLocaleString()}</Typography>
        {violation.acknowledgedAt && (
          <Typography><strong>Acknowledged At:</strong> {violation.acknowledgedAt.toLocaleString()}</Typography>
        )}
        <Box mt={2}>
          <img src={violation.photoUrl} alt="Violation" style={{ maxWidth: '100%', height: 'auto' }} />
        </Box>
      </CardContent>
      {violation.status === 'pending_acknowledgement' && (
        <CardActions>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAcknowledge}
            disabled={acknowledging}
          >
            {acknowledging ? <CircularProgress size={24} /> : "I'm Moving It"}
          </Button>
        </CardActions>
      )}
    </Card>
  );
};

export default ViolationDetailView;
