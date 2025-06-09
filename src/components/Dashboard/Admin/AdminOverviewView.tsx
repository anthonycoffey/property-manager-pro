import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import {
  Business,
  Group,
  AssignmentInd,
  HomeWork,
  CrisisAlert,
  LocalShipping,
  AvTimer,
  People as PeopleIcon,
  NotificationsActive as NotificationsActiveIcon, // For Active Campaigns
  // UploadFile as UploadFileIcon, // Removed
  // Percent as PercentIcon, // Removed
  CheckCircleOutline as CheckCircleOutlineIcon, // For Total Accepted Invitations
} from '@mui/icons-material';

import { Link as RouterLink } from 'react-router-dom';
import { navigationItems } from '../../../config/navigationConfig';
import type { NavItemConfig } from '../../../config/navigationConfig';

// Import Chart Components
import KpiCard from '../Charts/KpiCard';
import PieChart from '../Charts/PieChart';

// Firebase functions
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isAppError } from '../../../utils/errorUtils';

// Define AdminDashboardStats type locally
interface GrowthDataPoint {
  period: string;
  count: number;
}

interface AdminDashboardStatsData {
  platformCounts: {
    organizations: number;
    properties: number;
    propertyManagers: number;
    organizationManagers: number;
    residents: number;
  };
  growthTrends?: {
    organizations?: GrowthDataPoint[];
    residents?: GrowthDataPoint[];
  };
  campaignOverview?: {
    totalCampaigns: number;
    totalAccepted: number;
    typeBreakdown: { type: string; count: number }[];
    activeCampaigns?: number;
    // csvInvitationsSent?: number; // Removed
    // csvAcceptanceRate?: number; // Removed
  };
}

// Define Phoenix stats types locally
interface PhoenixTypeDistributionPoint {
  name: string;
  y: number;
}

interface AdminPhoenixStats {
  typeDistribution?: PhoenixTypeDistributionPoint[];
  averageCompletionTime?: number | null; // in milliseconds
  total_submissions?: string;
  dispatched_count?: string;
}

interface AdminPhoenixStatsResponse {
  success: boolean;
  data?: AdminPhoenixStats;
  message?: string;
}

const AdminOverviewView: React.FC = () => {
  const [dashboardStats, setDashboardStats] =
    useState<AdminDashboardStatsData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [phoenixStats, setPhoenixStats] = useState<AdminPhoenixStats | null>(
    null
  );
  const [phoenixLoading, setPhoenixLoading] = useState<boolean>(true);
  const [phoenixError, setPhoenixError] = useState<string | null>(null);

  const functionsInstance = getFunctions();

  const adminNavItems = navigationItems.filter(
    (item) =>
      item.roles.includes('admin') && item.path !== '/dashboard/admin/overview' // Exclude self
  );

  useEffect(() => {
    const fetchAdminStats = async () => {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const getStatsFunction = httpsCallable(
          functionsInstance,
          'getAdminDashboardStats'
        );
        const result = await getStatsFunction({});
        setDashboardStats(result.data as AdminDashboardStatsData);
      } catch (err: unknown) {
        console.error('Error fetching admin dashboard stats:', err);
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

    const fetchPhoenixAdminStats = async () => {
      setPhoenixLoading(true);
      setPhoenixError(null);
      try {
        const getStatsFunction = httpsCallable(
          functionsInstance,
          'getAdminPhoenixStats'
        );
        const result = await getStatsFunction({
          /* dateRange: ... */
        });
        const responseData = result.data as AdminPhoenixStatsResponse;

        if (responseData?.success && responseData.data) {
          setPhoenixStats(responseData.data);
        } else {
          throw new Error(
            responseData?.message || 'Failed to fetch Phoenix stats'
          );
        }
      } catch (err: unknown) {
        console.error('Error fetching admin Phoenix stats:', err);
        let errorMessage = 'Failed to load Phoenix dashboard statistics.';
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

    fetchAdminStats();
    fetchPhoenixAdminStats();
  }, [functionsInstance]);

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

  const campaignTypeOptions: Highcharts.Options | null = useMemo(() => {
    if (
      !dashboardStats?.campaignOverview?.typeBreakdown ||
      dashboardStats.campaignOverview.typeBreakdown.length === 0
    )
      return null;
    return {
      chart: { type: 'pie' },
      title: { text: 'Campaign Types Distribution' },
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
            format: '<b>{point.name}</b>: {point.percentage:.1f} %',
          },
        },
      },
      series: [
        {
          name: 'Campaigns',
          colorByPoint: true,
          data: dashboardStats.campaignOverview.typeBreakdown.map((item) => ({
            name: item.type.replace('_', ' ').toUpperCase(),
            y: item.count,
          })),
          type: 'pie' as const,
        },
      ],
      accessibility: { enabled: true },
    };
  }, [dashboardStats?.campaignOverview?.typeBreakdown]);

  return (
    <Box sx={{ p: { xs: 1, sm: 2, lg: 3 }, position: 'relative' }}>
      {/* Quick Navigation Links */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {adminNavItems.map((item: NavItemConfig) => (
          <Box
            key={item.text}
            sx={{
              flexGrow: 1,
              flexBasis: {
                xs: '100%',
                sm: 'calc(50% - 8px)',
                md: 'calc(33.333% - 10.66px)',
              }, // Adjusted for 3 items per row on md
              minWidth: { xs: '100%', sm: 200 },
            }}
          >
            <Card
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <CardActionArea
                component={RouterLink}
                to={item.path}
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

      <Divider sx={{ my: 6 }} />

      {/* Stats Section */}
      {dashboardError && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {dashboardError}
        </Alert>
      )}
      <Box
        sx={{ mb: 4, opacity: dashboardLoading || phoenixLoading ? 0.3 : 1 }}
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {[
            {
              title: 'Total Organizations',
              value: dashboardStats?.platformCounts?.organizations,
              icon: <Business />,
              isLoading: dashboardLoading,
            },
            {
              title: 'Total Properties',
              value: dashboardStats?.platformCounts?.properties,
              icon: <HomeWork />,
              isLoading: dashboardLoading,
            },
            {
              title: 'Org. Managers',
              value: dashboardStats?.platformCounts?.organizationManagers,
              icon: <Group />,
              isLoading: dashboardLoading,
            },
            {
              title: 'Property Managers',
              value: dashboardStats?.platformCounts?.propertyManagers,
              icon: <AssignmentInd />,
              isLoading: dashboardLoading,
            },
            {
              title: 'Total Residents',
              value: dashboardStats?.platformCounts?.residents,
              icon: <PeopleIcon />,
              isLoading: dashboardLoading,
            },
          ].map((kpi) => (
            <Box
              key={kpi.title}
              sx={{
                flexGrow: 1,
                flexBasis: {
                  xs: '100%',
                  sm: 'calc(50% - 8px)',
                  md: 'calc(33.333% - 10.66px)',
                  lg: 'calc(20% - 12.8px)',
                }, // Adjusted for 5 items with gap 2 (16px)
                minWidth: { xs: '100%', sm: 180 },
              }}
            >
              <KpiCard
                title={kpi.title}
                value={kpi.isLoading ? '...' : kpi.value ?? 'N/A'}
                isLoading={kpi.isLoading}
                icon={kpi.icon}
              />
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{ mb: 4, opacity: dashboardLoading || phoenixLoading ? 0.3 : 1 }}
      >
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Campaign Performance
        </Typography>
        <Stack
          direction={{ xs: 'column', md: 'row' }} // Changed lg to md for earlier row layout
          spacing={3}
          alignItems={{ xs: 'center', md: 'flex-start' }} // Align items to start for row layout
        >
          {/* KPIs Column */}
          <Box
            sx={{
              width: { xs: '100%', md: '40%' }, // KPIs take 40% on medium screens and up
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {dashboardStats?.campaignOverview || dashboardLoading ? (
              <>
                <Box sx={{ textAlign: 'center' }}>
                  {' '}
                  {/* Group KpiCard and its subtext */}
                  <KpiCard
                    title='Total Accepted Invitations'
                    value={
                      dashboardLoading
                        ? '...'
                        : dashboardStats?.campaignOverview?.totalAccepted ??
                          'N/A'
                    }
                    isLoading={dashboardLoading}
                    icon={<CheckCircleOutlineIcon />}
                    // sx={{ mb: 0.5 }} // Optional: if spacing adjustment needed before subtext
                  />
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 0.5 }} // Adjusted margin for closer proximity to the card
                  >
                    Across{' '}
                    {dashboardLoading
                      ? '...'
                      : dashboardStats?.campaignOverview?.totalCampaigns ??
                        0}{' '}
                    campaigns
                  </Typography>
                </Box>
                <KpiCard
                  title='Active Campaigns'
                  value={
                    dashboardLoading
                      ? '...'
                      : dashboardStats?.campaignOverview?.activeCampaigns ??
                        'N/A'
                  }
                  isLoading={dashboardLoading}
                  icon={<NotificationsActiveIcon />}
                />
                {/* 
                <KpiCard
                  title='Invitations Sent via CSV Import'
                  value={
                    dashboardLoading
                      ? '...'
                      : dashboardStats?.campaignOverview?.csvInvitationsSent ??
                        'N/A'
                  }
                  isLoading={dashboardLoading}
                  icon={<UploadFileIcon />}
                />
                <KpiCard
                  title='Acceptance Rate of CSV Campaigns'
                  value={
                    dashboardLoading
                      ? '...'
                      : dashboardStats?.campaignOverview?.csvAcceptanceRate != null
                      ? `${dashboardStats.campaignOverview.csvAcceptanceRate.toFixed(1)}%`
                      : 'N/A'
                  }
                  isLoading={dashboardLoading}
                  icon={<PercentIcon />}
                />
                */}
              </>
            ) : (
              !dashboardLoading && <Typography>No campaign data.</Typography>
            )}
          </Box>

          {/* Pie Chart Column */}
          <Box
            sx={{
              width: { xs: '100%', md: '60%' }, // Pie chart takes 60% on medium screens and up
              p: 1,
            }}
          >
            {(dashboardStats?.campaignOverview?.typeBreakdown &&
              dashboardStats.campaignOverview.typeBreakdown.length > 0) ||
            dashboardLoading ? (
              <Box sx={{ p: 1 }}>
                {campaignTypeOptions && (
                  <PieChart
                    options={campaignTypeOptions}
                    isLoading={dashboardLoading}
                    height='350px' // Consider adjusting height if needed
                  />
                )}
              </Box>
            ) : (
              !dashboardLoading && (
                <Typography sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                  No campaign type data.
                </Typography>
              )
            )}
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ mt: 10, mb: 4 }} />

      <Box
        sx={{ mb: 3, opacity: dashboardLoading || phoenixLoading ? 0.3 : 1 }}
      >
        <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
          Service Request Analytics
        </Typography>
        {phoenixError && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {phoenixError}
          </Alert>
        )}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 2 }}
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
            icon={<AvTimer />}
            sx={{ flex: 1 }}
          />
          <KpiCard
            title='Services Requested'
            value={
              phoenixLoading ? '...' : phoenixStats?.total_submissions ?? 'N/A'
            }
            isLoading={phoenixLoading}
            icon={<CrisisAlert />}
            sx={{ flex: 1 }}
          />
          <KpiCard
            title='Technicians Dispatched'
            value={
              phoenixLoading ? '...' : phoenixStats?.dispatched_count ?? 'N/A'
            }
            isLoading={phoenixLoading}
            icon={<LocalShipping />}
            sx={{ flex: 1 }}
          />
        </Stack>
        {(phoenixStats?.typeDistribution &&
          phoenixStats.typeDistribution.length > 0) ||
        phoenixLoading ? (
          <Box sx={{ p: 1 }}>
            {phoenixTypeDistributionOptions && (
              <PieChart
                options={phoenixTypeDistributionOptions}
                isLoading={phoenixLoading}
                height='350px'
              />
            )}
          </Box>
        ) : (
          !phoenixLoading && (
            <Typography>No service type data from Phoenix.</Typography>
          )
        )}
      </Box>
    </Box>
  );
};

export default AdminOverviewView;
