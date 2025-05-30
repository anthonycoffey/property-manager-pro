import React, { useState } from 'react';
import { IconButton } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Assuming firebaseConfig.ts exports 'auth'
import { isAppError } from '../utils/errorUtils';

const LogoutButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setLoading(true);
    setError('');
    try {
      await signOut(auth);
      // Redirect to login page or show a message
      console.log('User logged out successfully!');
    } catch (err: unknown) {
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IconButton color="inherit" onClick={handleLogout} disabled={loading} aria-label="logout">
      <LogoutIcon />
      {error && (
        <span style={{ marginLeft: '8px', color: 'red' }}>{error}</span> 
      )}
    </IconButton>
  );
};

export default LogoutButton;
