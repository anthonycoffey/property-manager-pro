import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Tabs,
  Tab,
  Button,
  Stack,
  Snackbar,
  Alert,
  Container,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import {
  AdminPanelSettings,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  Business,
  Group,
  AssignmentInd,
  HomeWork,
  Campaign,
  CrisisAlert,
  LocalShipping,
  AvTimer,
} from '@mui/icons-material';

import OrganizationSelector from '../Admin/OrganizationSelector';
import PropertyManagerManagement from '../Admin/PropertyManagerManagement';
import OrganizationManagementPanel from '../Admin/OrganizationManagementPanel';
import AddOrganizationModal from '../Admin/AddOrganizationModal';
import InviteOrganizationManagerForm from '../Admin/InviteOrganizationManagerForm';
import OrganizationManagerAssignments from '../Admin/OrganizationManagerAssignments';
import OrganizationPropertiesList from '../Admin/OrganizationPropertiesList';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import EditPropertyModal from '../PropertyManager/EditPropertyModal';
import PropertyResidentsTable from '../PropertyManager/PropertyResidentsTable';
import InviteResidentForm from '../PropertyManager/InviteResidentForm';
import EditResidentModal from '../PropertyManager/EditResidentModal';
import AdminCampaignsView from '../Admin/Campaigns/AdminCampaignsView';
import ChatView from '../Chat/ChatView';

// Import Chart Components
import KpiCard from './Charts/KpiCard';
import LineChart from './Charts/LineChart';
import PieChart from './Charts/PieChart';

// Firebase functions
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isAppError } from '../../utils/errorUtils';
import type {
  Property as PropertyType,
  Resident as ResidentType,
} from '../../types';

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
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>{children}</Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const AdminDashboardPanel: React.FC = () => {
  const [adminTabValue, setAdminTabValue] = useState(0);
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState<string | null>(
    null
  );
  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);

  const [dashboardStats, setDashboardStats] =
    useState<AdminDashboardStatsData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // State for Phoenix stats
  const [phoenixStats, setPhoenixStats] = useState<AdminPhoenixStats | null>(
    null
  );
  const [phoenixLoading, setPhoenixLoading] = useState<boolean>(true);
  const [phoenixError, setPhoenixError] = useState<string | null>(null);

  const functionsInstance = getFunctions();
  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] =
    useState(false);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyType | null>(
    null
  );
  const [isManageResidentsModalOpen, setIsManageResidentsModalOpen] =
    useState(false);
  const [propertyForResidents, setPropertyForResidents] =
    useState<PropertyType | null>(null);
  const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<ResidentType | null>(
    null
  );
  const [refreshResidentsListKey, setRefreshResidentsListKey] = useState(0);
  const [refreshOrgListKey, setRefreshOrgListKey] = useState(0);
  const [refreshPropertiesListKey, setRefreshPropertiesListKey] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('success');

  const handleAdminOrgChange = (orgId: string | null) =>
    setSelectedAdminOrgId(orgId);
  const handleOpenAddOrgModal = () => setIsAddOrgModalOpen(true);
  const handleCloseAddOrgModal = () => setIsAddOrgModalOpen(false);
  const handleOpenCreatePropertyModal = () =>
    setIsCreatePropertyModalOpen(true);
  const handleCloseCreatePropertyModal = () =>
    setIsCreatePropertyModalOpen(false);

  const handlePropertyCreated = () => {
    setSnackbarMessage('Property created successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsCreatePropertyModalOpen(false);
    setRefreshPropertiesListKey((prev) => prev + 1);
  };

  const handlePropertyUpdated = () => {
    setSnackbarMessage('Property updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsEditPropertyModalOpen(false);
    setPropertyToEdit(null);
    setRefreshPropertiesListKey((prev) => prev + 1);
  };

  const handleOpenEditPropertyModal = (property: PropertyType) => {
    setPropertyToEdit(property);
    setIsEditPropertyModalOpen(true);
  };

  const handleCloseEditPropertyModal = () => {
    setPropertyToEdit(null);
    setIsEditPropertyModalOpen(false);
  };

  const handleManageResidents = (property: PropertyType) => {
    setPropertyForResidents(property);
    setIsManageResidentsModalOpen(true);
  };

  const handleCloseManageResidentsModal = () => {
    setIsManageResidentsModalOpen(false);
    setPropertyForResidents(null);
  };

  const handleOpenEditResidentModal = (resident: ResidentType) => {
    setResidentToEdit(resident);
    setIsEditResidentModalOpen(true);
  };

  const handleCloseEditResidentModal = () => {
    setResidentToEdit(null);
    setIsEditResidentModalOpen(false);
  };

  const handleResidentInvited = () => {
    setSnackbarMessage('Resident invited successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setRefreshResidentsListKey((prev) => prev + 1);
  };

  const handleResidentUpdated = () => {
    setSnackbarMessage('Resident updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsEditResidentModalOpen(false);
    setResidentToEdit(null);
    setRefreshResidentsListKey((prev) => prev + 1);
  };

  const handlePropertiesUpdate = () =>
    setRefreshPropertiesListKey((prev) => prev + 1);

  const handleOrganizationCreated = (orgId: string) => {
    setSnackbarMessage(`Organization created successfully with ID: ${orgId}`);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsAddOrgModalOpen(false);
    setRefreshOrgListKey((prev) => prev + 1);
  };

  const handleAdminTabChange = (
    _event: React.SyntheticEvent,
    newValue: number
  ) => {
    setAdminTabValue(newValue);
  };

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
        // TODO: Pass appropriate dateRange if needed by the function/UI
        const result = await getStatsFunction({
          /* dateRange: ... */
        });
        if ((result.data as any)?.success) {
          setPhoenixStats((result.data as any).data as AdminPhoenixStats);
        } else {
          throw new Error(
            (result.data as any)?.message || 'Failed to fetch Phoenix stats'
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

    if (adminTabValue === 0) {
      fetchAdminStats();
      fetchPhoenixAdminStats();
    }
  }, [adminTabValue, functionsInstance]);

  // Chart options for Phoenix Stats
  // const phoenixVolumeTrendOptions: Highcharts.Options | null = useMemo(() => { // Removed 6/4/2025
  //   if (!phoenixStats?.volumeTrends || phoenixStats.volumeTrends.length === 0) return null;
  //   return {
  //     title: { text: 'Service Request Volume (Phoenix)' },
  //     xAxis: {
  //       categories: phoenixStats.volumeTrends.map(d => d.date),
  //       type: 'category',
  //     },
  //     yAxis: {
  //       title: { text: 'Number of Dispatched Requests' },
  //       allowDecimals: false,
  //     },
  //     series: [{
  //       name: 'Dispatched Requests',
  //       data: phoenixStats.volumeTrends.map(d => d.count),
  //       type: 'line',
  //     }],
  //     accessibility: { enabled: true },
  //   };
  // }, [phoenixStats?.volumeTrends]);

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
            type: 'pie',
          },
        ],
        accessibility: { enabled: true },
      };
    }, [phoenixStats?.typeDistribution]);

  const orgGrowthOptions: Highcharts.Options | null = useMemo(() => {
    if (
      !dashboardStats?.growthTrends?.organizations ||
      dashboardStats.growthTrends.organizations.length === 0
    )
      return null;
    return {
      title: { text: 'Organization Growth' },
      xAxis: {
        categories: dashboardStats.growthTrends.organizations.map(
          (d) => d.period
        ),
        type: 'category',
      },
      yAxis: {
        title: { text: 'Number of Organizations' },
        allowDecimals: false,
      },
      series: [
        {
          name: 'Organizations',
          data: dashboardStats.growthTrends.organizations.map((d) => d.count),
          type: 'line',
        },
      ],
      accessibility: { enabled: true },
    };
  }, [dashboardStats?.growthTrends?.organizations]);

  const residentGrowthOptions: Highcharts.Options | null = useMemo(() => {
    if (
      !dashboardStats?.growthTrends?.residents ||
      dashboardStats.growthTrends.residents.length === 0
    )
      return null;
    return {
      title: { text: 'Resident Growth' },
      xAxis: {
        categories: dashboardStats.growthTrends.residents.map((d) => d.period),
        type: 'category',
      },
      yAxis: { title: { text: 'Number of Residents' }, allowDecimals: false },
      series: [
        {
          name: 'Residents',
          data: dashboardStats.growthTrends.residents.map((d) => d.count),
          type: 'line',
        },
      ],
      accessibility: { enabled: true },
    };
  }, [dashboardStats?.growthTrends?.residents]);

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
          type: 'pie',
        },
      ],
      accessibility: { enabled: true },
    };
  }, [dashboardStats?.campaignOverview?.typeBreakdown]);

  return (
    <Container component='main' maxWidth='xl'>
      <Paper elevation={3} sx={{ mb: 4, p: { xs: 1, sm: 2 } }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: 2,
          }}
        >
          <Stack direction='row' alignItems='center' spacing={1}>
            <AdminPanelSettings fontSize='large' color='primary' />
            <Typography variant='h4' color='primary'>
              Admin Dashboard
            </Typography>
          </Stack>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={handleOpenAddOrgModal}
            sx={{ width: { xs: '100%', sm: 'auto' }, mt: { xs: 2, sm: 0 } }}
          >
            Add Organization
          </Button>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={adminTabValue}
            onChange={handleAdminTabChange}
            aria-label='admin actions tabs'
            variant='scrollable'
            scrollButtons='auto'
            allowScrollButtonsMobile
          >
            <Tab label='Dashboard' icon={<DashboardIcon />} {...a11yProps(0)} />
            <Tab label='Organizations' icon={<Business />} {...a11yProps(1)} />
            <Tab
              label='Organization Managers'
              icon={<Group />}
              {...a11yProps(2)}
            />
            <Tab
              label='Property Managers'
              icon={<AssignmentInd />}
              {...a11yProps(3)}
            />
            <Tab
              label='Properties & Residents'
              icon={<HomeWork />}
              {...a11yProps(4)}
            />
            <Tab label='Campaigns' icon={<Campaign />} {...a11yProps(5)} />
            <Tab
              label='AI Assistant'
              icon={<ChatBubbleOutlineIcon />}
              {...a11yProps(6)}
            />
          </Tabs>
        </Box>

        <TabPanel value={adminTabValue} index={0}>
          <Box sx={{ flexGrow: 1 }}>
            {dashboardError && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {dashboardError}
              </Alert>
            )}

            <Box
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, mt: 2 }}
            >
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
                  title: 'Org Managers',
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
                      md: 'calc(33.333% - 11px)',
                      lg: 'calc(20% - 13px)',
                    },
                    minWidth: { xs: 'calc(50% - 8px)', sm: 180 },
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

            <Stack spacing={3}>
              {(dashboardStats?.growthTrends?.organizations &&
                dashboardStats.growthTrends.organizations.length > 0) ||
              dashboardLoading ? (
                <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  {orgGrowthOptions && (
                    <LineChart
                      options={orgGrowthOptions}
                      isLoading={dashboardLoading}
                      height='350px'
                    />
                  )}
                </Paper>
              ) : null}

              {(dashboardStats?.growthTrends?.residents &&
                dashboardStats.growthTrends.residents.length > 0) ||
              dashboardLoading ? (
                <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  {residentGrowthOptions && (
                    <LineChart
                      options={residentGrowthOptions}
                      isLoading={dashboardLoading}
                      height='350px'
                    />
                  )}
                </Paper>
              ) : null}

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', lg: 'row' },
                  gap: 3,
                }}
              >
                {(dashboardStats?.campaignOverview?.typeBreakdown &&
                  dashboardStats.campaignOverview.typeBreakdown.length > 0) ||
                dashboardLoading ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      flexGrow: 1,
                      width: { xs: '100%', lg: 'calc(60% - 12px)' },
                      mb: 8,
                    }}
                  >
                    {campaignTypeOptions && (
                      <PieChart
                        options={campaignTypeOptions}
                        isLoading={dashboardLoading}
                        height='350px'
                      />
                    )}
                  </Paper>
                ) : null}

                {dashboardStats?.campaignOverview || dashboardLoading ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      width: { xs: '100%', lg: 'calc(40% - 12px)' },
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <Typography variant='h6' gutterBottom align='center'>
                      Campaign Engagement
                    </Typography>
                    <KpiCard
                      title='Total Accepted Invitations'
                      value={
                        dashboardLoading
                          ? '...'
                          : dashboardStats?.campaignOverview?.totalAccepted ??
                            'N/A'
                      }
                      isLoading={dashboardLoading}
                      sx={{
                        width: 'auto',
                        boxShadow: 'none',
                        p: 0,
                        height: 'auto',
                        textAlign: 'center',
                      }}
                    />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mt: 1 }}
                    >
                      Across{' '}
                      {dashboardLoading
                        ? '...'
                        : dashboardStats?.campaignOverview?.totalCampaigns ??
                          0}{' '}
                      campaigns
                    </Typography>
                  </Paper>
                ) : null}
              </Box>
            </Stack>

            {/* Phoenix Stats Section */}
            <Typography variant='h5' gutterBottom>
              Service Analytics
            </Typography>

            {phoenixError && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {phoenixError}
              </Alert>
            )}

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 2,
                mb: 3,
              }}
            >
                <KpiCard
                  title='Avg. Service Completion Time'
                  value={
                    phoenixLoading
                      ? '...'
                      : phoenixStats?.averageCompletionTime != null
                      ? `${(
                          phoenixStats.averageCompletionTime /
                          (1000 * 60)
                        ).toFixed(1)} min`
                      : 'N/A'
                  }
                  isLoading={phoenixLoading}
                  icon={<AvTimer />}
                />
                <KpiCard
                  title='Services Requested'
                  value={
                    phoenixLoading
                      ? '...'
                      : phoenixStats?.total_submissions
                      ? phoenixStats.total_submissions
                      : 'N/A'
                  }
                  isLoading={phoenixLoading}
                  icon={<CrisisAlert />}
                />

                <KpiCard
                  title='Technicians Dispatched'
                  value={
                    phoenixLoading
                      ? '...'
                      : phoenixStats?.dispatched_count
                      ? phoenixStats.dispatched_count
                      : 'N/A'
                  }
                  isLoading={phoenixLoading}
                  icon={<LocalShipping />}
                />
            </Box>

            <Stack spacing={3}>
              {/* Phoenix Type Distribution Chart - Reinstated 6/4/2025 */}
              {(phoenixStats?.typeDistribution &&
                phoenixStats.typeDistribution.length > 0) ||
              phoenixLoading ? (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, my: 4 }}>
                  {phoenixTypeDistributionOptions && (
                    <PieChart
                      options={phoenixTypeDistributionOptions}
                      isLoading={phoenixLoading}
                      height='350px'
                    />
                  )}
                </Paper>
              ) : null}

              {/* Phoenix Volume Trends Chart - Removed 6/4/2025 */}
              {/* {(phoenixStats?.volumeTrends && phoenixStats.volumeTrends.length > 0) || phoenixLoading ? (
                <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                  {phoenixVolumeTrendOptions && (
                    <LineChart
                      options={phoenixVolumeTrendOptions}
                      isLoading={phoenixLoading}
                      height="350px"
                    />
                  )}
                </Paper>
              ) : null} */}
            </Stack>

            {/* Combined check for no data */}
            {!(dashboardStats || dashboardLoading) &&
              !dashboardError &&
              !(phoenixStats || phoenixLoading) &&
              !phoenixError && (
                <Typography>No dashboard data to display.</Typography>
              )}
          </Box>
        </TabPanel>
        <TabPanel value={adminTabValue} index={1}>
          <OrganizationManagementPanel key={refreshOrgListKey} />
        </TabPanel>
        <TabPanel value={adminTabValue} index={2}>
          <Typography variant='h6' gutterBottom>
            Invite Organization Managers
          </Typography>
          <InviteOrganizationManagerForm />
          <Divider sx={{ my: 4 }} />
          <OrganizationManagerAssignments />
        </TabPanel>
        <TabPanel value={adminTabValue} index={3}>
          <OrganizationSelector
            selectedOrganizationId={selectedAdminOrgId}
            onOrganizationChange={handleAdminOrgChange}
          />
          <Divider sx={{ my: 4 }} />
          {selectedAdminOrgId ? (
            <PropertyManagerManagement organizationId={selectedAdminOrgId} />
          ) : (
            <Typography>
              Select an organization to view its property managers.
            </Typography>
          )}
        </TabPanel>
        <TabPanel value={adminTabValue} index={4}>
          <OrganizationSelector
            selectedOrganizationId={selectedAdminOrgId}
            onOrganizationChange={handleAdminOrgChange}
          />
          <Divider sx={{ my: 2 }} />
          {selectedAdminOrgId ? (
            <>
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={handleOpenCreatePropertyModal}
                sx={{ mb: 2 }}
              >
                Create Property
              </Button>
              <OrganizationPropertiesList
                key={refreshPropertiesListKey}
                organizationId={selectedAdminOrgId}
                onEditProperty={handleOpenEditPropertyModal}
                onManageResidents={handleManageResidents}
                onPropertiesUpdate={handlePropertiesUpdate}
              />
            </>
          ) : (
            <Typography>
              Select an organization to manage its properties and residents.
            </Typography>
          )}
        </TabPanel>
        <TabPanel value={adminTabValue} index={5}>
          <AdminCampaignsView />
        </TabPanel>
        <TabPanel value={adminTabValue} index={6}>
          <Box sx={{ minHeight: '400px' }}>
            <ChatView />
          </Box>
        </TabPanel>

        <AddOrganizationModal
          open={isAddOrgModalOpen}
          onClose={handleCloseAddOrgModal}
          onOrganizationCreated={handleOrganizationCreated}
        />

        {selectedAdminOrgId && (
          <AddOrganizationModal
            open={isCreatePropertyModalOpen}
            onClose={handleCloseCreatePropertyModal}
            title='Create New Property'
          >
            <CreatePropertyForm
              organizationId={selectedAdminOrgId}
              onSuccess={handlePropertyCreated}
              onCancel={handleCloseCreatePropertyModal}
            />
          </AddOrganizationModal>
        )}

        {propertyToEdit && selectedAdminOrgId && (
          <EditPropertyModal
            propertyData={propertyToEdit}
            organizationId={selectedAdminOrgId}
            open={isEditPropertyModalOpen}
            onClose={handleCloseEditPropertyModal}
            onSuccess={handlePropertyUpdated}
          />
        )}

        {propertyForResidents && selectedAdminOrgId && (
          <AddOrganizationModal
            open={isManageResidentsModalOpen}
            onClose={handleCloseManageResidentsModal}
            title={`Residents for Property: ${propertyForResidents.name}`}
          >
            <Box>
              <Typography variant='h6' gutterBottom>
                Invite New Resident
              </Typography>
              <InviteResidentForm
                organizationId={selectedAdminOrgId}
                propertyId={propertyForResidents.id}
                propertyName={propertyForResidents.name}
                onInvitationSent={handleResidentInvited}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant='h6' gutterBottom>
                Current Residents
              </Typography>
              <PropertyResidentsTable
                key={refreshResidentsListKey}
                organizationId={selectedAdminOrgId}
                propertyId={propertyForResidents.id}
                onEditResident={handleOpenEditResidentModal}
                refreshKey={refreshResidentsListKey}
              />
            </Box>
          </AddOrganizationModal>
        )}

        {residentToEdit && selectedAdminOrgId && propertyForResidents && (
          <EditResidentModal
            open={isEditResidentModalOpen}
            onClose={handleCloseEditResidentModal}
            residentData={residentToEdit}
            organizationId={selectedAdminOrgId}
            propertyId={propertyForResidents.id}
            onSuccess={handleResidentUpdated}
          />
        )}

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default AdminDashboardPanel;
