import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
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
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import GoogleIcon from '@mui/icons-material/Google';

interface GmbLocation {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines?: string[];
  };
}

interface Property {
  id: string;
  name: string;
  gmb?: {
    placeId: string;
    locationName: string;
  };
  // Add other property fields as needed
}

const OrganizationSettingsPage = () => {
  const { currentUser, organizationId } = useAuth();
  const location = useLocation();

  // State for Google Account connection
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(true);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleSuccessMessage, setGoogleSuccessMessage] = useState<
    string | null
  >(null);
  const [gmbLocations, setGmbLocations] = useState<GmbLocation[]>([]);
  const [isGmbLoading, setIsGmbLoading] = useState(false);

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

  const fetchProperties = useCallback(async () => {
    if (!organizationId) return;
    console.log('Fetching properties...');
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
      console.log('Properties fetched:', props);
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

  // Google Connection Status Check
  const checkGoogleConnectionStatus = useCallback(async () => {
    if (!currentUser || !organizationId) return;
    const tokenDocRef = doc(
      db,
      'organizations',
      organizationId,
      'googleAuth',
      currentUser.uid
    );
    const docSnap = await getDoc(tokenDocRef);
    setIsGoogleConnected(docSnap.exists());
    setIsGoogleLoading(false);
  }, [currentUser, organizationId, db]);

  useEffect(() => {
    fetchOrganizationData();
    checkGoogleConnectionStatus();
    fetchProperties();
  }, [fetchOrganizationData, checkGoogleConnectionStatus, fetchProperties]);

  const fetchGmbLocations = useCallback(async () => {
    if (!organizationId) return;
    console.log('Fetching GMB locations...');
    setIsGmbLoading(true);
    setGoogleError(null);
    const functions = getFunctions();
    const getGmbLocations = httpsCallable(functions, 'getGmbLocations');
    try {
      const result = await getGmbLocations({ organizationId });
      const { locations } = result.data as { locations: GmbLocation[] };
      console.log('GMB locations fetched:', locations);
      setGmbLocations(locations);
    } catch (error) {
      console.error('Error fetching GMB locations:', error);
      setGoogleError('Failed to fetch your Google My Business locations.');
    } finally {
      setIsGmbLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    console.log('isGoogleConnected state changed:', isGoogleConnected);
    if (isGoogleConnected) {
      fetchGmbLocations();
    } else {
      setGmbLocations([]);
    }
  }, [isGoogleConnected, fetchGmbLocations]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('status') === 'success') {
      setGoogleSuccessMessage('Successfully connected your Google account!');
      checkGoogleConnectionStatus();
    } else if (queryParams.get('status') === 'error') {
      setGoogleError('Failed to connect Google account. Please try again.');
    }
  }, [location, checkGoogleConnectionStatus]);

  // Real-time listener for Google connection
  useEffect(() => {
    if (!currentUser || !organizationId) {
      setIsGoogleLoading(false);
      return;
    }
    const tokenDocRef = doc(
      db,
      'organizations',
      organizationId,
      'googleAuth',
      currentUser.uid
    );
    const unsubscribe = onSnapshot(
      tokenDocRef,
      (doc) => {
        const connected = doc.exists();
        if (connected !== isGoogleConnected) {
          setIsGoogleConnected(connected);
        }
        setIsGoogleLoading(false);
      },
      (error) => {
        console.error('Snapshot listener error:', error);
        setGoogleError('Error listening for Google connection status.');
        setIsGoogleLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser, organizationId, db, isGoogleConnected]);

  const handleGoogleConnect = async () => {
    if (!organizationId) {
      setGoogleError(
        'Could not determine your organization. Please try again.'
      );
      return;
    }
    setIsGoogleLoading(true);
    setGoogleError(null);
    const functions = getFunctions();
    const initiateGoogleOAuth = httpsCallable(functions, 'initiateGoogleOAuth');
    try {
      const result = await initiateGoogleOAuth({ organizationId });
      const { authorizationUrl } = result.data as { authorizationUrl: string };
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
      setGoogleError(
        'Failed to start the connection process. Please try again.'
      );
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    if (!organizationId) {
      setGoogleError(
        'Could not determine your organization. Please try again.'
      );
      return;
    }
    setIsGoogleLoading(true);
    setGoogleError(null);
    const functions = getFunctions();
    const disconnectGoogleAccount = httpsCallable(
      functions,
      'disconnectGoogleAccount'
    );
    try {
      await disconnectGoogleAccount({ organizationId });
      setGoogleSuccessMessage('Successfully disconnected your Google account.');
    } catch (error) {
      console.error('Error disconnecting Google account:', error);
      setGoogleError('Failed to disconnect the account. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLinkProperty = async (propertyId: string, placeId: string) => {
    if (!organizationId) {
      setPropertiesError('Organization ID not found.');
      return;
    }

    const location = gmbLocations.find((loc) => loc.name === placeId);
    const locationName = location ? location.title : '';

    const functions = getFunctions();
    const linkGmbToProperty = httpsCallable(functions, 'linkGmbToProperty');

    try {
      await linkGmbToProperty({
        organizationId,
        propertyId,
        placeId,
        locationName,
      });
      // Optimistically update the UI
      setProperties((prev) =>
        prev.map((p) =>
          p.id === propertyId
            ? { ...p, gmb: { placeId, locationName } }
            : p
        )
      );
    } catch (error) {
      console.error('Error linking property:', error);
      setPropertiesError('Failed to link property. Please try again.');
    }
  };

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
                      <Typography variant='caption' color='textSecondary'>
                        Use the placeholder{' '}
                        <Box
                          component='code'
                          sx={{
                            backgroundColor: 'action.hover',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          {'{{reviewLink}}'}
                        </Box>{' '}
                        to include a direct link to the Google Review form for
                        the property.
                      </Typography>
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

      {/* Google Account Connection Card */}
      <Card>
        <CardHeader
          avatar={
            <GoogleIcon
              color='primary'
              sx={{ width: { xs: 28, md: 32 }, height: { xs: 28, md: 32 } }}
            />
          }
          title={
            <Typography variant='h5' component='div'>
              Google Account Connection
            </Typography>
          }
          subheader='Connect your Google account to enable features like importing Google Reviews.'
        />
        <CardContent>
          {googleError && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {googleError}
            </Alert>
          )}
          {googleSuccessMessage && (
            <Alert severity='success' sx={{ mb: 2 }}>
              {googleSuccessMessage}
            </Alert>
          )}
          {isGoogleLoading ? (
            <CircularProgress />
          ) : isGoogleConnected ? (
            <Stack spacing={2} alignItems='flex-start'>
              <Typography variant='body1'>
                Your Google account is connected to this organization.
              </Typography>
              <Button
                variant='contained'
                color='secondary'
                onClick={handleGoogleDisconnect}
                disabled={isGoogleLoading}
              >
                Disconnect Google Account
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2} alignItems='flex-start'>
              <Typography variant='body1'>
                Connect your Google account to import reviews for your
                properties in this organization.
              </Typography>
              <Button
                variant='contained'
                color='primary'
                onClick={handleGoogleConnect}
                disabled={isGoogleLoading}
              >
                Connect Google Account
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* GMB Linking Card */}
      {isGoogleConnected && (
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
                Link Google My Business Profiles
              </Typography>
            }
            subheader='Link your properties to your Google My Business profiles to manage reviews.'
          />
          <CardContent>
            {propertiesError && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {propertiesError}
              </Alert>
            )}
            {isPropertiesLoading || isGmbLoading ? (
              <CircularProgress />
            ) : properties.length === 0 ? (
              <Typography>
                No active properties found in this organization.
              </Typography>
            ) : gmbLocations.length === 0 ? (
              <Typography>
                No Google My Business locations found for the connected
                account.
              </Typography>
            ) : (
              <Stack spacing={3}>
                {properties.map((prop) => (
                  <Box key={prop.id}>
                    <Typography variant='h6'>{prop.name}</Typography>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                      <InputLabel id={`gmb-select-label-${prop.id}`}>
                        Google My Business Location
                      </InputLabel>
                      <Select
                        labelId={`gmb-select-label-${prop.id}`}
                        value={prop.gmb?.placeId || ''}
                        label='Google My Business Location'
                        onChange={(e) =>
                          handleLinkProperty(prop.id, e.target.value)
                        }
                      >
                        <MenuItem value=''>
                          <em>None</em>
                        </MenuItem>
                        {gmbLocations.map((loc) => (
                          <MenuItem key={loc.name} value={loc.name}>
                            {loc.title} (
                            {loc.storefrontAddress?.addressLines?.join(', ')})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

export default OrganizationSettingsPage;
