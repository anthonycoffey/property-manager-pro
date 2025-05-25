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
  Avatar, // Added Avatar
} from '@mui/material';
import { Visibility, VisibilityOff, Google as GoogleIcon, Microsoft as MicrosoftIcon } from '@mui/icons-material'; // Added GoogleIcon, MicrosoftIcon
import { useNavigate, Link as RouterLink } from 'react-router-dom'; // Added RouterLink
import PMPLogo from '/property-manager-pro.svg'; // Import the logo
import PMPLogoLight from '/property-manager-pro-light.svg'; // Import the light logo
import { useThemeMode } from '../hooks/useThemeMode'; // Import the theme mode hook
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
} from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Assuming firebaseConfig.ts exports 'auth'
import { isAppError } from '../utils/errorUtils';

const SignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { mode } = useThemeMode(); // Get current theme mode

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('User signed up with email and password!');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Email signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log('User signed up with Google!');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Google signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftSignup = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new OAuthProvider('microsoft.com');
      await signInWithPopup(auth, provider);
      console.log('User signed up with Microsoft!');
      navigate('/dashboard');
    } catch (err: unknown) {
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Microsoft signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={6} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar
          src={mode === 'dark' ? PMPLogoLight : PMPLogo}
          alt="Property Manager Pro Logo"
          sx={{ width: 160, height: 160 }} // Doubled the size and added margin
        />
        <Typography component="h1" variant="h5">
          Sign Up
        </Typography>
        <Box component="form" onSubmit={handleEmailSignup} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleClickShowPassword}
                    onMouseDown={handleMouseDownPassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            Sign Up with Email
          </Button>
          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </Box>
        <Box sx={{ mt: 2, width: '100%' }}>
          <Button
            fullWidth
            variant="outlined"
            sx={{
              mb: 1,
              borderColor: '#db4437',
              color: '#db4437',
              '&:hover': {
                borderColor: '#db4437',
                backgroundColor: 'rgba(219, 68, 55, 0.04)',
              },
            }}
            onClick={handleGoogleSignup}
            disabled={loading}
            startIcon={<GoogleIcon />}
          >
            Sign Up with Google
          </Button>
          <Button
            fullWidth
            variant="outlined"
            sx={{
              borderColor: '#0078D4',
              color: '#0078D4',
              '&:hover': {
                borderColor: '#0078D4',
                backgroundColor: 'rgba(0, 120, 212, 0.04)',
              },
            }}
            onClick={handleMicrosoftSignup}
            disabled={loading}
            startIcon={<MicrosoftIcon />}
          >
            Sign Up with Microsoft
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Already have an account?{' '}
          <RouterLink to="/login" style={{ textDecoration: 'none' }}>
            <Typography component="span" color="primary">
              Sign In
            </Typography>
          </RouterLink>
        </Typography>
      </Paper>
    </Container>
  );
};

export default SignupForm;
