import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import { db, functions } from '../../firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  type DocumentData,
} from 'firebase/firestore';

import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material';
import OrganizationSelector from './OrganizationSelector';
import { AssignmentInd } from '@mui/icons-material';

interface UserClaims {
  roles: string[];
  organizationId?: string;
  organizationIds?: string[];
  propertyId?: string;
}

interface AssignOrgResponse {
  success: boolean;
  message: string;
  updatedClaims?: UserClaims;
}

interface OrgManager {
  id: string;
  displayName: string;
  email: string;
}

const AssignOrgToManagerForm: React.FC = () => {
  const [targetUserId, setTargetUserId] = useState('');
  const [newOrgId, setNewOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles } = useAuth();

  const [orgManagers, setOrgManagers] = useState<OrgManager[]>([]);
  const [fetchingManagers, setFetchingManagers] = useState(false);
  const [fetchManagersError, setFetchManagersError] = useState<string | null>(
    null
  );

  const assignOrgFn = httpsCallable(functions, 'addOrganizationToManager');

  useEffect(() => {
    if (currentUser && roles.includes('admin')) {
      setFetchingManagers(true);
      setFetchManagersError(null);

      const fetchOrgManagers = async () => {
        try {
            const usersCollection = collection(db, 'admins');
            const q = query(
            usersCollection,
            where('roles', 'array-contains', 'organization_manager'),
            orderBy('displayName', 'asc')
            );
            const querySnapshot = await getDocs(q);
            const managers: OrgManager[] = [];
          querySnapshot.forEach((doc: DocumentData) => {
            if (!managers.find((m) => m.id === doc.id)) {
              managers.push({
                id: doc.id,
                displayName: doc.data().displayName || 'N/A',
                email: doc.data().email || 'N/A',
              });
            }
          });
          setOrgManagers(managers);
        } catch (e) {
          console.error('Error fetching organization managers: ', e);
          setFetchManagersError(
            'Failed to load organization managers. Ensure Firestore indexes are deployed.'
          );
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
      setError(
        'Permission denied. Only Super Administrators can perform this action.'
      );
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
        setSuccess(
          responseData.message ||
            `Successfully assigned organization ${newOrgId} to user ${targetUserId}.`
        );
        // Optionally clear fields if needed, or update local state if displaying a list of managers/orgs
      } else {
        setError(responseData?.message || 'Failed to assign organization.');
      }
    } catch (err) {
      console.error('Error assigning organization:', err);
      // Check if the error is an object with code and message properties (like Firebase HttpsError)
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        'message' in err
      ) {
        const firebaseError = err as { code: string; message: string }; // Type assertion
        setError(
          `Error: ${firebaseError.message} (Code: ${firebaseError.code})`
        );
      } else if (err instanceof Error) {
        // Fallback for generic JavaScript errors
        setError(`Error: ${err.message}`);
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
      <FormControl
        fullWidth
        margin='normal'
        required
        disabled={loading || fetchingManagers}
      >
        <InputLabel id='org-manager-select-label'>
          Select Organization Manager
        </InputLabel>
        <Select
          labelId='org-manager-select-label'
          id='org-manager-select'
          value={targetUserId}
          label='Select Organization Manager'
          onChange={(e: SelectChangeEvent<string>) =>
            setTargetUserId(e.target.value as string)
          }
        >
          {fetchingManagers && (
            <MenuItem value=''>
              <CircularProgress size={20} sx={{ mr: 1 }} /> Loading Managers...
            </MenuItem>
          )}
          {!fetchingManagers && orgManagers.length === 0 && (
            <MenuItem value='' disabled>
              No Organization Managers found
            </MenuItem>
          )}
          {orgManagers.map((manager) => (
            <MenuItem key={manager.id} value={manager.id}>
              {manager.displayName} ({manager.email})
            </MenuItem>
          ))}
        </Select>
        {fetchManagersError && (
          <Alert severity='warning' sx={{ mt: 1 }}>
            {fetchManagersError}
          </Alert>
        )}
      </FormControl>


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
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          'Assign Organization to Manager'
        )}
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
