import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Container,
  Stack,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DomainAddIcon from '@mui/icons-material/DomainAdd';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import HomeWork from '@mui/icons-material/HomeWork';
import Group from '@mui/icons-material/Group';
import Campaign from '@mui/icons-material/Campaign';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CrisisAlert from '@mui/icons-material/CrisisAlert'; // Added
import LocalShipping from '@mui/icons-material/LocalShipping'; // Added

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import type {
  Property as PropertyType,
  Resident as ResidentType,
} from '../../types';

import PropertyManagerPropertiesList from '../PropertyManager/PropertyManagerPropertiesList';
import InviteResidentForm from '../PropertyManager/InviteResidentForm';
import CreatePropertyForm from '../PropertyManager/CreatePropertyForm';
import PropertySelectorDropdown from '../PropertyManager/PropertySelectorDropdown';
import EditPropertyModal from '../PropertyManager/EditPropertyModal';
import EditResidentModal from '../PropertyManager/EditResidentModal';
import PropertyResidentsTable from '../PropertyManager/PropertyResidentsTable';
import PropertyCampaignsView from '../PropertyManager/Campaigns/PropertyCampaignsView';
import ChatView from '../Chat/ChatView';

// Chart Components
import KpiCard from './Charts/KpiCard';
import BarChart from './Charts/BarChart';
import PieChart from './Charts/PieChart';

// Firebase functions
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isAppError } from '../../utils/errorUtils';

interface PhoenixTypeDistributionPoint {
  name: string;
  y: number;
}

interface PropertyManagerPhoenixStats {
  typeDistribution?: PhoenixTypeDistributionPoint[];
  total_submissions?: string;
  dispatched_count?: string;
}

interface PropertyManagerPhoenixStatsResponse {
  success: boolean;
  data?: PropertyManagerPhoenixStats;
  message?: string;
}

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
      id={`pm-tabpanel-${index}`}
      aria-labelledby={`pm-tab-${index}`}
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
    id: `pm-tab-${index}`,
    'aria-controls': `pm-tabpanel-${index}`,
  };
}

interface PropertyManagerDashboardPanelProps {
  organizationId: string | null;
}

const PropertyManagerDashboardPanel: React.FC<
  PropertyManagerDashboardPanelProps
> = ({ organizationId }) => {
  const [pmTabValue, setPmTabValue] = useState(0);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const [selectedPropertyName, setSelectedPropertyName] = useState<
    string | null
  >(null);
  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] =
    useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyType | null>(
    null
  );
  const [refreshPropertiesKey, setRefreshPropertiesKey] = useState(0);
  const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<ResidentType | null>(
    null
  );
  const [refreshResidentsKey, setRefreshResidentsKey] = useState(0);

  // State for existing dashboard data
  const [dashboardStats, setDashboardStats] =
    useState<PropertyManagerDashboardStatsData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // State for Phoenix stats
  const [phoenixStats, setPhoenixStats] =
    useState<PropertyManagerPhoenixStats | null>(null);
  const [phoenixLoading, setPhoenixLoading] = useState<boolean>(false);
  const [phoenixError, setPhoenixError] = useState<string | null>(null);

  const functionsInstance = getFunctions();

  useEffect(() => {
    const fetchOrgName = async () => {
      if (organizationId) {
        try {
          const orgDocRef = doc(db, 'organizations', organizationId);
          const orgDocSnap = await getDoc(orgDocRef);
          setOrganizationName(
            orgDocSnap.exists() ? orgDocSnap.data()?.name || 'N/A' : 'N/A'
          );
        } catch (error) {
          console.error('Error fetching organization name:', error);
          setOrganizationName('Error');
        }
      } else {
        setOrganizationName('Organization');
      }
    };
    fetchOrgName();
  }, [organizationId]);

  // Fetch dashboard stats for selected property
  useEffect(() => {
    const fetchPropertyManagerStats = async () => {
      if (!organizationId || !selectedPropertyId || pmTabValue !== 0) {
        setDashboardStats(null); // Clear if not applicable
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
        console.error(
          `Error fetching dashboard stats for property ${selectedPropertyId}:`,
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

    const fetchPhoenixPropertyManagerStats = async () => {
      if (!organizationId || !selectedPropertyId || pmTabValue !== 0) {
        setPhoenixStats(null); // Clear if not applicable
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
          // dateRange: /* pass if you add date range selection */
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
        console.error(
          `Error fetching Phoenix stats for property ${selectedPropertyId}:`,
          err
        );
        let errorMessage = 'Failed to load Phoenix statistics for property.';
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

    if (pmTabValue === 0 && organizationId && selectedPropertyId) {
      fetchPropertyManagerStats();
      fetchPhoenixPropertyManagerStats();
    } else {
      // Clear stats if conditions are not met
      setDashboardStats(null);
      setPhoenixStats(null);
    }
  }, [organizationId, selectedPropertyId, pmTabValue, functionsInstance]);

  const handlePmTabChange = useCallback(
    (_event: React.SyntheticEvent, newValue: number) => {
      setPmTabValue(newValue);
    },
    []
  );

  const handlePropertySelect = useCallback(
    (propertyId: string | null, propertyName?: string | null) => {
      setSelectedPropertyId(propertyId);
      setSelectedPropertyName(propertyName ?? null);
    },
    []
  );

  const handleOpenCreatePropertyModal = () =>
    setIsCreatePropertyModalOpen(true);
  const handleCloseCreatePropertyModal = () =>
    setIsCreatePropertyModalOpen(false);
  const handlePropertyCreated = () => {
    handleCloseCreatePropertyModal();
    setRefreshPropertiesKey((prev) => prev + 1);
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
    handleCloseEditPropertyModal();
    setRefreshPropertiesKey((prev) => prev + 1);
  };
  const handleOpenEditResidentModal = (resident: ResidentType) => {
    setResidentToEdit(resident);
    setIsEditResidentModalOpen(true);
  };
  const handleCloseEditResidentModal = () => {
    setResidentToEdit(null);
    setIsEditResidentModalOpen(false);
  };
  const handleResidentUpdated = () => {
    handleCloseEditResidentModal();
    setRefreshResidentsKey((prev) => prev + 1);
  };

  // Chart options for existing stats
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
      series: [{ name: 'Accepted', data: acceptedData, type: 'bar' }],
      accessibility: { enabled: true },
    };
  }, [dashboardStats?.campaignPerformance, selectedPropertyName]);

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

  return (
    <Container component='main' maxWidth='lg'>
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
            <DomainAddIcon fontSize='large' color='primary' />
            <Typography variant='h4' color='primary'>
              {organizationName} Dashboard
            </Typography>
          </Stack>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={handleOpenCreatePropertyModal}
            sx={{ width: { xs: '100%', sm: 'auto' }, mt: { xs: 2, sm: 0 } }}
          >
            Add Property
          </Button>
        </Box>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={pmTabValue}
            onChange={handlePmTabChange}
            aria-label='property manager actions tabs'
            variant='scrollable'
            scrollButtons='auto'
            allowScrollButtonsMobile
          >
            <Tab label='Dashboard' icon={<DashboardIcon />} {...a11yProps(0)} />
            <Tab label='My Properties' icon={<HomeWork />} {...a11yProps(1)} />
            <Tab label='Residents' icon={<Group />} {...a11yProps(2)} />
            <Tab label='Campaigns' icon={<Campaign />} {...a11yProps(3)} />
            <Tab
              label='AI Assistant'
              icon={<ChatBubbleOutlineIcon />}
              {...a11yProps(4)}
            />
          </Tabs>
        </Box>

        <TabPanel value={pmTabValue} index={0}>
          {/* Outer Box for relative positioning of spinner */}
          <Box sx={{ position: 'relative', minHeight: '300px' /* Adjust as needed for initial empty state */ }}>
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
            {/* Original Content - ensure it's not rendered or hidden if you prefer not to show it under spinner */}
            {/* For simplicity, overlay covers it. If content flashes, can add !loading check here too */}
            <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
              Property Dashboard Overview
            </Typography>
          {organizationId ? (
            <PropertySelectorDropdown
              organizationId={organizationId}
              selectedPropertyId={selectedPropertyId}
              onPropertyChange={handlePropertySelect}
              key={refreshPropertiesKey}
            />
          ) : (
            <Alert severity='warning'>
              Organization not identified. Cannot select property.
            </Alert>
          )}

          {selectedPropertyId && organizationId ? (
            <Box sx={{ mt: 2 }}>
              {dashboardError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {dashboardError}
                </Alert>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    flexGrow: 1,
                    flexBasis: { xs: '100%', sm: 'calc(33.333% - 11px)' },
                  }}
                >
                  <KpiCard
                    title='Total Residents'
                    value={
                      dashboardLoading
                        ? '...'
                        : dashboardStats?.propertyCounts?.totalResidents ??
                          'N/A'
                    }
                    isLoading={dashboardLoading}
                    icon={<PeopleIcon />}
                  />
                </Box>
                <Box
                  sx={{
                    flexGrow: 1,
                    flexBasis: { xs: '100%', sm: 'calc(33.333% - 11px)' },
                  }}
                >
                  <KpiCard
                    title='Residents Onboarded'
                    value={
                      dashboardLoading
                        ? '...'
                        : `${(
                            (dashboardStats?.propertyCounts?.occupancyRate ??
                              0) * 100
                          ).toFixed(1)}%`
                    }
                    unit=''
                    isLoading={dashboardLoading}
                    icon={<TrendingUpIcon />}
                  />
                </Box>
                <Box
                  sx={{
                    flexGrow: 1,
                    flexBasis: { xs: '100%', sm: 'calc(33.333% - 11px)' },
                  }}
                >
                  <KpiCard
                    title='Total Units'
                    value={
                      dashboardLoading
                        ? '...'
                        : dashboardStats?.propertyCounts?.totalUnits ?? 'N/A'
                    }
                    isLoading={dashboardLoading}
                    icon={<HomeWork />}
                  />
                </Box>
              </Box>
              {(dashboardStats?.campaignPerformance &&
                dashboardStats.campaignPerformance.length > 0) ||
              dashboardLoading ? (
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, my: 4 }}>
                  {campaignPerformanceOptions && (
                    <BarChart
                      options={campaignPerformanceOptions}
                      isLoading={dashboardLoading}
                      height='350px'
                    />
                  )}
                </Paper>
              ) : (
                !dashboardLoading && (
                  <Typography sx={{ mt: 2 }}>
                    No campaign data to display for this property.
                  </Typography>
                )
              )}

              {/* Phoenix Stats Section */}

              <Typography variant='h6' gutterBottom>
                Service Analytics for{' '}
                {selectedPropertyName || 'Selected Property'}
              </Typography>

              {phoenixError && (
                <Alert severity='error' sx={{ mb: 2 }}>
                  {phoenixError}
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box
                  sx={{
                    flexGrow: 1,
                    flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' },
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
                    flexBasis: { xs: '100%', sm: 'calc(50% - 8px)' },
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
                  <Typography sx={{ mt: 2 }}>
                    No dashboard data to display for this property.
                  </Typography>
                )}
            </Box>
          ) : (
            <Alert severity='info' sx={{ mt: 2 }}>
              Please select a property to view its dashboard.
            </Alert>
          )}
          </Box> {/* This was the missing closing tag */}
        </TabPanel>

        <TabPanel value={pmTabValue} index={1}>
          <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
            Your Managed Properties
          </Typography>
          {organizationId ? (
            <PropertyManagerPropertiesList
              key={refreshPropertiesKey}
              selectedPropertyId={selectedPropertyId}
              onPropertySelect={handlePropertySelect}
              onEditProperty={handleOpenEditPropertyModal}
              onPropertiesUpdate={() =>
                setRefreshPropertiesKey((prev) => prev + 1)
              }
            />
          ) : (
            <Alert severity='warning'>
              Organization context not available.
            </Alert>
          )}
        </TabPanel>
        <TabPanel value={pmTabValue} index={2}>
          <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
            Manage Residents
          </Typography>
          {organizationId ? (
            <PropertySelectorDropdown
              organizationId={organizationId}
              selectedPropertyId={selectedPropertyId}
              onPropertyChange={handlePropertySelect}
              key={`resident-${refreshPropertiesKey}`}
            />
          ) : (
            <Alert severity='warning'>Organization not identified.</Alert>
          )}
          {selectedPropertyId && organizationId ? (
            <>
              <InviteResidentForm
                organizationId={organizationId}
                propertyId={selectedPropertyId}
                propertyName={selectedPropertyName || undefined}
              />
              <PropertyResidentsTable
                organizationId={organizationId}
                propertyId={selectedPropertyId}
                onEditResident={handleOpenEditResidentModal}
                refreshKey={refreshResidentsKey}
              />
            </>
          ) : (
            <Alert severity='info' sx={{ mt: 2 }}>
              Please select a property to manage residents.
            </Alert>
          )}
        </TabPanel>
        <TabPanel value={pmTabValue} index={3}>
          <Typography variant='h6' gutterBottom sx={{ mb: 2 }}>
            Manage Invitation Campaigns
          </Typography>
          {organizationId ? (
            <PropertySelectorDropdown
              organizationId={organizationId}
              selectedPropertyId={selectedPropertyId}
              onPropertyChange={handlePropertySelect}
              key={`campaign-${refreshPropertiesKey}`}
            />
          ) : (
            <Alert severity='warning'>Organization not identified.</Alert>
          )}
          {selectedPropertyId && organizationId ? (
            <PropertyCampaignsView
              organizationId={organizationId}
              propertyId={selectedPropertyId}
            />
          ) : (
            <Alert severity='info' sx={{ mt: 2 }}>
              Please select a property to manage campaigns.
            </Alert>
          )}
        </TabPanel>
        <TabPanel value={pmTabValue} index={4}>
          <Box sx={{ minHeight: '400px' }}>
            <ChatView />
          </Box>
        </TabPanel>

        <Dialog
          open={isCreatePropertyModalOpen}
          onClose={handleCloseCreatePropertyModal}
          fullWidth
          maxWidth='sm'
        >
          <DialogTitle>
            Create New Property{' '}
            <IconButton
              aria-label='close'
              onClick={handleCloseCreatePropertyModal}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            {organizationId && (
              <CreatePropertyForm
                onSuccess={handlePropertyCreated}
                organizationId={organizationId}
                onCancel={handleCloseCreatePropertyModal}
              />
            )}
          </DialogContent>
        </Dialog>
        {propertyToEdit && (
          <EditPropertyModal
            open={isEditPropertyModalOpen}
            onClose={handleCloseEditPropertyModal}
            propertyData={propertyToEdit}
            onSuccess={handlePropertyUpdated}
            organizationId={organizationId || undefined}
          />
        )}
        {residentToEdit && organizationId && selectedPropertyId && (
          <EditResidentModal
            open={isEditResidentModalOpen}
            onClose={handleCloseEditResidentModal}
            residentData={residentToEdit}
            organizationId={organizationId}
            propertyId={selectedPropertyId}
            onSuccess={handleResidentUpdated}
          />
        )}
      </Paper>
    </Container>
  );
};

export default PropertyManagerDashboardPanel;
