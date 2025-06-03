import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Button,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
} from '@mui/material';
import { PhoneCallback as PhoneCallbackIcon } from '@mui/icons-material';
import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';

// Define Zod schema for 10-digit US phone number
const phoneSchema = z.string()
  .min(10, { message: 'Please enter your 10-digit phone number.' })
  .regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit US phone number.' });

interface RequestTwilioCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RequestCallResponseData {
  success: boolean;
  message?: string;
  error?: string;
  callSid?: string;
}

const RequestTwilioCallDialog: React.FC<RequestTwilioCallDialogProps> = ({ open, onOpenChange }) => {
  const { currentUser } = useAuth();
  const [rawPhoneNumber, setRawPhoneNumber] = useState(''); // Stores raw 10 digits
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState(''); // Formatted for display
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setRawPhoneNumber('');
      setDisplayPhoneNumber('');
      setError(null);
      setIsSubmitting(false);

      // Pre-fill phone number from user profile if available
      if (currentUser?.phoneNumber && currentUser.phoneNumber.startsWith('+1')) {
        const usNumber = currentUser.phoneNumber.substring(2); // Remove "+1"
        if (/^\d{10}$/.test(usNumber)) {
          setRawPhoneNumber(usNumber);
          setDisplayPhoneNumber(`+1 (${usNumber.substring(0, 3)}) ${usNumber.substring(3, 6)}-${usNumber.substring(6, 10)}`);
        }
      }
    }
  }, [open, currentUser]);

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove non-digits, except for a leading +1 or +
    let digits = inputValue.replace(/[^\d+]/g, '');
    if (digits.startsWith('+1')) {
      digits = digits.substring(2);
    } else if (digits.startsWith('+')) {
      // Allow typing '+' initially but then expect '1' for US numbers
      if (digits.length > 1 && digits.charAt(1) === '1') {
        digits = digits.substring(2);
      } else if (digits.length === 1 && digits.charAt(0) === '+') {
        // Just a '+' typed, keep it for now or clear if next is not '1'
         setDisplayPhoneNumber('+');
         setRawPhoneNumber('');
         setError(null);
         return;
      } else {
        digits = digits.replace(/\D/g, ''); // If not +1, strip all non-digits
      }
    }
    digits = digits.replace(/\D/g, '').slice(0, 10); // Keep only up to 10 digits

    setRawPhoneNumber(digits);
    setError(null); // Clear error on input change

    // Format for display: +1 (XXX) XXX-XXXX
    if (digits.length > 0) {
      let formatted = '';
      if (digits.length <= 3) {
        formatted = `(${digits}`;
      } else if (digits.length <= 6) {
        formatted = `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
      } else {
        formatted = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
      }
      setDisplayPhoneNumber(`+1 ${formatted}`);
    } else if (inputValue.startsWith('+')) {
        setDisplayPhoneNumber('+'); // Keep '+' if user is trying to type +1
    }
     else {
      setDisplayPhoneNumber('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationResult = phoneSchema.safeParse(rawPhoneNumber);
    if (!validationResult.success) {
      setError(validationResult.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const functions = getFunctions();
      const requestTwilioCallCallable = httpsCallable< { phoneNumber: string }, RequestCallResponseData >(functions, 'requestTwilioCall');
      
      const e164PhoneNumber = `+1${validationResult.data}`;

      const result: HttpsCallableResult<RequestCallResponseData> = await requestTwilioCallCallable({ phoneNumber: e164PhoneNumber });
      
      const responseData = result.data;

      if (responseData.success) {
        setSnackbarMessage(responseData.message || 'Call requested successfully! We will call you shortly.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        onOpenChange(false);
      } else {
        throw new Error(responseData.error || responseData.message || 'Failed to initiate call.');
      }
    } catch (err) {
      console.error('Error requesting call:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setSnackbarMessage(`Call request failed: ${errorMessage}`);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      // Do not close dialog on error, let user try again or cancel
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSnackbar = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <>
      <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Request a Call</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Enter your 10-digit US phone number, and we'll connect you with a live agent.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="phoneNumber"
              label="Phone Number"
              type="tel"
              fullWidth
              variant="outlined"
              placeholder="+1 (555) 123-4567"
              value={displayPhoneNumber}
              onChange={handlePhoneInputChange}
              error={!!error}
              helperText={error}
              disabled={isSubmitting}
              InputLabelProps={{ shrink: true }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => onOpenChange(false)} color="inherit" disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <PhoneCallbackIcon />}
            >
              {isSubmitting ? 'Connecting...' : 'Connect Me'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RequestTwilioCallDialog;
