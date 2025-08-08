import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  TablePagination,
  Chip,
  Avatar,
  Skeleton,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { usePropertyManagerContext } from '../../hooks/usePropertyManagerContext';
import { useUserProfiles } from '../../hooks/useUserProfiles';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';
import type { Violation, GetViolationsResponse } from '../../types';
import ViolationActionsMenu from '../../components/PropertyManager/Violations/ViolationActionsMenu';
import ChangeViolationStatusModal from '../../components/PropertyManager/Violations/ChangeViolationStatusModal';

const ViolationsDashboardPage = () => {
  const { selectedPropertyId } = usePropertyManagerContext();
  const { organizationId } = useAuth();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(
    new Date(new Date().setDate(new Date().getDate() - 1))
  );
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalViolations, setTotalViolations] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(
    null
  );

  // Get all unique user IDs from the violations list (reporters and residents)
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    violations.forEach((v) => {
      if (v.reporterId) ids.add(v.reporterId);
      if (v.residentId) ids.add(v.residentId);
    });
    return [...ids];
  }, [violations]);

  // Fetch user profiles for all user IDs
  const { profiles, isLoading: profilesLoading } = useUserProfiles(userIds);

  const fetchViolations = useCallback(async () => {
    if (!selectedPropertyId || !organizationId) return;
    setLoading(true);
    const functions = getFunctions();
    const getViolations = httpsCallable(functions, 'getViolations');
    try {
      const result = await getViolations({
        organizationId,
        propertyId: selectedPropertyId,
        status: statusFilter,
        type: typeFilter,
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
        page: page,
        rowsPerPage: rowsPerPage,
      });
      const data = result.data as GetViolationsResponse;
      setViolations(data.violations || []);
      setTotalViolations(data.total || 0);
    } catch (error) {
      console.error('Error fetching violations:', error);
      setViolations([]);
      setTotalViolations(0);
    } finally {
      setLoading(false);
    }
  }, [
    selectedPropertyId,
    organizationId,
    statusFilter,
    typeFilter,
    startDate,
    endDate,
    page,
    rowsPerPage,
  ]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const handleOpenChangeStatusModal = (violation: Violation) => {
    setSelectedViolation(violation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedViolation(null);
  };

  const handleStatusChanged = () => {
    fetchViolations();
  };

  if (!selectedPropertyId) {
    return (
      <Box>
        <Typography>
          Please select a property from the dashboard to view violations.
        </Typography>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label='Status'
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value=''>
                <em>All</em>
              </MenuItem>
              <MenuItem value='reported'>Reported</MenuItem>
              <MenuItem value='claimed'>Claimed</MenuItem>
              <MenuItem value='acknowledged'>Acknowledged</MenuItem>
              <MenuItem value='resolved'>Resolved</MenuItem>
              <MenuItem value='pending_tow'>Pending Tow</MenuItem>
              <MenuItem value='towed'>Towed</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Violation Type</InputLabel>
            <Select
              value={typeFilter}
              label='Violation Type'
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value=''>
                <em>All</em>
              </MenuItem>
              <MenuItem value='fire_lane'>Fire Lane</MenuItem>
              <MenuItem value='unauthorized_parking'>
                Unauthorized Parking
              </MenuItem>
              <MenuItem value='blocking_driveway'>Blocking Driveway</MenuItem>
              <MenuItem value='double_parked'>Double Parked</MenuItem>
              <MenuItem value='other'>Other</MenuItem>
            </Select>
          </FormControl>
          <DatePicker
            label='From'
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
          />
          <DatePicker
            label='To'
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
          />
        </Box>
        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Reporter</TableCell>
                  <TableCell>Resident</TableCell>
                  <TableCell align='center'>License Plate</TableCell>
                  <TableCell align='center'>Violation Type</TableCell>
                  <TableCell align='center'>Status</TableCell>
                  <TableCell align='center'>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {violations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align='center'>
                      No violations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  violations.map((violation) => {
                    // Handle Firestore Timestamp which might be a class instance or a serialized object
                    let date: Date;
                    if (
                      violation.createdAt &&
                      'toDate' in violation.createdAt
                    ) {
                      // It's a Firestore Timestamp instance
                      date = violation.createdAt.toDate();
                    } else if (
                      violation.createdAt &&
                      '_seconds' in violation.createdAt
                    ) {
                      // It's a serialized Timestamp object
                      date = new Date(violation.createdAt._seconds * 1000);
                    } else {
                      // Fallback for other potential date formats or invalid data
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      date = new Date(violation.createdAt as any);
                    }

                    return (
                      <TableRow key={violation.id}>
                        <TableCell>
                          {!isNaN(date.getTime())
                            ? date.toLocaleString()
                            : 'Invalid Date'}
                        </TableCell>
                        <TableCell>
                          {profilesLoading ? (
                            <Skeleton variant='text' width={100} />
                          ) : profiles[violation.reporterId] ? (
                            <Chip
                              avatar={
                                <Avatar
                                  alt={
                                    profiles[violation.reporterId].displayName
                                  }
                                  src={
                                    profiles[violation.reporterId].photoURL ||
                                    undefined
                                  }
                                />
                              }
                              label={profiles[violation.reporterId].displayName}
                              variant='outlined'
                            />
                          ) : (
                            violation.reporterId
                          )}
                        </TableCell>
                        <TableCell>
                          {profilesLoading ? (
                            <Skeleton variant='text' width={100} />
                          ) : violation.residentId &&
                            profiles[violation.residentId] ? (
                            <Chip
                              avatar={
                                <Avatar
                                  alt={
                                    profiles[violation.residentId].displayName
                                  }
                                  src={
                                    profiles[violation.residentId].photoURL ||
                                    undefined
                                  }
                                />
                              }
                              label={profiles[violation.residentId].displayName}
                              variant='outlined'
                            />
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell align='center'>
                          {violation.licensePlate}
                        </TableCell>
                        <TableCell align='center'>
                          <Chip
                            label={violation.violationType
                              .replace(/_/g, ' ')
                              .toUpperCase()}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Chip
                            label={violation.status.toUpperCase()}
                            color={
                              violation.status === 'resolved'
                                ? 'success'
                                : violation.status === 'acknowledged'
                                ? 'info'
                                : violation.status === 'claimed'
                                ? 'secondary'
                                : violation.status === 'pending_tow'
                                ? 'warning'
                                : violation.status === 'towed'
                                ? 'error'
                                : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <ViolationActionsMenu
                            violation={violation}
                            onChangeStatus={handleOpenChangeStatusModal}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {!loading && totalViolations > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component='div'
            count={totalViolations}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
          />
        )}
        <ChangeViolationStatusModal
          open={isModalOpen}
          onClose={handleCloseModal}
          violation={selectedViolation}
          onStatusChanged={handleStatusChanged}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default ViolationsDashboardPage;
