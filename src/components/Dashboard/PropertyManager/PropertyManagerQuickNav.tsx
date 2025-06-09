import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { usePropertyManagerContext } from '../../../contexts/PropertyManagerContext';
import { navigationItems } from '../../../config/navigationConfig';
import type { NavItemConfig } from '../../../config/navigationConfig';

const propertyManagerNavItems = navigationItems.filter(
  (item) =>
    item.roles.includes('property_manager') &&
    item.path !== '/dashboard/property-manager/overview'
);

const PropertyManagerQuickNav: React.FC = () => {
  const { selectedPropertyId } = usePropertyManagerContext();

  return (
    <>
      <Typography variant='h5' gutterBottom sx={{ mb: 3 }}>
        Manage Property
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {propertyManagerNavItems.map((item: NavItemConfig) => (
          <Box
            key={item.text}
            sx={{
              flexGrow: 1,
              flexBasis: {
                xs: '100%',
                sm: 'calc(50% - 8px)', // 2 columns
                md: 'calc(33.333% - 11px)', // 3 columns
                lg: 'calc(25% - 12px)', // 4 columns
              },
              minWidth: { xs: 'calc(50% - 8px)', sm: 180 },
            }}
          >
            <Card
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <CardActionArea
                component={RouterLink}
                to={item.path.replace(':propertyId', selectedPropertyId || '')}
                sx={{ flexGrow: 1 }}
                disabled={!selectedPropertyId && item.path.includes(':propertyId')}
              >
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <item.icon sx={{ fontSize: 48, mb: 2 }} color='primary' />
                  <Typography gutterBottom variant='h6' component='div'>
                    {item.text}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        ))}
      </Box>
    </>
  );
};

export default PropertyManagerQuickNav;
