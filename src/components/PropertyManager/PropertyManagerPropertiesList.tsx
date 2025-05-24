import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, type DocumentData } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';
import { List, ListItem, ListItemButton, ListItemText, Typography, CircularProgress, Paper, Box } from '@mui/material';

interface Property extends DocumentData {
  id: string;
  name: string;
  // Add other relevant property fields if needed for display
}

interface PropertyManagerPropertiesListProps {
  selectedPropertyId: string | null;
  onPropertySelect: (propertyId: string) => void;
}

const PropertyManagerPropertiesList: React.FC<PropertyManagerPropertiesListProps> = ({ selectedPropertyId, onPropertySelect }) => {
  const { currentUser, organizationId: authOrganizationId } = useAuth(); // Get organizationId from useAuth
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
        const q = query(propertiesRef, where('managedBy', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const fetchedProperties: Property[] = [];
        querySnapshot.forEach((doc) => {
          fetchedProperties.push({ id: doc.id, ...doc.data() } as Property);
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
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (properties.length === 0) {
    return <Typography>No properties found assigned to you.</Typography>;
  }

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Your Managed Properties
      </Typography>
      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        <List>
          {properties.map((property) => (
            <ListItem key={property.id} disablePadding>
              <ListItemButton
                selected={selectedPropertyId === property.id}
                onClick={() => onPropertySelect(property.id)}
              >
                <ListItemText primary={property.name} secondary={`ID: ${property.id}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Paper>
  );
};

export default PropertyManagerPropertiesList;
