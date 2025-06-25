import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { navigationItems } from '../../config/navigationConfig';
import type { NavItemConfig } from '../../config/navigationConfig';

const residentNavItems = navigationItems.filter(
  (item) =>
    item.roles.includes('resident') &&
    item.path !== '/dashboard/resident/my-profile' // Exclude self
);

const ResidentQuickNav: React.FC = () => {
  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {residentNavItems.map((item: NavItemConfig) => (
          <Box
            key={item.text}
            sx={{
              flexGrow: 1,
              flexBasis: {
                xs: '100%', // 1 column
                sm: 'calc(50% - 8px)', // 2 columns
                md: 'calc(33.333% - 11px)', // 3 columns for horizontal stack
                lg: 'calc(33.333% - 11px)', // 3 columns for horizontal stack
              },
              minWidth: { xs: 'calc(50% - 8px)', sm: 180 },
            }}
          >
            <Card
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <CardActionArea
                component={RouterLink}
                to={item.path} // Resident paths are direct, no :id replacement needed here
                sx={{ flexGrow: 1 }}
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

export default ResidentQuickNav;
