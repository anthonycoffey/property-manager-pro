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
import { collection, onSnapshot, query, type DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

interface Organization {
  id: string;
  name: string;
  // Add other relevant fields if necessary, e.g., from your systemPatterns.md
  // For now, name is the most important for display.
}

interface OrganizationSelectorProps {
  selectedOrganizationId: string | null;
  onOrganizationChange: (organizationId: string | null) => void;
  // sx?: SxProps<Theme>; // Optional styling
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  selectedOrganizationId,
  onOrganizationChange,
  // sx,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const organizationsCollection = collection(db, 'organizations'); // Use db instead of firestore
    const q = query(organizationsCollection); // Add orderBy if needed, e.g., orderBy('name')

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const orgsData = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          name: doc.data().name || 'Unnamed Organization', // Fallback for missing name
          ...doc.data(), // Spread other fields if needed
        }));
        setOrganizations(orgsData as Organization[]);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching organizations:", err);
        setError('Failed to load organizations. Please try again later.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleChange = (event: SelectChangeEvent<string | null>) => {
    const value = event.target.value as string | null;
    onOrganizationChange(value === '' ? null : value);
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" sx={{ p: 2 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" sx={{ ml: 1 }}>Loading organizations...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;
  }

  return (
    <Box sx={{ minWidth: 240, p: 1 /*, ...sx*/ }}>
      <FormControl fullWidth>
        <InputLabel id="organization-select-label">Select Organization</InputLabel>
        <Select
          labelId="organization-select-label"
          id="organization-select"
          value={selectedOrganizationId ?? ''}
          label="Select Organization"
          onChange={handleChange}
        >
          <MenuItem value="">
            <em>None (Select an Organization)</em>
          </MenuItem>
          {organizations.map((org) => (
            <MenuItem key={org.id} value={org.id}>
              {org.name} (ID: {org.id})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default OrganizationSelector;
