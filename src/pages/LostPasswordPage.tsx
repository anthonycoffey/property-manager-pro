import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  Container,
  Paper,
  Avatar,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import PMPLogo from '/property-manager-pro.svg';
import PMPLogoLight from '/property-manager-pro-light.svg';
import { useThemeMode } from '../hooks/useThemeMode';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { isAppError } from '../utils/errorUtils';

const LostPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { mode } = useThemeMode();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
    } catch (err: unknown) {
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while sending the password reset email.');
      }
      console.error('Password reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component='main' maxWidth='xs'>
      <Paper
        elevation={6}
        sx={{
          mt: 8,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar
          src={mode === 'dark' ? PMPLogoLight : PMPLogo}
          alt='Property Manager Pro Logo'
          sx={{ width: 160, height: 160 }}
        />
        <Typography component='h1' variant='h5' sx={{ mt: 2 }}>
          Forgot Your Password?
        </Typography>
        <Typography variant='body2' sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
          Enter your email address and we'll send you a link to reset your password.
        </Typography>
        <Box
          component='form'
          onSubmit={handlePasswordReset}
          noValidate
          sx={{ mt: 1, width: '100%' }}
        >
          <TextField
            margin='normal'
            required
            fullWidth
            id='email'
            label='Email Address'
            name='email'
            autoComplete='email'
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            Send Password Reset Link
          </Button>
          {error && (
            <Typography color='error' variant='body2' sx={{ mt: 1, textAlign: 'center' }}>
              {error}
            </Typography>
          )}
          {successMessage && (
            <Typography color='success.main' variant='body2' sx={{ mt: 1, textAlign: 'center' }}>
              {successMessage}
            </Typography>
          )}
        </Box>
        <Typography variant='body2' sx={{ mt: 3 }}>
          Remember your password?{' '}
          <RouterLink to='/' style={{ textDecoration: 'none' }}>
            <Typography component='span' color='primary'>
              Sign In
            </Typography>
          </RouterLink>
        </Typography>
      </Paper>
    </Container>
  );
};

export default LostPasswordPage;
