import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  TablePagination,
  Chip,
  Divider,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import CarCrashIcon from '@mui/icons-material/CarCrash';
import BlockIcon from '@mui/icons-material/Block';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useAuth } from '../../hooks/useAuth';
import { getMyViolations } from '../../lib/violationsService';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

import type { Violation, ViolationStatus } from '../../types';

// Helper function to format violation type string
const formatViolationType = (type: string) => {
  return type.replace(/_/g, ' ').toUpperCase();
};

// Helper function to get chip properties based on status
const getStatusChipProps = (status: ViolationStatus) => {
  switch (status) {
    case 'acknowledged':
      return { label: 'Acknowledged', color: 'warning' as const };
    case 'pending_tow':
      return { label: 'Pending Tow', color: 'error' as const };
    case 'towed':
      return { label: 'Towed', color: 'error' as const };
    case 'resolved':
      return { label: 'Resolved', color: 'success' as const };
    case 'claimed':
      return { label: 'Claimed', color: 'info' as const };
    case 'reported':
    default:
      return { label: 'Reported', color: 'default' as const };
  }
};

const MyViolationsListView: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const pageLastVisible = useRef<{
    [key: number]: QueryDocumentSnapshot<DocumentData> | undefined;
  }>({});

  useEffect(() => {
    const fetchViolations = async () => {
      if (!currentUser) return;

      setLoading(true);

      try {
        const organizationId = currentUser.customClaims?.organizationId;
        const propertyId = currentUser.customClaims?.propertyId;
        if (!organizationId || !propertyId) {
          throw new Error(
            'Organization ID or Property ID not found in user claims.'
          );
        }

        const result = await getMyViolations({
          organizationId,
          propertyId,
          userId: currentUser.uid,
          rowsPerPage,
          sortBy,
          lastVisible: page > 0 ? pageLastVisible.current[page - 1] : undefined,
        });

        setViolations(result.violations);
        setTotal(result.total);
        if (result.lastVisible) {
          pageLastVisible.current[page] = result.lastVisible;
        }
      } catch (err) {
        console.error('Error fetching violations:', err);
        setError('Failed to load violations.');
      } finally {
        setLoading(false);
      }
    };

    fetchViolations();
  }, [currentUser, page, rowsPerPage, sortBy]);

  const handleSortChange = (event: SelectChangeEvent<string>) => {
    setSortBy(event.target.value);
    setPage(0); // Reset to first page on sort change
  };

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity='error'>{error}</Alert>
      </Box>
    );
  }

  const getViolationIcon = (violationType: string) => {
    switch (violationType) {
      case 'fire_lane':
        return <CarCrashIcon />;
      case 'unauthorized_parking':
        return <BlockIcon />;
      default:
        return <ReportProblemIcon />;
    }
  };

  return (
    <Card>
      <CardHeader
        title='My Reported Violations'
        action={
          <FormControl size='small' sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select value={sortBy} label='Sort By' onChange={handleSortChange}>
              <MenuItem value='createdAt_desc'>Newest</MenuItem>
              <MenuItem value='createdAt_asc'>Oldest</MenuItem>
              <MenuItem value='status'>Status</MenuItem>
            </Select>
          </FormControl>
        }
      />
      <CardContent sx={{ p: 0 }}>
        {violations.length === 0 ? (
          <Box p={3}>
            <Typography>You have not reported any violations.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {violations.map((violation, index) => (
              <React.Fragment key={violation.id}>
                <ListItemButton
                  onClick={() =>
                    navigate(`/dashboard/resident/violations/${violation.id}`)
                  }
                >
                  <ListItemIcon>
                    {getViolationIcon(violation.violationType)}
                  </ListItemIcon>
                  <ListItemText
                    primary={formatViolationType(violation.violationType)}
                    secondary={
                      <Chip
                        {...getStatusChipProps(violation.status)}
                        size='small'
                      />
                    }
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      ml: 2,
                    }}
                  >
                    <Typography variant='body2' color='text.secondary'>
                      {violation.licensePlate}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {violation.createdAt.toLocaleString()}
                    </Typography>
                  </Box>
                </ListItemButton>
                {index < violations.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
      {violations.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component='div'
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      )}
    </Card>
  );
};

export default MyViolationsListView;
