import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { collection, query, getDocs } from 'firebase/firestore'; // Removed 'where' as it's not used
import { db } from '../firebaseConfig';
import { useAuth } from '../hooks/useAuth';
import { Container, Typography, List, ListItemButton, ListItemText, CircularProgress, Alert, Button, Box } from '@mui/material'; // Added ListItemButton

interface Property {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  // Add other relevant property fields if needed for display
}

const PropertyListPage: React.FC = () => {
  const { currentUser, organizationId } = useAuth(); // Destructure organizationId
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      if (!currentUser || !organizationId) { // Use destructured organizationId
        setError('User or organization not found.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const propertiesRef = collection(db, `organizations/${organizationId}/properties`); // Use destructured organizationId
        const q = query(propertiesRef); // No 'managedBy' filter needed as per revised plan
        const querySnapshot = await getDocs(q);
        
        const propsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];
        setProperties(propsData);
      } catch (err) {
        console.error("Error fetching properties:", err);
        setError('Failed to fetch properties. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [currentUser]);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          My Organization's Properties
        </Typography>
        <Button
          variant="contained"
          component={RouterLink}
          to="/pm/create-property" // Assuming a route for CreatePropertyForm
        >
          Create New Property
        </Button>
      </Box>
      {properties.length === 0 ? (
        <Typography>No properties found for your organization.</Typography>
      ) : (
        <List>
          {properties.map((property) => (
            <ListItemButton // Changed ListItem to ListItemButton
              key={property.id}
              component={RouterLink} 
              to={`/pm/property/${property.id}`}
              sx={{ border: '1px solid #ddd', mb: 1, borderRadius: '4px' }}
            >
              <ListItemText 
                primary={property.name} 
                secondary={`${property.address.street}, ${property.address.city}, ${property.address.state} ${property.address.zip}`} 
              />
            </ListItemButton> // Changed ListItem to ListItemButton
          ))}
        </List>
      )}
    </Container>
  );
};

export default PropertyListPage;
