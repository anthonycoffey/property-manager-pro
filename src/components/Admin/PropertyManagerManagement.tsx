import React, { useState } from 'react';
import { Box, Typography, Button, TextField, Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig'; // Import the functions instance

// Define the callable function
const createPropertyManagerCallable = httpsCallable(functions, 'createPropertyManager');

const PropertyManagerManagement: React.FC = () => {
  const { roles, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  if (loading) {
    return <div>Loading Property Manager Management...</div>;
  }

  // Only allow 'admin' role to access this component
  if (!roles.includes('admin')) {
    return <Navigate to="/unauthorized" replace />;
  }

  const handleCreatePropertyManager = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormLoading(true);
    setMessage(null);

    try {
      const result = await createPropertyManagerCallable({
        email,
        password,
        displayName,
        organizationId,
      });
      setMessage({ type: 'success', text: (result.data as any).message || 'Property manager created successfully!' });
      setEmail('');
      setPassword('');
      setDisplayName('');
      setOrganizationId('');
    } catch (error: any) {
      console.error('Error creating property manager:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create property manager.' });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Admin Dashboard: Property Manager Management
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        This section allows administrators to manage property manager accounts.
      </Typography>

      <Box component="form" onSubmit={handleCreatePropertyManager} sx={{ mt: 3, mb: 4, p: 3, border: '1px solid #ccc', borderRadius: '8px' }}>
        <Typography variant="h6" gutterBottom>
          Add New Property Manager
        </Typography>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <TextField
          label="Display Name"
          fullWidth
          margin="normal"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        <TextField
          label="Organization ID"
          fullWidth
          margin="normal"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          disabled={formLoading}
        >
          {formLoading ? 'Creating...' : 'Create Property Manager'}
        </Button>
      </Box>

      {/* Placeholder for Property Manager List/Table */}
      <Box sx={{ mt: 3, border: '1px dashed grey', p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Property Manager list and CRUD operations will go here.
        </Typography>
      </Box>
    </Box>
  );
};

export default PropertyManagerManagement;
