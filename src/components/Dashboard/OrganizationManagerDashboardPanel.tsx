import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  type SelectChangeEvent,
  Container,
  Stack,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AssignmentInd from '@mui/icons-material/AssignmentInd';
import HomeWork from '@mui/icons-material/HomeWork';
import CampaignIcon from '@mui/icons-material/Campaign';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // Added for Phoenix KPI
import CrisisAlert from '@mui/icons-material/CrisisAlert'; // Added
import LocalShipping from '@mui/icons-material/LocalShipping'; // Added

import OrgManagerCampaignsView from '../OrganizationManager/Campaigns/OrgManagerCampaignsView';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';

import { useAuth } from '../../hooks/useAuth';
import OrgScopedPropertyManagerManagement from '../OrganizationManager/OrgScopedPropertyManagerManagement';
import AddOrganizationModal from '../Admin/AddOrganizationModal';
import OrganizationPropertiesList from '../Admin/OrganizationPropertiesList';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import EditPropertyModal from '../PropertyManager/EditPropertyModal';
import PropertyResidentsTable from '../PropertyManager/PropertyResidentsTable';
import InviteResidentForm from '../PropertyManager/InviteResidentForm';
import EditResidentModal from '../PropertyManager/EditResidentModal';
import ChatView from '../Chat/ChatView';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Chart Components
import KpiCard from './Charts/KpiCard';
import BarChart from './Charts/BarChart';
import PieChart from './Charts/PieChart'; // Added for Phoenix Type Distribution

// Firebase functions
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isAppError } from '../../utils/errorUtils';
import type {
  Organization,
  AppError,
  Property as PropertyType,
  Resident as ResidentType,
} from '../../types';

interface PhoenixTypeDistributionPoint {
  name: string;
  y: number;
}

interface OrgManagerPhoenixStats {
  typeDistribution?: PhoenixTypeDistributionPoint[];
  averageCompletionTime?: number | null; // in milliseconds
  total_submissions?: string;
  dispatched_count?: string;
}

// Define OrgManagerPhoenixStatsResponse type
interface OrgManagerPhoenixStatsResponse {
  success: boolean;
  data?: OrgManagerPhoenixStats;
  message?: string;
}

// Define OrgManagerDashboardStatsData type locally
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
      id={`om-tabpanel-${index}`}
      aria-labelledby={`om-tab-${index}`}
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
    id: `om-tab-${index}`,
    'aria-controls': `om-tabpanel-${index}`,
  };
}

interface OrganizationManagerDashboardPanelProps {
  orgIds: string[] | null | undefined;
}

const OrganizationManagerDashboardPanel: React.FC<
  OrganizationManagerDashboardPanelProps
> = ({ orgIds }) => {
  const { currentUser } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const [isAddOrgModalOpen, setIsAddOrgModalOpen] = useState(false);
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
  const [refreshPropertiesListKey, setRefreshPropertiesListKey] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>(
    'success'
  );

  // State for existing dashboard data
  const [dashboardStats, setDashboardStats] =
    useState<OrgManagerDashboardStatsData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // State for Phoenix stats
  const [phoenixStats, setPhoenixStats] =
    useState<OrgManagerPhoenixStats | null>(null);
  const [phoenixLoading, setPhoenixLoading] = useState<boolean>(false);
  const [phoenixError, setPhoenixError] = useState<string | null>(null);

  const functionsInstance = getFunctions();

  const fetchOrganizations = useCallback(async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const orgs: Organization[] = [];
      const fetchedOrgIds = new Set<string>();
      const createdByQuery = query(
        collection(db, 'organizations'),
        where('createdBy', '==', currentUser.uid)
      );
      const createdBySnapshot = await getDocs(createdByQuery);
      createdBySnapshot.forEach((doc) => {
        const orgData = { id: doc.id, ...doc.data() } as Organization;
        if (!fetchedOrgIds.has(orgData.id)) {
          orgs.push(orgData);
          fetchedOrgIds.add(orgData.id);
        }
      });
      if (orgIds && orgIds.length > 0) {
        const chunkSize = 10; // Firestore 'in' query limit
        for (let i = 0; i < orgIds.length; i += chunkSize) {
          const chunk = orgIds.slice(i, i + chunkSize);
          const assignedQuery = query(
            collection(db, 'organizations'),
            where('__name__', 'in', chunk)
          );
          const assignedSnapshot = await getDocs(assignedQuery);
          assignedSnapshot.forEach((doc) => {
            const orgData = { id: doc.id, ...doc.data() } as Organization;
            if (!fetchedOrgIds.has(orgData.id)) {
              orgs.push(orgData);
              fetchedOrgIds.add(orgData.id);
            }
          });
        }
      }
      setOrganizations(orgs);
      if (orgs.length > 0 && !selectedOrgId) {
        setSelectedOrgId(orgs[0].id);
      } else if (orgs.length === 0) {
        setSelectedOrgId('');
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError({ message: 'Failed to load organizations.' });
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid, orgIds, selectedOrgId]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Fetch dashboard stats for selected organization
  useEffect(() => {
    const fetchOrgManagerStats = async () => {
      if (!selectedOrgId || tabValue !== 0) {
        setDashboardStats(null);
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
        console.error(
          `Error fetching dashboard stats for org ${selectedOrgId}:`,
          err
        );
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
      if (!selectedOrgId || tabValue !== 0) {
        setPhoenixStats(null);
        return;
      }
      setPhoenixLoading(true);
      setPhoenixError(null);
      try {
        const getStatsFunction = httpsCallable(
          functionsInstance,
          'getOrgManagerPhoenixStats'
        );
        // TODO: Pass appropriate dateRange if needed by the function/UI
        const result = await getStatsFunction({
          organizationId: selectedOrgId,
          /* dateRange: ... */
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
        console.error(
          `Error fetching Phoenix stats for org ${selectedOrgId}:`,
          err
        );
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

    if (tabValue === 0 && selectedOrgId) {
      fetchOrgManagerStats();
      fetchPhoenixOrgManagerStats();
    }
  }, [selectedOrgId, tabValue, functionsInstance]);

  const handleOrgChange = (event: SelectChangeEvent<string>) =>
    setSelectedOrgId(event.target.value as string);
  const handleOpenAddOrgModal = () => setIsAddOrgModalOpen(true);
  const handleCloseAddOrgModal = () => setIsAddOrgModalOpen(false);
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) =>
    setTabValue(newValue);
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
  const handleOpenEditPropertyModal = (property: PropertyType) => {
    setPropertyToEdit(property);
    setIsEditPropertyModalOpen(true);
  };
  const handleCloseEditPropertyModal = () => {
    setPropertyToEdit(null);
    setIsEditPropertyModalOpen(false);
  };
  const handlePropertyUpdated = () => {
    setSnackbarMessage('Property updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsEditPropertyModalOpen(false);
    setPropertyToEdit(null);
    setRefreshPropertiesListKey((prev) => prev + 1);
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
  const handleAddOrgSuccess = () => {
    handleCloseAddOrgModal();
    setSnackbarMessage('Organization created successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    fetchOrganizations();
  };
  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // Chart options for existing stats
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
      series: [{ name: 'Accepted', data: acceptedData, type: 'bar' }],
      accessibility: { enabled: true },
    };
  }, [dashboardStats?.campaignPerformance]);

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

  if (loading && organizations.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  if (error && organizations.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity='error'>{error.message}</Alert>
      </Paper>
    );
  }

  const selectedOrganization = organizations.find(
    (org) => org.id === selectedOrgId
  );

  return (
    <Container component='main' maxWidth='xl'>
      <Paper sx={{ p: { xs: 1, sm: 2 }, mb: 4 }} elevation={3}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            mb: organizations.length > 0 ? 0 : 2,
          }}
        >
          <Stack
            direction='row'
            alignItems='center'
            spacing={1}
            sx={{ mb: { xs: 1, sm: 0 } }}
          >
            <BusinessIcon fontSize='large' color='primary' />
            <Typography variant='h4' color='primary'>
              Organization Dashboard
            </Typography>
          </Stack>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={handleOpenAddOrgModal}
            sx={{ width: { xs: '100%', sm: 'auto' }, mt: { xs: 1, sm: 0 } }}
          >
            Add Organization
          </Button>
        </Box>

        {organizations.length > 0 && (
          <FormControl fullWidth margin='normal' sx={{ mt: 2 }}>
            <InputLabel id='om-org-selector-label'>
              Select Organization
            </InputLabel>
            <Select
              labelId='om-org-selector-label'
              id='om-org-selector'
              value={selectedOrgId}
              label='Select Organization'
              onChange={handleOrgChange}
            >
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {selectedOrganization && (
          <Alert severity='info' sx={{ mt: 1, mb: 2 }}>
            Managing Organization: <strong>{selectedOrganization.name}</strong>
          </Alert>
        )}

        {selectedOrgId && selectedOrganization && (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label='organization manager actions tabs'
                variant='scrollable'
                scrollButtons='auto'
                allowScrollButtonsMobile
              >
                <Tab
                  label='Dashboard'
                  icon={<DashboardIcon />}
                  {...a11yProps(0)}
                />
                <Tab
                  label='Property Managers'
                  icon={<AssignmentInd />}
                  {...a11yProps(1)}
                />
                <Tab
                  label='Properties & Residents'
                  icon={<HomeWork />}
                  {...a11yProps(2)}
                />
                <Tab
                  label='Campaigns'
                  icon={<CampaignIcon />}
                  {...a11yProps(3)}
                />
                <Tab
                  label='AI Assistant'
                  icon={<ChatBubbleOutlineIcon />}
                  {...a11yProps(4)}
                />
            </Tabs>
            </Box>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ flexGrow: 1, position: 'relative', minHeight: '300px' /* Adjust as needed */ }}>
                {(dashboardLoading || phoenixLoading) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: (theme) =>
                        theme.palette.mode === 'light'
                          ? 'rgba(255, 255, 255, 0.7)'
                          : 'rgba(0, 0, 0, 0.7)',
                      zIndex: 2,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                )}
                {dashboardError && (
                  <Alert severity='error' sx={{ mb: 2 }}>
                    {dashboardError}
                  </Alert>
                )}
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    mb: 3,
                    mt: 1,
                  }}
                >
                  <Box
                    sx={{
                      flexGrow: 1,
                      flexBasis: {
                        xs: '100%',
                        sm: 'calc(50% - 8px)',
                        md: 'calc(33.333% - 11px)',
                      },
                    }}
                  >
                    <KpiCard
                      title='Total Properties'
                      value={
                        dashboardLoading
                          ? '...'
                          : dashboardStats?.organizationCounts?.properties ??
                            'N/A'
                      }
                      isLoading={dashboardLoading}
                      icon={<HomeWork />}
                    />
                  </Box>
                  <Box
                    sx={{
                      flexGrow: 1,
                      flexBasis: {
                        xs: '100%',
                        sm: 'calc(50% - 8px)',
                        md: 'calc(33.333% - 11px)',
                      },
                    }}
                  >
                    <KpiCard
                      title='Total Residents'
                      value={
                        dashboardLoading
                          ? '...'
                          : dashboardStats?.organizationCounts?.residents ??
                            'N/A'
                      }
                      isLoading={dashboardLoading}
                      icon={<PeopleIcon />}
                    />
                  </Box>
                  <Box
                    sx={{
                      flexGrow: 1,
                      flexBasis: {
                        xs: '100%',
                        sm: 'calc(50% - 8px)',
                        md: 'calc(33.333% - 11px)',
                      },
                    }}
                  >
                    <KpiCard
                      title='Property Managers'
                      value={
                        dashboardLoading
                          ? '...'
                          : dashboardStats?.organizationCounts
                              ?.propertyManagers ?? 'N/A'
                      }
                      isLoading={dashboardLoading}
                      icon={<AssignmentInd />}
                    />
                  </Box>
                </Box>
                <Stack spacing={3}>
                  {(dashboardStats?.campaignPerformance?.conversionRates &&
                    dashboardStats.campaignPerformance.conversionRates.length >
                      0) ||
                  dashboardLoading ? (
                    <>
                      {campaignPerformanceOptions && (
                        <BarChart
                          options={campaignPerformanceOptions}
                          isLoading={dashboardLoading}
                          height='350px'
                          // title='Campaign Acceptance'
                        />
                      )}
                    </>
                  ) : (
                    !dashboardLoading && (
                      <Typography>
                        No campaign data to display for this organization.
                      </Typography>
                    )
                  )}

                  {dashboardStats?.campaignPerformance || dashboardLoading ? (
                    <Paper
                      elevation={0}
                      sx={{ p: 2, borderRadius: 2, textAlign: 'center', my: 4 }}
                    >
                      <KpiCard
                        title='Active Campaigns'
                        value={
                          dashboardLoading
                            ? '...'
                            : dashboardStats?.campaignPerformance
                                ?.activeCampaigns ?? 'N/A'
                        }
                        isLoading={dashboardLoading}
                        sx={{
                          width: 'auto',
                          boxShadow: 'none',
                          p: 0,
                          display: 'inline-flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      />
                    </Paper>
                  ) : null}
                </Stack>

                {/* Phoenix Stats Section */}

                {phoenixError && (
                  <Alert severity='error' sx={{ mb: 2 }}>
                    {phoenixError}
                  </Alert>
                )}

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      flexGrow: 1,
                      flexBasis: {
                        xs: '100%',
                        sm: 'calc(50% - 8px)',
                        md: 'calc(33.333% - 11px)',
                      },
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
                      icon={<TrendingUpIcon />}
                    />
                  </Box>
                  <Box
                    sx={{
                      flexGrow: 1,
                      flexBasis: {
                        xs: '100%',
                        sm: 'calc(50% - 8px)',
                        md: 'calc(33.333% - 11px)',
                      },
                    }}
                  >
                    <KpiCard
                      title='Services Requested'
                      value={
                        phoenixLoading
                          ? '...'
                          : phoenixStats?.total_submissions ?? 'N/A'
                      }
                      isLoading={phoenixLoading}
                      icon={<CrisisAlert />}
                    />
                  </Box>
                  <Box
                    sx={{
                      flexGrow: 1,
                      flexBasis: {
                        xs: '100%',
                        sm: 'calc(50% - 8px)',
                        md: 'calc(33.333% - 11px)',
                      },
                    }}
                  >
                    <KpiCard
                      title='Technicians Dispatched'
                      value={
                        phoenixLoading
                          ? '...'
                          : phoenixStats?.dispatched_count ?? 'N/A'
                      }
                      isLoading={phoenixLoading}
                      icon={<LocalShipping />}
                    />
                  </Box>
                </Box>

                <Stack spacing={3}>
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
                </Stack>

                {!(dashboardStats || dashboardLoading) &&
                  !dashboardError &&
                  !(phoenixStats || phoenixLoading) &&
                  !phoenixError && (
                    <Typography>No dashboard data to display.</Typography>
                  )}
              </Box>
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <OrgScopedPropertyManagerManagement
                organizationId={selectedOrgId}
                organizationCreatedBy={selectedOrganization?.createdBy || null}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={2}>
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={handleOpenCreatePropertyModal}
                sx={{ mb: 2 }}
                disabled={!selectedOrgId}
              >
                Create Property
              </Button>
              <OrganizationPropertiesList
                key={refreshPropertiesListKey}
                organizationId={selectedOrgId}
                onEditProperty={handleOpenEditPropertyModal}
                onManageResidents={handleManageResidents}
                onPropertiesUpdate={handlePropertiesUpdate}
              />
            </TabPanel>
            <TabPanel value={tabValue} index={3}>
              <OrgManagerCampaignsView />
            </TabPanel>
            <TabPanel value={tabValue} index={4}>
              <Box sx={{ minHeight: '400px' }}>
                <ChatView />
              </Box>
            </TabPanel>
          </>
        )}
        {!selectedOrgId && organizations.length > 0 && (
          <Typography sx={{ p: 2 }}>
            Please select an organization to manage.
          </Typography>
        )}
        {organizations.length === 0 && !loading && (
          <Typography sx={{ p: 2 }}>
            You are not currently managing any organizations. You can create one
            using the "Add Organization" button.
          </Typography>
        )}
      </Paper>

      <AddOrganizationModal
        open={isAddOrgModalOpen}
        onClose={handleCloseAddOrgModal}
        onOrganizationCreated={handleAddOrgSuccess}
      />
      {selectedOrgId && (
        <AddOrganizationModal
          open={isCreatePropertyModalOpen}
          onClose={handleCloseCreatePropertyModal}
          title='Create New Property'
        >
          <CreatePropertyForm
            organizationId={selectedOrgId}
            onSuccess={handlePropertyCreated}
            onCancel={handleCloseCreatePropertyModal}
          />
        </AddOrganizationModal>
      )}
      {propertyToEdit && selectedOrgId && (
        <EditPropertyModal
          propertyData={propertyToEdit}
          organizationId={selectedOrgId}
          open={isEditPropertyModalOpen}
          onClose={handleCloseEditPropertyModal}
          onSuccess={handlePropertyUpdated}
        />
      )}
      {propertyForResidents && selectedOrgId && (
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
              organizationId={selectedOrgId}
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
              organizationId={selectedOrgId}
              propertyId={propertyForResidents.id}
              onEditResident={handleOpenEditResidentModal}
              refreshKey={refreshResidentsListKey}
            />
          </Box>
        </AddOrganizationModal>
      )}
      {residentToEdit && selectedOrgId && propertyForResidents && (
        <EditResidentModal
          open={isEditResidentModalOpen}
          onClose={handleCloseEditResidentModal}
          residentData={residentToEdit}
          organizationId={selectedOrgId}
          propertyId={propertyForResidents.id}
          onSuccess={handleResidentUpdated}
        />
      )}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default OrganizationManagerDashboardPanel;
