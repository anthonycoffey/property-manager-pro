import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { AppError } from '../../types'; // Assuming AppError is a general error type
import { db, functions } from '../../firebaseConfig'; // functions already imported, db needed
import { collectionGroup, query, where, getDocs, orderBy, type DocumentData } from 'firebase/firestore'; // type-only import

import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { Typography, FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent } from '@mui/material'; // type-only import
import OrganizationSelector from './OrganizationSelector';
import { AssignmentInd } from '@mui/icons-material';

// Define expected response type if specific, otherwise use a generic one
interface AssignOrgResponse {
  success: boolean;
  message: string;
  updatedClaims?: any; // Or a more specific type for claims
}

interface OrgManager {
  id: string;
  displayName: string;
  email: string;
}

const AssignOrgToManagerForm: React.FC = () => {
  const [targetUserId, setTargetUserId] = useState(''); // User ID of the Organization Manager
  const [newOrgId, setNewOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // For form submission
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles } = useAuth();

  const [orgManagers, setOrgManagers] = useState<OrgManager[]>([]);
  const [fetchingManagers, setFetchingManagers] = useState(false);
  const [fetchManagersError, setFetchManagersError] = useState<string | null>(null);

  // const functions = getFunctions(); // Already imported from firebaseConfig
  const assignOrgFn = httpsCallable(functions, 'addOrganizationToManager');

  useEffect(() => {
    if (currentUser && roles.includes('admin')) {
      setFetchingManagers(true);
      setFetchManagersError(null);
      const fetchOrgManagers = async () => {
        try {
          const usersCollectionGroup = collectionGroup(db, 'users');
          const q = query(
            usersCollectionGroup,
            where('organizationRoles', 'array-contains', 'organization_manager'),
            orderBy('displayName', 'asc')
          );
          const querySnapshot = await getDocs(q);
          const managers: OrgManager[] = [];
          querySnapshot.forEach((doc: DocumentData) => {
            // Deduplicate based on user ID, as a user might appear in multiple orgs' user lists
            // if their profile was ever stored there, though claims are the source of truth for roles.
            // For this dropdown, we only need unique users.
            if (!managers.find(m => m.id === doc.id)) {
              managers.push({
                id: doc.id,
                displayName: doc.data().displayName || 'N/A',
                email: doc.data().email || 'N/A',
              });
            }
          });
          setOrgManagers(managers);
        } catch (e) {
          console.error("Error fetching organization managers: ", e);
          setFetchManagersError("Failed to load organization managers. Ensure Firestore indexes are deployed.");
        } finally {
          setFetchingManagers(false);
        }
      };
      fetchOrgManagers();
    }
  }, [currentUser, roles]);


  const handleOrganizationChange = (orgId: string | null) => {
    setNewOrgId(orgId);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser || !roles.includes('admin')) {
      setError('Permission denied. Only Super Administrators can perform this action.');
      return;
    }

    if (!targetUserId) {
      setError('Organization Manager User ID is required.');
      return;
    }

    if (!newOrgId) {
      setError('An Organization must be selected to assign.');
      return;
    }

    setLoading(true);

    try {
      const result = await assignOrgFn({
        userId: targetUserId,
        newOrganizationId: newOrgId,
      });

      const responseData = result.data as AssignOrgResponse;

      if (responseData?.success) {
        setSuccess(responseData.message || `Successfully assigned organization ${newOrgId} to user ${targetUserId}.`);
        // Optionally clear fields if needed, or update local state if displaying a list of managers/orgs
      } else {
        setError(responseData?.message || 'Failed to assign organization.');
      }
    } catch (err) {
      console.error('Error assigning organization:', err);
      const appError = err as AppError; // Use HttpsError directly if preferred
      if ((err as any).code && (err as any).message) { // Check if it's likely an HttpsError
         setError(`Error: ${(err as any).message} (Code: ${(err as any).code})`);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !roles.includes('admin')) {
    // This check is mainly for UI consistency, actual permission is enforced by the cloud function
    return null; 
  }

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <FormControl fullWidth margin="normal" required disabled={loading || fetchingManagers}>
        <InputLabel id="org-manager-select-label">Select Organization Manager</InputLabel>
        <Select
          labelId="org-manager-select-label"
          id="org-manager-select"
          value={targetUserId}
          label="Select Organization Manager"
          onChange={(e: SelectChangeEvent<string>) => setTargetUserId(e.target.value as string)}
        >
          {fetchingManagers && <MenuItem value=""><CircularProgress size={20} sx={{mr:1}}/> Loading Managers...</MenuItem>}
          {!fetchingManagers && orgManagers.length === 0 && <MenuItem value="" disabled>No Organization Managers found</MenuItem>}
          {orgManagers.map((manager) => (
            <MenuItem key={manager.id} value={manager.id}>
              {manager.displayName} ({manager.email})
            </MenuItem>
          ))}
        </Select>
        {fetchManagersError && <Alert severity="warning" sx={{mt:1}}>{fetchManagersError}</Alert>}
      </FormControl>

      <Typography variant='subtitle1' gutterBottom sx={{mt: 2}}>
        Select New Organization to Assign:
      </Typography>
      <OrganizationSelector
        selectedOrganizationId={newOrgId}
        onOrganizationChange={handleOrganizationChange}
      />

      <Button
        type='submit'
        variant='contained'
        color='primary'
        disabled={loading || !targetUserId || !newOrgId}
        startIcon={<AssignmentInd />}
        sx={{ mt: 3 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Assign Organization to Manager'}
      </Button>

      {error && (
        <Alert severity='error' sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity='success' sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}
    </Box>
  );
};

export default AssignOrgToManagerForm;
