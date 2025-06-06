import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
} from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material'; // Example trend icons

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  isLoading?: boolean;
  icon?: React.ReactElement;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  onClick?: () => void; // Optional click handler
  sx?: object; // Allow custom styling
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  unit,
  isLoading,
  icon,
  trend,
  trendValue,
  onClick,
  sx,
}) => {
  const TrendIcon =
    trend === 'up'
      ? TrendingUp
      : trend === 'down'
      ? TrendingDown
      : TrendingFlat;

  return (
    <Card
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        ...sx,
      }}
      onClick={onClick}
      elevation={3}
    >
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <Typography
            variant='subtitle2'
            color='text.secondary'
            gutterBottom
            sx={{ mb: 0 }}
          >
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: 'text.secondary', ml: 1, display: 'flex', alignItems: 'center' }}>
              {/* MUI SvgIcons accept fontSize prop directly. Ensure 'icon' is of a type that supports it or style the Box. */}
              {React.isValidElement(icon) && typeof icon.type !== 'string' ?
                React.cloneElement(icon as React.ReactElement<{ fontSize?: string }>, { fontSize: 'medium' }) :
                icon
              }
            </Box>
          )}
        </Box>
        <Box sx={{ mt: 1 }}>
          {isLoading ? (
            <Skeleton variant='text' width='60%' height={40} />
          ) : (
            <Typography
              variant='h4'
              component='div'
              sx={{ fontWeight: 'bold' }}
            >
              {value}
              {unit && (
                <Typography
                  variant='h6'
                  component='span'
                  color='text.secondary'
                  sx={{ ml: 0.5 }}
                >
                  {unit}
                </Typography>
              )}
            </Typography>
          )}
        </Box>
        {(trend || trendValue) && !isLoading && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mt: 1,
              color:
                trend === 'up'
                  ? 'success.main'
                  : trend === 'down'
                  ? 'error.main'
                  : 'text.secondary',
            }}
          >
            {trend && <TrendIcon sx={{ fontSize: '1rem', mr: 0.5 }} />}
            <Typography variant='caption'>{trendValue}</Typography>
          </Box>
        )}
        {isLoading &&
          (trend || trendValue) && ( // Skeleton for trend line
            <Skeleton variant='text' width='40%' height={20} sx={{ mt: 1 }} />
          )}
      </CardContent>
    </Card>
  );
};

export default KpiCard;
