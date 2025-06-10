import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AvTimerIcon from '@mui/icons-material/AvTimer';

import { useAuth } from '../../../hooks/useAuth';

import KpiCard from '../Charts/KpiCard';
import BarChart from '../Charts/BarChart';
import PieChart from '../Charts/PieChart';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { isAppError } from '../../../utils/errorUtils';
import { usePropertyManagerContext } from '../../../hooks/usePropertyManagerContext';

interface PropertyCampaignPerformanceData {
  campaignName: string;
  accepted: number;
  status: string;
  type: string;
}
interface PropertyManagerDashboardStatsData {
  propertyCounts: {
    totalResidents: number;
    totalUnits: number;
    occupancyRate: number;
  };
  campaignPerformance?: PropertyCampaignPerformanceData[];
}

interface PhoenixTypeDistributionPoint {
  name: string;
  y: number;
}
interface PropertyManagerPhoenixStats {
  typeDistribution?: PhoenixTypeDistributionPoint[];
  total_submissions?: string;
  dispatched_count?: string;
  averageCompletionTime?: number | null;
}
interface PropertyManagerPhoenixStatsResponse {
  success: boolean;
  data?: PropertyManagerPhoenixStats;
  message?: string;
}

const PropertyManagerOverviewView: React.FC = () => {
  const { selectedPropertyId, selectedPropertyName } =
    usePropertyManagerContext();
  const { organizationId } = useAuth();

  const [dashboardStats, setDashboardStats] =
    useState<PropertyManagerDashboardStatsData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [phoenixStats, setPhoenixStats] =
    useState<PropertyManagerPhoenixStats | null>(null);
  const [phoenixLoading, setPhoenixLoading] = useState<boolean>(false);
  const [phoenixError, setPhoenixError] = useState<string | null>(null);

  const functionsInstance = getFunctions();

  useEffect(() => {
    const fetchPropertyManagerStats = async () => {
      if (!organizationId || !selectedPropertyId) {
        setDashboardStats(null);
        setDashboardLoading(false);
        return;
      }
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const getStatsFunction = httpsCallable(
          functionsInstance,
          'getPropertyManagerDashboardStats'
        );
        const result = await getStatsFunction({
          organizationId,
          propertyId: selectedPropertyId,
        });
        setDashboardStats(result.data as PropertyManagerDashboardStatsData);
      } catch (err: unknown) {
        let errorMessage = 'Failed to load dashboard statistics.';
        if (isAppError(err)) errorMessage = err.message;
        else if (err instanceof Error) errorMessage = err.message;
        setDashboardError(errorMessage);
      } finally {
        setDashboardLoading(false);
      }
    };

    const fetchPhoenixPropertyManagerStats = async () => {
      if (!organizationId || !selectedPropertyId) {
        setPhoenixStats(null);
        setPhoenixLoading(false);
        return;
      }
      setPhoenixLoading(true);
      setPhoenixError(null);
      try {
        const getStatsFunction = httpsCallable(
          functionsInstance,
          'getPropertyManagerPhoenixStats'
        );
        const result = await getStatsFunction({
          organizationId,
          propertyId: selectedPropertyId,
        });
        const responseData = result.data as PropertyManagerPhoenixStatsResponse;
        if (responseData?.success && responseData.data) {
          setPhoenixStats(responseData.data);
        } else {
          throw new Error(
            responseData?.message ||
              'Failed to fetch Phoenix stats for property'
          );
        }
      } catch (err: unknown) {
        let errorMessage = 'Failed to load Phoenix statistics for property.';
        if (isAppError(err)) errorMessage = err.message;
        else if (err instanceof Error) errorMessage = err.message;
        setPhoenixError(errorMessage);
      } finally {
        setPhoenixLoading(false);
      }
    };

    if (organizationId && selectedPropertyId) {
      fetchPropertyManagerStats();
      fetchPhoenixPropertyManagerStats();
    } else {
      setDashboardStats(null);
      setPhoenixStats(null);
      setDashboardLoading(false);
      setPhoenixLoading(false);
      setDashboardError(null);
      setPhoenixError(null);
    }
  }, [organizationId, selectedPropertyId, functionsInstance]);

  const campaignPerformanceOptions: Highcharts.Options | null = useMemo(() => {
    if (!dashboardStats?.campaignPerformance) return null;
    const categories = dashboardStats.campaignPerformance.map(
      (c) => c.campaignName
    );
    const acceptedData = dashboardStats.campaignPerformance.map(
      (c) => c.accepted
    );
    return {
      chart: { type: 'bar' },
      title: {
        text: `Campaign Acceptance for ${
          selectedPropertyName || 'Selected Property'
        }`,
      },
      xAxis: { categories, title: { text: 'Campaign Name' }, type: 'category' },
      yAxis: {
        min: 0,
        title: { text: 'Number Accepted' },
        allowDecimals: false,
      },
      series: [{ name: 'Accepted', data: acceptedData, type: 'bar' as const }],
      accessibility: { enabled: true },
    };
  }, [dashboardStats?.campaignPerformance, selectedPropertyName]);

  const phoenixTypeDistributionOptions: Highcharts.Options | null =
    useMemo(() => {
      if (
        !phoenixStats?.typeDistribution ||
        phoenixStats.typeDistribution.length === 0
      )
        return null;
      return {
        chart: { type: 'pie' },
        title: { text: 'Service Request Types' },
        tooltip: {
          pointFormat:
            '{series.name}: <b>{point.percentage:.1f}%</b> ({point.y})',
        },
        plotOptions: {
          pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
              enabled: true,
              format: '<b>{point.name}</b>: {point.y}',
            },
          },
        },
        series: [
          {
            name: 'Requests',
            colorByPoint: true,
            data: phoenixStats.typeDistribution,
            type: 'pie' as const,
          },
        ],
        accessibility: { enabled: true },
      };
    }, [phoenixStats?.typeDistribution]);

  if (!selectedPropertyId) {
    return (
      <Alert severity='info' sx={{ m: 2 }}>
        Please select a property to view its overview.
      </Alert>
    );
  }
  if (!organizationId) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        Organization context is missing.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '300px',
        p: { xs: 1, sm: 2, lg: 3 },
      }}
    >
      <Typography variant='h4' gutterBottom sx={{ mb: 3 }}>
        Overview for: {selectedPropertyName || 'Selected Property'}
      </Typography>

      {(dashboardLoading || phoenixLoading) && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 2,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <Box sx={{ opacity: dashboardLoading || phoenixLoading ? 0.3 : 1 }}>
        {dashboardError && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {dashboardError}
          </Alert>
        )}
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Property Stats
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <KpiCard
            title='Total Residents'
            value={
              dashboardLoading
                ? '...'
                : dashboardStats?.propertyCounts?.totalResidents ?? 'N/A'
            }
            isLoading={dashboardLoading}
            icon={<PeopleIcon />}
            sx={{ flex: 1 }}
          />
          <KpiCard
            title='Occupancy Rate'
            value={
              dashboardLoading
                ? '...'
                : `${(
                    (dashboardStats?.propertyCounts?.occupancyRate ?? 0) * 100
                  ).toFixed(1)}%`
            }
            isLoading={dashboardLoading}
            icon={<TrendingUpIcon />}
            sx={{ flex: 1 }}
          />
          <KpiCard
            title='Total Units'
            value={
              dashboardLoading
                ? '...'
                : dashboardStats?.propertyCounts?.totalUnits ?? 'N/A'
            }
            isLoading={dashboardLoading}
            icon={<HomeWorkIcon />}
            sx={{ flex: 1 }}
          />
        </Stack>

        <Divider sx={{ my: 4 }} />
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Campaign Performance
        </Typography>
        {(dashboardStats?.campaignPerformance &&
          dashboardStats.campaignPerformance.length > 0) ||
        dashboardLoading ? (
          <Paper elevation={0} sx={{ p: 2, mb: 3 }}>
            {campaignPerformanceOptions && (
              <BarChart
                options={campaignPerformanceOptions}
                isLoading={dashboardLoading}
                height='350px'
              />
            )}
          </Paper>
        ) : (
          !dashboardLoading &&
          !dashboardError && (
            <Typography sx={{ mt: 2, mb: 3 }}>
              No campaign data for this property.
            </Typography>
          )
        )}

        <Divider sx={{ my: 4 }} />
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Service Request Analytics
        </Typography>
        {phoenixError && (
          <Alert severity='error' sx={{ my: 2 }}>
            {phoenixError}
          </Alert>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <KpiCard
            title='Services Requested'
            value={
              phoenixLoading ? '...' : phoenixStats?.total_submissions ?? 'N/A'
            }
            isLoading={phoenixLoading}
            icon={<CrisisAlertIcon />}
            sx={{ flex: 1 }}
          />
          <KpiCard
            title='Technicians Dispatched'
            value={
              phoenixLoading ? '...' : phoenixStats?.dispatched_count ?? 'N/A'
            }
            isLoading={phoenixLoading}
            icon={<LocalShippingIcon />}
            sx={{ flex: 1 }}
          />
          <KpiCard
            title='Avg. Completion Time'
            value={
              phoenixLoading
                ? '...'
                : phoenixStats?.averageCompletionTime != null
                ? `${(phoenixStats.averageCompletionTime / (1000 * 60)).toFixed(
                    1
                  )} min`
                : 'N/A'
            }
            isLoading={phoenixLoading}
            icon={<AvTimerIcon />}
            sx={{ flex: 1 }}
          />
        </Stack>

        {(phoenixStats?.typeDistribution &&
          phoenixStats.typeDistribution.length > 0) ||
        phoenixLoading ? (
          <Paper elevation={0} sx={{ p: 2, my: 3 }}>
            {phoenixTypeDistributionOptions && (
              <PieChart
                options={phoenixTypeDistributionOptions}
                isLoading={phoenixLoading}
                height='350px'
              />
            )}
          </Paper>
        ) : (
          !phoenixLoading &&
          !phoenixError && (
            <Typography sx={{ mt: 2 }}>
              No Phoenix service type data for this property.
            </Typography>
          )
        )}

        {!(dashboardStats || dashboardLoading) &&
          !dashboardError &&
          !(phoenixStats || phoenixLoading) &&
          !phoenixError &&
          selectedPropertyId && (
            <Typography sx={{ mt: 2 }}>
              No dashboard data to display for this property.
            </Typography>
          )}
      </Box>
    </Box>
  );
};

export default PropertyManagerOverviewView;
