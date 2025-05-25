import React, { useState } from 'react';
import {
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  Container,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom'; // Added RouterLink
import PMPLogo from '/property-manager-pro.svg'; // Import the logo
import PMPLogoLight from '/property-manager-pro-light.svg'; // Import the light logo
import { useThemeMode } from '../hooks/useThemeMode'; // Import the theme mode hook
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Assuming firebaseConfig.ts exports 'auth'
import { isAppError } from '../utils/errorUtils';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { mode } = useThemeMode(); // Get current theme mode

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User logged in with email and password!');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Email login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log('User logged in with Google!');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new OAuthProvider('microsoft.com');
      await signInWithPopup(auth, provider);
      console.log('User logged in with Microsoft!');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Microsoft login error:', err);
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
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar
          src={mode === 'dark' ? PMPLogoLight : PMPLogo}
          alt='Property Manager Pro Logo'
          sx={{ width: 160, height: 160 }} // Doubled the size
        />
        <Typography component='h1' variant='h5'>
          Sign In
        </Typography>
        <Box
          component='form'
          onSubmit={handleEmailLogin}
          noValidate
          sx={{ mt: 1 }}
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
          />
          <TextField
            margin='normal'
            required
            fullWidth
            name='password'
            label='Password'
            type={showPassword ? 'text' : 'password'}
            id='password'
            autoComplete='current-password'
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    aria-label='toggle password visibility'
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge='end'
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type='submit'
            fullWidth
            variant='contained'
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            Sign In with Email
          </Button>
          {error && (
            <Typography color='error' variant='body2' sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </Box>
        <Box sx={{ mt: 2, width: '100%' }}>
          <Button
            fullWidth
            variant='outlined'
            sx={{
              mb: 1,
              borderColor: '#db4437',
              color: '#db4437',
              '&:hover': {
                borderColor: '#db4437',
                backgroundColor: 'rgba(219, 68, 55, 0.04)',
              },
            }}
            onClick={handleGoogleLogin}
            disabled={loading}
            startIcon={<GoogleIcon />}
          >
            Sign In with Google
          </Button>
          <Button
            fullWidth
            variant='outlined'
            sx={{
              borderColor: '#0078D4',
              color: '#0078D4',
              '&:hover': {
                borderColor: '#0078D4',
                backgroundColor: 'rgba(0, 120, 212, 0.04)',
              },
            }}
            onClick={handleMicrosoftLogin}
            disabled={loading}
            startIcon={<MicrosoftIcon />}
          >
            Sign In with Microsoft
          </Button>
        </Box>
        <Typography variant='body2' sx={{ mt: 2 }}>
          Don't have an account?{' '}
          <RouterLink to='/signup' style={{ textDecoration: 'none' }}>
            <Typography component='span' color='primary'>
              Sign Up
            </Typography>
          </RouterLink>
        </Typography>
      </Paper>
    </Container>
  );
};

export default LoginForm;
