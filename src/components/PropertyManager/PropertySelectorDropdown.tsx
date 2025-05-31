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
  FormHelperText,
} from '@mui/material';
import { db } from '../../firebaseConfig';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy, // Added orderBy
  type DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface Property {
  id: string;
  name: string;
  address: PropertyAddress;
}

interface PropertySelectorDropdownProps {
  organizationId: string; // Now required
  selectedPropertyId: string | null;
  onPropertyChange: (propertyId: string | null, propertyName: string | null) => void;
  disabled?: boolean;
  label?: string; // Optional label
}

const formatAddress = (address: PropertyAddress | undefined): string => {
  if (!address) return 'N/A';
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
};

const PropertySelectorDropdown: React.FC<PropertySelectorDropdownProps> = ({
  organizationId,
  selectedPropertyId,
  onPropertyChange,
  disabled = false,
  label = "Select Property",
}) => {
  const { currentUser } = useAuth(); // Still need currentUser for potential future permission checks if any
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!organizationId) { // Use passed organizationId
        setError('Organization ID not provided. Cannot load properties.');
        setProperties([]); // Clear properties if orgId is missing
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const propertiesRef = collection(db, `organizations/${organizationId}/properties`);
        // For Admin/OM context, we list all properties in the org, not just 'managedBy' current user.
        // If this component is also used by PMs where 'managedBy' is relevant,
        // that logic would need to be conditional based on role or a separate prop.
        // For now, assuming Admin/OM context for this refactor.
        const q = query(propertiesRef, orderBy('name', 'asc')); // Order by name for consistency
        const querySnapshot = await getDocs(q);
        
        const fetchedProperties: Property[] = [];
        querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          fetchedProperties.push({
            id: doc.id,
            name: data.name || 'Unnamed Property',
            address: data.address 
              ? {
                  street: data.address.street || '',
                  city: data.address.city || '',
                  state: data.address.state || '',
                  zip: data.address.zip || '',
                }
              : { street: '', city: '', state: '', zip: '' }, // Default empty address
          } as Property);
        });
        setProperties(fetchedProperties);
      } catch (err) {
        console.error('Error fetching properties for dropdown:', err);
        setError('Failed to load properties.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [organizationId]); // Depend on passed organizationId

  const handleChange = (event: SelectChangeEvent<string | null>) => {
    const value = event.target.value as string | null;
    if (value === '' || value === 'none' || value === null) {
      onPropertyChange(null, null);
    } else {
      const selectedProp = properties.find(p => p.id === value);
      onPropertyChange(value, selectedProp ? selectedProp.name : null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" sx={{ p: 1 }}>
        <CircularProgress size={20} sx={{ mr: 1 }} />
        <Typography variant="body2">Loading properties...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Typography color="error" sx={{ p: 1 }}>{error}</Typography>;
  }

  return (
    <Box sx={{ minWidth: 240 }}>
      <FormControl fullWidth error={!!error && properties.length === 0} disabled={disabled || !organizationId}>
        <InputLabel id="property-select-label">{label}</InputLabel>
        <Select
          labelId="property-select-label"
          id="property-select"
          value={selectedPropertyId ?? 'none'}
          label={label}
          onChange={handleChange}
        >
          <MenuItem value="none" disabled={properties.length > 0 || !organizationId}>
            <em>{properties.length === 0 && organizationId ? 'No properties available for this organization' : 'Select a Property'}</em>
          </MenuItem>
          {properties.map((prop) => (
            <MenuItem key={prop.id} value={prop.id}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body1">{prop.name}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatAddress(prop.address)}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
        {properties.length === 0 && !loading && !error && (
          <FormHelperText>You do not have any properties assigned to invite residents to.</FormHelperText>
        )}
      </FormControl>
    </Box>
  );
};

export default PropertySelectorDropdown;
