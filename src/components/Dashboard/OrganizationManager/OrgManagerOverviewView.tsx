import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Divider, // Added Divider
} from '@mui/material';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

// Chart Components
import KpiCard from '../Charts/KpiCard';
import BarChart from '../Charts/BarChart';
import PieChart from '../Charts/PieChart';

// Firebase functions
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isAppError } from '../../../utils/errorUtils';
import { useOrgManagerContext } from '../../../hooks/useOrgManagerContext';

// Types (mirroring OrganizationManagerDashboardPanel)
interface CampaignPerformanceData {
  campaignName: string;
  accepted: number;
  potential?: number;
  rate?: number;
  status: string;
  type: string;
}
interface OrgManagerDashboardStatsData {
  organizationCounts: {
    properties: number;
    residents: number;
    propertyManagers: number;
  };
  campaignPerformance?: {
    activeCampaigns: number;
    conversionRates: CampaignPerformanceData[];
  };
}

interface PhoenixTypeDistributionPoint {
  name: string;
  y: number;
}
interface OrgManagerPhoenixStats {
  typeDistribution?: PhoenixTypeDistributionPoint[];
  averageCompletionTime?: number | null;
  total_submissions?: string;
  dispatched_count?: string;
}
interface OrgManagerPhoenixStatsResponse {
  success: boolean;
  data?: OrgManagerPhoenixStats;
  message?: string;
}

const OrgManagerOverviewView: React.FC = () => {
  const { selectedOrgId, selectedOrganization } = useOrgManagerContext();

  const [dashboardStats, setDashboardStats] =
    useState<OrgManagerDashboardStatsData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [phoenixStats, setPhoenixStats] =
    useState<OrgManagerPhoenixStats | null>(null);
  const [phoenixLoading, setPhoenixLoading] = useState<boolean>(false);
  const [phoenixError, setPhoenixError] = useState<string | null>(null);

  const functionsInstance = getFunctions();

  useEffect(() => {
    const fetchOrgManagerStats = async () => {
      if (!selectedOrgId) {
        setDashboardStats(null);
        setDashboardLoading(false);
        return;
      }
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const getStatsFunction = httpsCallable(
          functionsInstance,
          'getOrgManagerDashboardStats'
        );
        const result = await getStatsFunction({
          organizationId: selectedOrgId,
        });
        setDashboardStats(result.data as OrgManagerDashboardStatsData);
      } catch (err: unknown) {
        let errorMessage = 'Failed to load dashboard statistics.';
        if (isAppError(err)) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setDashboardError(errorMessage);
      } finally {
        setDashboardLoading(false);
      }
    };

    const fetchPhoenixOrgManagerStats = async () => {
      if (!selectedOrgId) {
        setPhoenixStats(null);
        setPhoenixLoading(false);
        return;
      }
      setPhoenixLoading(true);
      setPhoenixError(null);
      try {
        const getStatsFunction = httpsCallable(
          functionsInstance,
          'getOrgManagerPhoenixStats'
        );
        const result = await getStatsFunction({
          organizationId: selectedOrgId,
        });
        const responseData = result.data as OrgManagerPhoenixStatsResponse;
        if (responseData?.success && responseData.data) {
          setPhoenixStats(responseData.data);
        } else {
          throw new Error(
            responseData?.message ||
              'Failed to fetch Phoenix stats for organization'
          );
        }
      } catch (err: unknown) {
        let errorMessage =
          'Failed to load Phoenix statistics for organization.';
        if (isAppError(err)) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setPhoenixError(errorMessage);
      } finally {
        setPhoenixLoading(false);
      }
    };

    if (selectedOrgId) {
      fetchOrgManagerStats();
      fetchPhoenixOrgManagerStats();
    } else {
      setDashboardStats(null);
      setPhoenixStats(null);
      setDashboardLoading(false);
      setPhoenixLoading(false);
      setDashboardError(null);
      setPhoenixError(null);
    }
  }, [selectedOrgId, functionsInstance]);

  const campaignPerformanceOptions: Highcharts.Options | null = useMemo(() => {
    if (!dashboardStats?.campaignPerformance?.conversionRates) return null;
    const categories = dashboardStats.campaignPerformance.conversionRates.map(
      (c) => c.campaignName
    );
    const acceptedData = dashboardStats.campaignPerformance.conversionRates.map(
      (c) => c.accepted
    );
    return {
      chart: { type: 'bar' },
      title: { text: 'Campaign Acceptance' },
      xAxis: { categories, title: { text: 'Campaign Name' }, type: 'category' },
      yAxis: {
        min: 0,
        title: { text: 'Number Accepted' },
        allowDecimals: false,
      },
      series: [{ name: 'Accepted', data: acceptedData, type: 'bar' as const }],
      accessibility: { enabled: true },
    };
  }, [dashboardStats?.campaignPerformance]);

  const phoenixTypeDistributionOptions: Highcharts.Options | null =
    useMemo(() => {
      if (
        !phoenixStats?.typeDistribution ||
        phoenixStats.typeDistribution.length === 0
      )
        return null;
      return {
        chart: { type: 'pie' },
        title: { text: 'Service Request Types (Phoenix)' },
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

  if (!selectedOrgId || !selectedOrganization) {
    return (
      <Alert severity='info' sx={{ m: 2 }}>
        Please select an organization to view its overview.
      </Alert>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, lg: 3 },
        position: 'relative',
        minHeight: '300px',
      }}
    >
      <Typography variant='h4' gutterBottom sx={{ mb: 3 }}>
        Overview for: {selectedOrganization.name}
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
          Organization Stats
        </Typography>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <KpiCard
            title='Total Properties'
            value={
              dashboardLoading
                ? '...'
                : dashboardStats?.organizationCounts?.properties ?? 'N/A'
            }
            isLoading={dashboardLoading}
            icon={<HomeWorkIcon />}
            sx={{ flex: 1 }}
          />
          <KpiCard
            title='Total Residents'
            value={
              dashboardLoading
                ? '...'
                : dashboardStats?.organizationCounts?.residents ?? 'N/A'
            }
            isLoading={dashboardLoading}
            icon={<PeopleIcon />}
            sx={{ flex: 1 }}
          />
          <KpiCard
            title='Property Managers'
            value={
              dashboardLoading
                ? '...'
                : dashboardStats?.organizationCounts?.propertyManagers ?? 'N/A'
            }
            isLoading={dashboardLoading}
            icon={<AssignmentIndIcon />}
            sx={{ flex: 1 }}
          />
        </Stack>

        <Divider sx={{ my: 4 }} />
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Campaign Performance
        </Typography>
        <Stack
          spacing={3}
          sx={{ mb: 4 }}
          direction={{ xs: 'column', lg: 'row' }}
          alignItems='center'
        >
          <Box sx={{ width: { xs: '100%', lg: '60%' }, p: 1 }}>
            {(dashboardStats?.campaignPerformance?.conversionRates &&
              dashboardStats.campaignPerformance.conversionRates.length > 0) ||
            dashboardLoading ? (
              <>
                {campaignPerformanceOptions && (
                  <BarChart
                    options={campaignPerformanceOptions}
                    isLoading={dashboardLoading}
                    height='350px'
                  />
                )}
              </>
            ) : (
              !dashboardLoading &&
              !dashboardError && (
                <Typography>No campaign data for this organization.</Typography>
              )
            )}
          </Box>
          <Box
            sx={{ width: { xs: '100%', lg: '40%' }, p: 1, textAlign: 'center' }}
          >
            {dashboardStats?.campaignPerformance || dashboardLoading ? (
              <Paper elevation={0} sx={{ p: 2 }}>
                <KpiCard
                  title='Active Campaigns'
                  value={
                    dashboardLoading
                      ? '...'
                      : dashboardStats?.campaignPerformance?.activeCampaigns ??
                        'N/A'
                  }
                  isLoading={dashboardLoading}
                />
              </Paper>
            ) : null}
          </Box>
        </Stack>

        <Divider sx={{ my: 4 }} />
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Service Request Analytics (Phoenix)
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
            title='Avg. Service Completion Time'
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
            icon={<TrendingUpIcon />}
            sx={{ flex: 1 }}
          />
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
        </Stack>
        <Box sx={{ p: 1 }}>
          {(phoenixStats?.typeDistribution &&
            phoenixStats.typeDistribution.length > 0) ||
          phoenixLoading ? (
            <Paper elevation={0} sx={{ p: 2, my: 2 }}>
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
              <Typography>No Phoenix service type data.</Typography>
            )
          )}
        </Box>

        {!(dashboardStats || dashboardLoading) &&
          !dashboardError &&
          !(phoenixStats || phoenixLoading) &&
          !phoenixError &&
          selectedOrgId && (
            <Typography>
              No dashboard data to display for this organization.
            </Typography>
          )}
      </Box>


    </Box>
  );
};

export default OrgManagerOverviewView;
