import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { CreateInvitationResponse, AppError } from '../../types';

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import {
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { db } from '../../firebaseConfig';
import {
  collection,
  onSnapshot,
  query,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';

interface Organization {
  id: string;
  name: string;
}

const InviteOrganizationManagerForm: React.FC = () => {
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgLoading, setOrgLoading] = useState<boolean>(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { currentUser, roles } = useAuth();

  const functions = getFunctions();
  const createInvitationFn = httpsCallable(functions, 'createInvitation');

  useEffect(() => {
    setOrgLoading(true);
    const organizationsCollection = collection(db, 'organizations');
    const q = query(organizationsCollection);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orgsData = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            name: doc.data().name || 'Unnamed Organization',
          })
        );
        setOrganizations(orgsData as Organization[]);
        setOrgLoading(false);
      },
      (err) => {
        console.error('Error fetching organizations:', err);
        setOrgError('Failed to load organizations.');
        setOrgLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOrganizationChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;
    setSelectedOrgIds(
      // On autofill we get a stringified value.
      typeof value === 'string' ? value.split(',') : value
    );
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser || !roles.includes('admin')) {
      setError('Permission denied. Only administrators can send invitations.');
      return;
    }

    // Organization IDs are now optional for inviting an Organization Manager

    if (!inviteeEmail) {
      setError('Email is required.');
      return;
    }

    setLoading(true);

    try {
      const invitationPayload: {
        inviteeEmail: string;
        inviteeName: string | null; // Made inviteeName optional
        organizationIds?: string[]; // Changed from organizationId to organizationIds
        rolesToAssign: string[];
        invitedByRole: string;
      } = {
        inviteeEmail,
        inviteeName,
        rolesToAssign: ['organization_manager'],
        invitedByRole: 'admin',
      };

      // Only include organizationIds if some are selected
      if (selectedOrgIds.length > 0) {
        invitationPayload.organizationIds = selectedOrgIds;
      }

      const result = await createInvitationFn(invitationPayload);

      const responseData = result.data as CreateInvitationResponse;

      if (responseData?.success) {
        let successMessage = `Invitation sent successfully to ${inviteeEmail}.`;
        if (selectedOrgIds.length > 0) {
          const orgNames = selectedOrgIds
            .map((id) => organizations.find((o) => o.id === id)?.name || id)
            .join(', ');
          successMessage += ` They have been invited to manage organization(s): ${orgNames}.`;
        } else {
          successMessage += ` They can be assigned to an organization later.`;
        }
        setSuccess(successMessage);
        setInviteeEmail('');
        setInviteeName('');
        setSelectedOrgIds([]); // Reset multi-select
      } else {
        setError(responseData?.message || 'Failed to send invitation.');
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      const appError = err as AppError;
      setError(appError.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !roles.includes('admin')) {
    return (
      <Alert severity='error'>
        You do not have permission to access this feature.
      </Alert>
    );
  }

  return (
    <Box component='form' onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label='Organization Manager Name'
          value={inviteeName}
          onChange={(e) => setInviteeName(e.target.value)}
          margin='normal'
          fullWidth
          disabled={loading}
        />
        <TextField
          label='Organization Manager Email'
          type='email'
          value={inviteeEmail}
          onChange={(e) => setInviteeEmail(e.target.value)}
          margin='normal'
          required
          fullWidth
          disabled={loading}
        />
      </Stack>

      {orgLoading && <CircularProgress size={24} />}
      {orgError && <Alert severity='error'>{orgError}</Alert>}
      {!orgLoading && !orgError && (
        <FormControl fullWidth margin='normal'>
          <InputLabel id='organization-multiselect-label'>
            Organizations
          </InputLabel>
          <Select
            labelId='organization-multiselect-label'
            id='organization-multiselect'
            multiple
            value={selectedOrgIds}
            onChange={handleOrganizationChange}
            input={
              <OutlinedInput id='select-multiple-chip' label='Organizations' />
            }
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(selected as string[]).map((value) => (
                  <Chip
                    key={value}
                    label={
                      organizations.find((org) => org.id === value)?.name ||
                      value
                    }
                  />
                ))}
              </Box>
            )}
            // MenuProps can be used to style the dropdown if needed
          >
            {organizations.map((org) => (
              <MenuItem
                key={org.id}
                value={org.id}
                // style={getStyles(org.id, selectedOrgIds, theme)} // Optional: for custom styling of selected items
              >
                {org.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Button
        type='submit'
        variant='contained'
        color='primary'
        disabled={loading}
        startIcon={<PersonAdd />}
        sx={{ mt: 3, mb: 2 }} // Adjusted margins
      >
        {loading ? (
          <CircularProgress size={24} />
        ) : (
          'Invite Organization Manager'
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

export default InviteOrganizationManagerForm;
