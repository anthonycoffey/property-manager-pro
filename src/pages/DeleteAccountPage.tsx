import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  CardActions,
  CardHeader,
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
} from '@mui/material';
import {
  DeleteForever,
  WarningAmberOutlined,
  Visibility,
  VisibilityOff,
  ManageAccounts, // Icon for Account Management CardHeader
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import {
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

const DeleteAccountPage: React.FC = () => {
  const { currentUser, signOutUser } = useAuth();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [passwordForDelete, setPasswordForDelete] = useState('');
  const [showPasswordForDelete, setShowPasswordForDelete] = useState(false);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info'
  >('success');

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const showSnackbar = (
    message: string,
    severity: 'success' | 'error' | 'info'
  ) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleDeleteAccountOpen = () => setDeleteDialogOpen(true);
  const handleDeleteAccountClose = () => {
    setDeleteDialogOpen(false);
    setPasswordForDelete('');
    setShowPasswordForDelete(false);
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
      // No navigation here, as signOutUser should handle redirect via AuthProvider or user will be on a blank page after logout.
      // Or, navigate('/login'); could be added if explicit redirect is needed post-deletion.
    } catch (error: unknown) {
      let errorMessage = 'Failed to delete account.';
      if (error instanceof Error) {
        const firebaseError = error as { code?: string; message: string };
        if (firebaseError.code === 'auth/wrong-password') {
          errorMessage = 'Incorrect password.';
        } else if (firebaseError.code === 'auth/requires-recent-login') {
          errorMessage =
            'This operation is sensitive and requires recent authentication. Please log out, log back in, and try again.';
        } else {
          errorMessage = firebaseError.message || errorMessage;
        }
      }
      showSnackbar(errorMessage, 'error');
    } finally {
      setDeleteLoading(false);
      setPasswordForDelete(''); // Clear password field regardless of outcome
    }
  };

  if (!currentUser) { // Basic check, ProtectedRoute should handle most of this
    return (
      <Container component="main" maxWidth="xs">
        <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography component="h1" variant="h5">
            Access Denied
          </Typography>
          <Typography sx={{ mt: 2 }}>
            You must be logged in to access this page.
          </Typography>
        </Box>
      </Container>
    );
  }
  
  const cardPadding = { p: 2 };

  return (
    <Container component='main' maxWidth='sm'> {/* Adjusted maxWidth for a focused page */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 4, // Added some top margin
          mb: 2,
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom sx={{ textAlign: 'center' }}>
          Delete Your Account
        </Typography>
        <Card
          sx={{ width: '100%', borderColor: 'error.main', mt: 2 }}
          variant='outlined'
        >
          <CardHeader
            avatar={<ManageAccounts sx={{ color: 'error.main' }} />}
            title='Account Deletion'
            subheader='Danger Zone: This action is irreversible'
            titleTypographyProps={{ align: 'left', color: 'error.main', fontWeight: 'bold' }}
            subheaderTypographyProps={{ color: 'error.dark', align: 'left' }}
          />
          <CardContent sx={{ ...cardPadding, pt: 1 }}>
            <Typography variant='body1' sx={{ mb: 1.5 }}> {/* Adjusted variant for better readability */}
              Permanently delete your account and all associated data. 
              This action cannot be undone. Please be absolutely sure before proceeding.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant='body2' color="text.secondary">
              If you proceed, your profile, settings, and any data linked to your account
              will be permanently erased from our systems.
            </Typography>
          </CardContent>
          <CardActions
            sx={{ justifyContent: 'center', ...cardPadding, pt: 0, pb: 2 }}
          >
            <Button
              variant='contained'
              color='error'
              onClick={handleDeleteAccountOpen}
              startIcon={<DeleteForever />}
              disabled={deleteLoading}
              fullWidth
              size="large" // Made button more prominent
            >
              Delete My Account
            </Button>
          </CardActions>
        </Card>
      </Box>

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
          <DialogContentText sx={{ textAlign: 'center', mb: 2 }}> {/* Increased margin */}
            This action is permanent and cannot be undone. 
            To confirm, please enter your current password.
          </DialogContentText>
          <TextField
            autoFocus
            margin='dense'
            id='passwordForDelete'
            label='Password'
            type={showPasswordForDelete ? 'text' : 'password'}
            fullWidth
            variant='outlined' // Changed to outlined for consistency
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
                    aria-label={showPasswordForDelete ? "Hide password" : "Show password"}
                  >
                    {showPasswordForDelete ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-around' }}> {/* Adjusted padding */}
          <Button
            onClick={handleDeleteAccountClose}
            color='inherit'
            disabled={deleteLoading}
            sx={{ flexGrow: 1, mr: 0.5 }}
            variant="outlined" // Added variant
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
            {deleteLoading ? 'Deleting...' : 'Confirm Deletion'}
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

export default DeleteAccountPage;
