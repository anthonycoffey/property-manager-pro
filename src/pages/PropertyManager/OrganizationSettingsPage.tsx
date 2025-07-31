import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Stack,
} from '@mui/material';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import BusinessIcon from '@mui/icons-material/Business';
import LinkIcon from '@mui/icons-material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';

interface Property {
  id: string;
  name: string;
  reviewLink?: string;
  // Add other property fields as needed
}

const OrganizationSettingsPage = () => {
  const { organizationId } = useAuth();

  // State for Properties
  const [properties, setProperties] = useState<Property[]>([]);
  const [isPropertiesLoading, setIsPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  // State for Organization Details
  const [organizationName, setOrganizationName] = useState('');
  const [isOrgLoading, setIsOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgSuccessMessage, setOrgSuccessMessage] = useState<string | null>(
    null
  );

  // State for Notification Settings
  const [notifications, setNotifications] = useState({
    'en-route': { title: '', message: '' },
    complete: { title: '', message: '' },
    cancelled: { title: '', message: '' },
    review: { title: '', message: '' },
  });
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null
  );
  const [notificationsSuccessMessage, setNotificationsSuccessMessage] =
    useState<string | null>(null);

  const db = getFirestore();

  const handleSaveReviewLink = async (
    propertyId: string,
    reviewLink: string
  ) => {
    if (!organizationId) {
      setPropertiesError('Organization ID not found.');
      return;
    }
    const propDocRef = doc(
      db,
      'organizations',
      organizationId,
      'properties',
      propertyId
    );
    try {
      await updateDoc(propDocRef, { reviewLink });
      // Optimistically update the UI
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId ? { ...p, reviewLink: reviewLink } : p
        )
      );
    } catch (error) {
      console.error('Error saving review link:', error);
      setPropertiesError('Failed to save review link. Please try again.');
    }
  };

  const fetchProperties = useCallback(async () => {
    if (!organizationId) return;
    setIsPropertiesLoading(true);
    setPropertiesError(null);
    try {
      const propertiesRef = collection(
        db,
        'organizations',
        organizationId,
        'properties'
      );
      const q = query(propertiesRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      const props = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Property[];
      setProperties(props);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setPropertiesError('Failed to fetch properties.');
    } finally {
      setIsPropertiesLoading(false);
    }
  }, [organizationId, db]);

  // Fetch all organization data
  const fetchOrganizationData = useCallback(async () => {
    if (!organizationId) return;
    setIsOrgLoading(true);
    setIsNotificationsLoading(true);
    const orgDocRef = doc(db, 'organizations', organizationId);
    try {
      const docSnap = await getDoc(orgDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrganizationName(data.name || '');
        // Merge fetched settings with default to ensure all fields are present
        setNotifications((prev) => ({
          ...prev,
          ...data.notificationSettings,
        }));
      }
    } catch {
      setOrgError('Failed to fetch organization details.');
      setNotificationsError('Failed to fetch notification settings.');
    } finally {
      setIsOrgLoading(false);
      setIsNotificationsLoading(false);
    }
  }, [organizationId, db]);

  useEffect(() => {
    fetchOrganizationData();
    fetchProperties();
  }, [fetchOrganizationData, fetchProperties]);

  const handleSaveOrgName = async () => {
    if (!organizationId) {
      setOrgError('Organization ID not found.');
      return;
    }
    setIsOrgLoading(true);
    setOrgError(null);
    setOrgSuccessMessage(null);
    const orgDocRef = doc(db, 'organizations', organizationId);
    try {
      await updateDoc(orgDocRef, { name: organizationName });
      setOrgSuccessMessage('Organization name updated successfully!');
    } catch (error) {
      console.error('Error updating organization name:', error);
      setOrgError('Failed to update organization name.');
    } finally {
      setIsOrgLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!organizationId) {
      setNotificationsError('Organization ID not found.');
      return;
    }
    setIsNotificationsLoading(true);
    setNotificationsError(null);
    setNotificationsSuccessMessage(null);
    const orgDocRef = doc(db, 'organizations', organizationId);
    try {
      await setDoc(
        orgDocRef,
        { notificationSettings: notifications },
        { merge: true }
      );
      setNotificationsSuccessMessage(
        'Notification settings saved successfully!'
      );
    } catch (error) {
      console.error('Error saving notification settings:', error);
      setNotificationsError('Failed to save notification settings.');
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  const handleNotificationChange = (
    status: string,
    field: 'title' | 'message',
    value: string
  ) => {
    setNotifications((prev) => ({
      ...prev,
      [status]: { ...prev[status as keyof typeof prev], [field]: value },
    }));
  };

  return (
    <Stack spacing={2} sx={{ mb: 6 }}>
      {/* Organization Details Card */}
      <Card>
        <CardHeader
          avatar={
            <BusinessIcon
              color='primary'
              sx={{ width: { xs: 28, md: 32 }, height: { xs: 28, md: 32 } }}
            />
          }
          title={
            <Typography variant='h5' component='div'>
              Organization Name
            </Typography>
          }
          subheader="Update your organization's public name."
        />
        <CardContent>
          {orgError && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {orgError}
            </Alert>
          )}
          {orgSuccessMessage && (
            <Alert severity='success' sx={{ mb: 2 }}>
              {orgSuccessMessage}
            </Alert>
          )}
          {isOrgLoading ? (
            <CircularProgress />
          ) : (
            <Stack spacing={2}>
              <TextField
                fullWidth
                label='Organization Name'
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                  variant='contained'
                  onClick={handleSaveOrgName}
                  disabled={isOrgLoading}
                >
                  Save Organization Name
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings Card */}
      <Card>
        <CardHeader
          avatar={
            <NotificationsIcon
              color='primary'
              sx={{ width: { xs: 28, md: 32 }, height: { xs: 28, md: 32 } }}
            />
          }
          title={
            <Typography variant='h5' component='div'>
              Service Request Notification Settings
            </Typography>
          }
          subheader='Customize the notifications sent to residents for service requests.'
        />
        <CardContent>
          {notificationsError && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {notificationsError}
            </Alert>
          )}
          {notificationsSuccessMessage && (
            <Alert severity='success' sx={{ mb: 2 }}>
              {notificationsSuccessMessage}
            </Alert>
          )}
          {isNotificationsLoading ? (
            <CircularProgress />
          ) : (
            <Stack spacing={3}>
              {Object.keys(notifications).map((status) => (
                <Box key={status}>
                  <Typography
                    variant='h6'
                    gutterBottom
                    textTransform='capitalize'
                  >
                    {status}
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      label='Notification Title'
                      value={
                        notifications[status as keyof typeof notifications]
                          .title
                      }
                      onChange={(e) =>
                        handleNotificationChange(
                          status,
                          'title',
                          e.target.value
                        )
                      }
                    />
                    <TextField
                      fullWidth
                      label='Notification Message'
                      multiline
                      rows={2}
                      value={
                        notifications[status as keyof typeof notifications]
                          .message
                      }
                      onChange={(e) =>
                        handleNotificationChange(
                          status,
                          'message',
                          e.target.value
                        )
                      }
                    />
                    {status === 'review' && (
                      <Alert severity='info'>
                        The review notification will include a review link if
                        one is configured for the property.
                      </Alert>
                    )}
                  </Stack>
                </Box>
              ))}
              <Box>
                <Button
                  variant='contained'
                  onClick={handleSaveNotifications}
                  disabled={isNotificationsLoading}
                >
                  Save Notification Settings
                </Button>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Property Review Links Card */}
      <Card>
        <CardHeader
          avatar={
            <LinkIcon
              color='primary'
              sx={{ width: { xs: 28, md: 32 }, height: { xs: 28, md: 32 } }}
            />
          }
          title={
            <Typography variant='h5' component='div'>
              Property Review Links
            </Typography>
          }
          subheader='Configure the Google review link for each property.'
        />
        <CardContent>
          {propertiesError && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {propertiesError}
            </Alert>
          )}
          {isPropertiesLoading ? (
            <CircularProgress />
          ) : properties.length === 0 ? (
            <Typography>
              No active properties found in this organization.
            </Typography>
          ) : (
            <Stack spacing={3}>
              {properties.map((prop) => (
                <Box key={prop.id}>
                  <Typography variant='h6'>{prop.name}</Typography>
                  <Stack direction='row' spacing={2} sx={{ mt: 1 }}>
                    <TextField
                      fullWidth
                      label='Google Review Link'
                      value={prop.reviewLink || ''}
                      onChange={(e) =>
                        setProperties((prev) =>
                          prev.map((p) =>
                            p.id === prop.id
                              ? { ...p, reviewLink: e.target.value }
                              : p
                          )
                        )
                      }
                    />
                    <Button
                      variant='contained'
                      onClick={() =>
                        handleSaveReviewLink(prop.id, prop.reviewLink || '')
                      }
                    >
                      Save
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
};

export default OrganizationSettingsPage;
