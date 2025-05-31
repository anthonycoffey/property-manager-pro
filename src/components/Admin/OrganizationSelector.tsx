import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  CircularProgress,
  type SelectChangeEvent,
} from '@mui/material';
import { db } from '../../firebaseConfig'; // Corrected import for Firestore instance
import {
  collection,
  onSnapshot,
  query,
  type DocumentData,
  QueryDocumentSnapshot,
  orderBy, // Added orderBy
  where, // Added where
} from 'firebase/firestore';

interface Organization {
  id: string;
  name: string;
  // Add other relevant fields if necessary, e.g., from your systemPatterns.md
  // For now, name is the most important for display.
}

interface OrganizationSelectorProps {
  selectedOrganizationId: string | null;
  onOrganizationChange: (organizationId: string | null) => void;
  managedOrganizationIds?: string[] | null; // Optional: For OM to filter their orgs
  label?: string; // Optional label
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  selectedOrganizationId,
  onOrganizationChange,
  managedOrganizationIds,
  label = "Select Organization",
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const organizationsCollection = collection(db, 'organizations');
    let q;

    if (managedOrganizationIds) { // This block handles OM context
      if (managedOrganizationIds.length === 0) {
        setOrganizations([]);
        setLoading(false);
        // If a selection existed but now there are no orgs to select from for this OM
        if (selectedOrganizationId !== null) {
          onOrganizationChange(null);
        }
        return; // No query needed, and no listener to unsubscribe from if we return early
      }
      // Firestore 'in' query limit is 30.
      // For simplicity, we'll assume managedOrganizationIds.length will be <= 30.
      // Production apps might need chunking for larger arrays.
      if (managedOrganizationIds.length > 30) {
        console.warn(
          "OrganizationSelector: managedOrganizationIds exceeds 30. Firestore 'in' query might fail or be inefficient. Consider chunking."
        );
      }
      q = query(
        organizationsCollection,
        where('__name__', 'in', managedOrganizationIds),
        orderBy('name')
      );
    } else {
      // Admin context or no specific filter: fetch all organizations
      q = query(organizationsCollection, orderBy('name'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orgsData = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) =>
            ({
              id: doc.id,
              name: doc.data().name || 'Unnamed Organization',
              ...doc.data(),
            } as Organization)
        );
        setOrganizations(orgsData);
        setLoading(false);

        // If a selection was made but that org is no longer in the fetched list, clear it
        // This handles cases where the list of available orgs changes (e.g., for an OM whose assignments change)
        if (
          selectedOrganizationId &&
          !orgsData.some((org) => org.id === selectedOrganizationId)
        ) {
          onOrganizationChange(null);
        }
      },
      (err) => {
        console.error('Error fetching organizations:', err);
        setError('Failed to load organizations. Please try again later.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [managedOrganizationIds, selectedOrganizationId, onOrganizationChange]); // Added dependencies

  const handleChange = (event: SelectChangeEvent<string | null>) => {
    const value = event.target.value as string | null;
    // Ensure '' from Select becomes null for parent state consistency
    onOrganizationChange(value === '' || value === 'none' ? null : value);
  };

  if (loading) {
    return (
      <Box
        display='flex'
        alignItems='center'
        justifyContent='center'
        sx={{ p: 2 }}
      >
        <CircularProgress size={24} />
        <Typography variant='body2' sx={{ ml: 1 }}>
          Loading organizations...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color='error' sx={{ p: 2 }}>
        {error}
      </Typography>
    );
  }
  
  if (organizations.length === 0 && !loading && managedOrganizationIds && managedOrganizationIds.length > 0) {
    return <Typography sx={{ p: 2 }}>No organizations found matching your assignments.</Typography>;
  }
  
  if (organizations.length === 0 && !loading && !managedOrganizationIds) {
    return <Typography sx={{ p: 2 }}>No organizations found in the system.</Typography>;
  }


  return (
    <Box sx={{mt: 1 }}>
      <FormControl fullWidth disabled={loading || organizations.length === 0}>
        <InputLabel id='organization-select-label'>
          {label}
        </InputLabel>
        <Select
          labelId='organization-select-label'
          id='organization-select'
          value={selectedOrganizationId ?? ''} // Use '' for Select if null, to avoid uncontrolled to controlled warning
          label={label}
          onChange={handleChange}
        >
          {/* Optional: Add a "None" or "Select..." option if desired, especially if the list can be empty */}
          {/* For now, relying on the label and empty state messages */}
          {organizations.map((org) => (
            <MenuItem key={org.id} value={org.id}>
              {org.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default OrganizationSelector;
