import React from 'react';
import { Card, CardHeader, CardContent, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface DashboardPageWrapperProps {
  title: string;
  icon: SvgIconComponent;
  children: React.ReactNode;
}

const DashboardPageWrapper: React.FC<DashboardPageWrapperProps> = ({
  title,
  icon: Icon,
  children,
}) => {
  return (
    <Card>
      <CardHeader
        avatar={
          <Icon
            color="primary"
            sx={{
              width: { xs: 28, md: 32 },
              height: { xs: 28, md: 32 },
            }}
          />
        }
        title={
          <Typography variant="h5" component="div">
            {title}
          </Typography>
        }
        sx={{ pb: 0, pt: 3, pl: 3 }}
      />
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default DashboardPageWrapper;
