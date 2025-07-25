import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { usePropertyManagerContext } from '../../../hooks/usePropertyManagerContext';
import { useAuth } from '../../../hooks/useAuth';
import {
  getPaginatedPropertyNotifications,
  type PropertyNotification,
} from '../../../lib/notificationsService';
import CreatePropertyNotificationModal from './CreatePropertyNotificationModal';
import { type DocumentSnapshot } from 'firebase/firestore';

const NOTIFICATIONS_PER_PAGE = 10;

const PropertyNotificationsView: React.FC = () => {
  const { selectedPropertyId, selectedPropertyName } = usePropertyManagerContext();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<PropertyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [firstVisible, setFirstVisible] = useState<DocumentSnapshot | null>(null);
  const [page, setPage] = useState(0);
  const [pageHistory, setPageHistory] = useState<(DocumentSnapshot | null)[]>([null]);
  const [loadingNext, setLoadingNext] = useState(false);

  const organizationId = currentUser?.customClaims?.organizationId;

  const fetchNotifications = useCallback(async (pageIndex: number, startAfterDoc: DocumentSnapshot | null) => {
    if (!organizationId || !selectedPropertyId) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    if (pageIndex === 0) {
      setLoading(true);
    } else {
      setLoadingNext(true);
    }
    setError(null);

    try {
      const result = await getPaginatedPropertyNotifications(
        organizationId,
        selectedPropertyId,
        NOTIFICATIONS_PER_PAGE,
        startAfterDoc
      );
      setNotifications(result.notifications);
      setLastVisible(result.lastVisible);
      setFirstVisible(result.firstVisible);
      if (pageIndex >= pageHistory.length) {
        setPageHistory([...pageHistory, result.firstVisible]);
      }
    } catch (err) {
      setError('Failed to fetch notifications.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingNext(false);
    }
  }, [organizationId, selectedPropertyId, pageHistory]);

  useEffect(() => {
    fetchNotifications(0, null);
  }, [fetchNotifications]);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleNextPage = () => {
    if (lastVisible) {
      const nextPage = page + 1;
      fetchNotifications(nextPage, lastVisible);
      setPage(nextPage);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      const prevPage = page - 1;
      const startAfterDoc = pageHistory[prevPage] || null;
      fetchNotifications(prevPage, startAfterDoc);
      setPage(prevPage);
      // Trim the history
      setPageHistory(pageHistory.slice(0, prevPage + 1));
    }
  };

  if (!selectedPropertyId) {
    return (
      <Alert severity="info">
        Please select a property from the dropdown above to manage notifications.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Notifications for {selectedPropertyName}
        </Typography>
        <Button variant="contained" onClick={handleOpenModal}>
          Create Notification
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Stack spacing={2}>
          {notifications.length === 0 ? (
            <Typography>No notifications found for this property.</Typography>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent>
                  <Typography variant="h6">{notification.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {notification.message}
                  </Typography>
                  {notification.vehicle && notification.vehicle.licensePlate && (
                    <Box sx={{ mt: 2 }}>
                      <Chip label={`Plate: ${notification.vehicle.licensePlate}`} size="small" />
                    </Box>
                  )}
                </CardContent>
                {notification.violationId && (
                  <CardActions>
                    <Button
                      component={RouterLink}
                      to={`/dashboard/property-manager/violations/${notification.violationId}`}
                      size="small"
                    >
                      View Violation
                    </Button>
                  </CardActions>
                )}
              </Card>
            ))
          )}
        </Stack>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Button onClick={handlePrevPage} disabled={page === 0 || loading}>
          Previous
        </Button>
        <Button onClick={handleNextPage} disabled={!lastVisible || loadingNext}>
          {loadingNext ? <CircularProgress size={24} /> : 'Next'}
        </Button>
      </Box>

      {organizationId && selectedPropertyId && (
        <CreatePropertyNotificationModal
          open={isModalOpen}
          onClose={handleCloseModal}
          organizationId={organizationId}
          propertyId={selectedPropertyId}
        />
      )}
    </Box>
  );
};

export default PropertyNotificationsView;
