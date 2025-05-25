import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, type DocumentData } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { 
  Typography, 
  CircularProgress, 
  Paper, 
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link // Added Link for potential future use, not strictly needed now
} from '@mui/material';

interface PropertyAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface Property extends DocumentData {
  id: string;
  name: string;
  address: PropertyAddress; // Ensure address is part of the property type
  // Add other relevant property fields if needed for display
}

interface PropertyManagerPropertiesListProps {
  selectedPropertyId: string | null;
  onPropertySelect: (propertyId: string) => void;
}

const formatAddress = (address: PropertyAddress | undefined): string => {
  if (!address) return 'N/A';
  return `${address.street}, ${address.city}, ${address.state} ${address.zip}`;
};

const PropertyManagerPropertiesList: React.FC<PropertyManagerPropertiesListProps> = ({ selectedPropertyId, onPropertySelect }) => {
  const { currentUser, organizationId: authOrganizationId } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!currentUser || !authOrganizationId || !currentUser.uid) {
        setError('User organization or ID not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const propertiesRef = collection(db, `organizations/${authOrganizationId}/properties`);
        // Query for properties managed by the current user
        const q = query(propertiesRef, where('managedBy', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const fetchedProperties: Property[] = [];
        querySnapshot.forEach((doc) => {
          // Ensure address field exists and is structured as expected
          const data = doc.data();
          const addressData = data.address || {}; // Default to empty object if address is missing
          fetchedProperties.push({ 
            id: doc.id, 
            name: data.name || 'Unnamed Property',
            address: {
              street: addressData.street || '',
              city: addressData.city || '',
              state: addressData.state || '',
              zip: addressData.zip || '',
            },
            ...data 
          } as Property);
        });
        setProperties(fetchedProperties);

      } catch (err) {
        console.error("Error fetching properties:", err);
        setError('Failed to fetch properties.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [currentUser, authOrganizationId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error" sx={{ p: 2 }}>{error}</Typography>;
  }

  if (properties.length === 0) {
    return <Typography sx={{ p: 2 }}>No properties found assigned to you.</Typography>;
  }

  return (
    <Paper elevation={1} sx={{ /* p: 2 removed to allow TableContainer to manage padding if needed */ }}>
      {/* Typography for title can be handled by the parent component (Dashboard) if this list is part of a larger section */}
      {/* <Typography variant="h6" gutterBottom sx={{ p: 2 }}> 
        Your Managed Properties
      </Typography> */}
      <TableContainer sx={{ maxHeight: 440 }}> {/* Adjust maxHeight as needed */}
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell>Property Name</TableCell>
              <TableCell>Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {properties.map((property) => (
              <TableRow
                hover
                onClick={() => onPropertySelect(property.id)}
                selected={selectedPropertyId === property.id}
                key={property.id}
                sx={{ 
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  },
                }}
              >
                <TableCell component="th" scope="row">
                  {property.name}
                </TableCell>
                <TableCell>{formatAddress(property.address)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default PropertyManagerPropertiesList;
