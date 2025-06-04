import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  // List, // No longer using List for main profile display
  // ListItem,
  // ListItemIcon,
  // ListItemText,
  Divider,
  CircularProgress,
  TextField,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack, // For icon and title alignment
} from '@mui/material';
import {
  Cached,
  PersonOutline,
  MailOutline,
  VerifiedUserOutlined,
  // Edit, // Icon for CardHeader
  DeleteForever,
  Save,
  WarningAmberOutlined,
  Visibility,
  VisibilityOff,
  AccountCircle, // Icon for Profile CardHeader
  ManageAccounts, // Icon for Account Management CardHeader
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import {
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';

const handleReload = () => {
  window.location.reload();
};

const GuestDashboardPanel: React.FC = () => {
  const { currentUser, loading, signOutUser } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [passwordForDelete, setPasswordForDelete] = useState('');
  const [showPasswordForDelete, setShowPasswordForDelete] = useState(false);

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
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to update display name.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteAccountOpen = () => setDeleteDialogOpen(true);
  const handleDeleteAccountClose = () => {
    setDeleteDialogOpen(false);
    setPasswordForDelete('');
    setShowPasswordForDelete(false);
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
    } catch (error: any) {
      showSnackbar(
        error.message || 'Failed to send verification email.',
        'error'
      );
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
    } catch (error: any) {
      let errorMessage = 'Failed to change password.';
      if (error.code === 'auth/wrong-password')
        errorMessage = 'Incorrect current password.';
      else if (error.code === 'auth/requires-recent-login')
        errorMessage =
          'This operation requires recent authentication. Please log out, log back in, and try again.';
      else errorMessage = error.message || errorMessage;
      showSnackbar(errorMessage, 'error');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (!currentUser || !currentUser.email) {
      showSnackbar('User or user email not available.', 'error');
      return;
    }
    if (!passwordForDelete) {
      showSnackbar('Password is required to delete your account.', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordForDelete
      );
      await reauthenticateWithCredential(currentUser, credential);
      await deleteUser(currentUser);
      showSnackbar(
        'Account deleted successfully. You will be logged out.',
        'success'
      );
      setDeleteDialogOpen(false);
      if (signOutUser) await signOutUser();
      else auth.signOut();
    } catch (error: any) {
      let errorMessage = 'Failed to delete account.';
      if (error.code === 'auth/wrong-password')
        errorMessage = 'Incorrect password.';
      else if (error.code === 'auth/requires-recent-login')
        errorMessage =
          'This operation is sensitive and requires recent authentication. Please log out, log back in, and try again.';
      else errorMessage = error.message || errorMessage;
      showSnackbar(errorMessage, 'error');
    } finally {
      setDeleteLoading(false);
      setPasswordForDelete('');
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
    <Container component='main' maxWidth='sm'>
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
        {currentUser && (
          <Card
            sx={{ width: '100%', borderColor: 'error.main' }}
            variant='outlined'
          >
            <CardHeader
              avatar={<ManageAccounts sx={{ color: 'error.main' }} />}
              title='Delete Account'
              subheader='Danger Zone'
              slotProps={{
                title: {
                  align: 'left',
                  color: 'error.main',
                  fontWeight: 'bold',
                },
                subheader: { color: 'error', align: 'left' },
              }}
            
            />
            <CardContent sx={{ ...cardPadding, pt: 1 }}>
              <Typography variant='body2' sx={{ mb: 1.5 }}>
                Permanently delete your account and all of your associated data. This
                action is irreversible.
              </Typography>
            </CardContent>
            <CardActions
              sx={{ justifyContent: 'center', ...cardPadding, pt: 0 }}
            >
              <Button
                variant='contained'
                color='error'
                onClick={handleDeleteAccountOpen}
                startIcon={<DeleteForever />}
                disabled={deleteLoading}
                fullWidth
              >
                Delete My Account
              </Button>
            </CardActions>
          </Card>
        )}
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

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteAccountClose}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pt: 2, pb: 1 }}>
          <WarningAmberOutlined
            sx={{
              color: 'warning.main',
              fontSize: 30,
              verticalAlign: 'middle',
              mr: 0.5,
            }}
          />
          Confirm Account Deletion
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ textAlign: 'center', mb: 1 }}>
            This action is permanent. To confirm, please enter your password.
          </DialogContentText>
          <TextField
            autoFocus
            margin='dense'
            id='passwordForDelete'
            label='Password'
            type={showPasswordForDelete ? 'text' : 'password'}
            fullWidth
            variant='standard'
            value={passwordForDelete}
            onChange={(e) => setPasswordForDelete(e.target.value)}
            disabled={deleteLoading}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    onClick={() =>
                      setShowPasswordForDelete(!showPasswordForDelete)
                    }
                    edge='end'
                  >
                    {showPasswordForDelete ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ pb: 2, justifyContent: 'space-around' }}>
          <Button
            onClick={handleDeleteAccountClose}
            color='inherit'
            disabled={deleteLoading}
            sx={{ flexGrow: 1, mr: 0.5 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccountConfirm}
            color='error'
            variant='contained'
            disabled={deleteLoading || !passwordForDelete}
            startIcon={
              deleteLoading ? (
                <CircularProgress size={20} color='inherit' />
              ) : (
                <DeleteForever />
              )
            }
            sx={{ flexGrow: 1, ml: 0.5 }}
          >
            {deleteLoading ? 'Deleting...' : 'Delete My Account'}
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
