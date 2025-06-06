import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  CardHeader,
  Divider,
  CircularProgress,
  TextField,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack, // For icon and title alignment
} from '@mui/material';
import {
  Cached,
  PersonOutline,
  MailOutline,
  VerifiedUserOutlined,
  // Edit, // Icon for CardHeader
  Save,
  Visibility,
  VisibilityOff,
  AccountCircle, // Icon for Profile CardHeader
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import {
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  sendEmailVerification,
} from 'firebase/auth';

const handleReload = () => {
  window.location.reload();
};

const GuestDashboardPanel: React.FC = () => {
  const { currentUser, loading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [changePasswordDialogOpen, setChangePasswordDialogOpen] =
    useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info'
  >('success');

  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    } else if (currentUser && !currentUser.displayName) {
      setDisplayName('');
    }
  }, [currentUser]);

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'info'
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleDisplayNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDisplayName(event.target.value);
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) {
      showSnackbar('No user logged in.', 'error');
      return;
    }
    if (!displayName.trim()) {
      showSnackbar('Display name cannot be empty.', 'error');
      return;
    }
    setEditLoading(true);
    try {
      await updateProfile(currentUser, { displayName: displayName.trim() });
      showSnackbar('Display name updated successfully!', 'success');
    } catch (error: unknown) {
      let message = 'Failed to update display name.';
      if (error instanceof Error) {
        message = error.message;
      }
      showSnackbar(message, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleChangePasswordOpen = () => setChangePasswordDialogOpen(true);
  const handleChangePasswordClose = () => {
    setChangePasswordDialogOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  const handleSendVerificationEmail = async () => {
    if (!currentUser) {
      showSnackbar('No user logged in.', 'error');
      return;
    }
    try {
      await sendEmailVerification(currentUser);
      showSnackbar(
        'Verification email sent! Please check your inbox.',
        'success'
      );
    } catch (error: unknown) {
      let message = 'Failed to send verification email.';
      if (error instanceof Error) {
        message = error.message;
      }
      showSnackbar(message, 'error');
    }
  };

  const handleChangePasswordConfirm = async () => {
    if (!currentUser || !currentUser.email) {
      showSnackbar('User or user email not available.', 'error');
      return;
    }
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showSnackbar('All password fields are required.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showSnackbar('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showSnackbar('New password must be at least 6 characters long.', 'error');
      return;
    }
    setChangePasswordLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      showSnackbar('Password updated successfully!', 'success');
      handleChangePasswordClose();
    } catch (error: unknown) {
      let errorMessage = 'Failed to change password.';
      if (error instanceof Error) {
        // Firebase errors often have a 'code' property, but it's not standard on Error.
        // We can check for it dynamically.
        const firebaseError = error as { code?: string; message: string };
        if (firebaseError.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect current password.';
        } else if (firebaseError.code === 'auth/requires-recent-login') {
          errorMessage =
            'This operation requires recent authentication. Please log out, log back in, and try again.';
        } else {
          errorMessage = firebaseError.message || errorMessage;
        }
      }
      showSnackbar(errorMessage, 'error');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const cardPadding = { p: 2 }; // Reduced padding for CardContent and CardActions

  return (
    <Container component='main' maxWidth='md'>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 2,
          mb: 2,
        }}
      >
        <Card sx={{ width: '100%', mb: 2 }}>
          <CardHeader
            avatar={<AccountCircle />}
            title='Your Account Profile'
         
          />
          <CardContent sx={cardPadding}>
            <Typography variant='body2' sx={{ mb: 2, textAlign: 'center' }}>
              Welcome,{' '}
              {currentUser?.displayName || currentUser?.email || 'User'}! Your
              account is pending activation. Manage your profile below.
            </Typography>
            <Divider sx={{ my: 1 }} />

            {currentUser && (
              <Box
                component='form'
                noValidate
                autoComplete='off'
                sx={{ mt: 1 }}
              >
                <TextField
                  fullWidth
                  label='Display Name'
                  variant='outlined'
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  sx={{ mb: 1.5 }} // Reduced mb
                  disabled={editLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <PersonOutline />
                      </InputAdornment>
                    ),
                  }}
                  size='small'
                />
                <Button
                  variant='contained'
                  color='primary'
                  fullWidth
                  onClick={handleUpdateProfile}
                  disabled={
                    editLoading ||
                    displayName === (currentUser?.displayName || '')
                  }
                  startIcon={
                    editLoading ? (
                      <CircularProgress size={20} color='inherit' />
                    ) : (
                      <Save />
                    )
                  }
                  sx={{ mb: 1.5 }} // Reduced mb
                >
                  {editLoading ? 'Saving...' : 'Save Display Name'}
                </Button>

                <TextField
                  fullWidth
                  label='Email'
                  variant='outlined'
                  value={currentUser.email || 'Not available'}
                  disabled
                  sx={{ mb: 1.5 }} // Reduced mb
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>
                          <MailOutline />
                        </InputAdornment>
                      ),
                    },
                  }}
                  size='small'
                />

                <Stack
                  direction='row'
                  alignItems='center'
                  justifyContent='space-between'
                  sx={{ mb: 1.5 }}
                >
                  <Stack direction='row' alignItems='center'>
                    <VerifiedUserOutlined
                      sx={{
                        mr: 1,
                        color: currentUser.emailVerified
                          ? 'success.main'
                          : 'text.secondary',
                      }}
                    />
                    <Typography variant='body2'>
                      Email Verified: {currentUser.emailVerified ? 'Yes' : 'No'}
                    </Typography>
                  </Stack>
                  {!currentUser.emailVerified && (
                    <Button
                      size='small'
                      onClick={handleSendVerificationEmail}
                      sx={{ textTransform: 'none' }}
                    >
                      Resend Verification
                    </Button>
                  )}
                </Stack>

                <Button
                  variant='outlined'
                  fullWidth
                  onClick={handleChangePasswordOpen}
                  sx={{ mb: 1.5 }}
                >
                  Change Password
                </Button>
              </Box>
            )}
            <Divider sx={{ my: 1 }} />
            <Typography
              variant='caption'
              display='block'
              sx={{ textAlign: 'center', mt: 1, mb: 1 }}
            >
              If your role is not yet active, click below to refresh.
            </Typography>
            <Button
              fullWidth
              variant='contained'
              onClick={handleReload}
              startIcon={<Cached />}
              size='small'
            >
              Refresh Account Status
            </Button>
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={changePasswordDialogOpen}
        onClose={handleChangePasswordClose}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 2, pb: 1 }}>
          Change Your Password
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            margin='dense'
            label='Current Password'
            type={showCurrentPassword ? 'text' : 'password'}
            fullWidth
            variant='standard'
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={changePasswordLoading}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge='end'
                  >
                    {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin='dense'
            label='New Password'
            type={showNewPassword ? 'text' : 'password'}
            fullWidth
            variant='standard'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={changePasswordLoading}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge='end'
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            margin='dense'
            label='Confirm New Password'
            type={showConfirmNewPassword ? 'text' : 'password'}
            fullWidth
            variant='standard'
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            disabled={changePasswordLoading}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    onClick={() =>
                      setShowConfirmNewPassword(!showConfirmNewPassword)
                    }
                    edge='end'
                  >
                    {showConfirmNewPassword ? (
                      <VisibilityOff />
                    ) : (
                      <Visibility />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ pb: 2, justifyContent: 'space-around' }}>
          <Button
            onClick={handleChangePasswordClose}
            color='inherit'
            disabled={changePasswordLoading}
            sx={{ flexGrow: 1, mr: 0.5 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleChangePasswordConfirm}
            color='primary'
            variant='contained'
            disabled={
              changePasswordLoading ||
              !currentPassword ||
              !newPassword ||
              !confirmNewPassword ||
              newPassword !== confirmNewPassword ||
              newPassword.length < 6
            }
            startIcon={
              changePasswordLoading ? (
                <CircularProgress size={20} color='inherit' />
              ) : (
                <Save />
              )
            }
            sx={{ flexGrow: 1, ml: 0.5 }}
          >
            {changePasswordLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
          variant='filled'
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GuestDashboardPanel;
