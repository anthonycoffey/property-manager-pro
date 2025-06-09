import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { usePropertyManagerContext } from '../../../hooks/usePropertyManagerContext';
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
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {propertyManagerNavItems.map((item: NavItemConfig) => (
          <Box
            key={item.text}
            sx={{
              flexGrow: 1,
              flexBasis: {
                xs: '100%', // 1 column
                sm: 'calc(50% - 8px)', // 2 columns
                md: 'calc(50% - 8px)', // 2 columns (2x2 grid)
                lg: 'calc(50% - 8px)', // 2 columns (2x2 grid)
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
                disabled={
                  !selectedPropertyId && item.path.includes(':propertyId')
                }
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
