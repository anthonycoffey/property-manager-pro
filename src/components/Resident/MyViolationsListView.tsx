import React, { useState, useEffect } from 'react';
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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';

// Define the structure of a violation
type ViolationStatus = 'pending' | 'acknowledged' | 'escalated' | 'reported';

interface Violation {
  id: string;
  licensePlate: string;
  violationType: string;
  photoUrl: string;
  status: ViolationStatus;
  createdAt: Date;
}

interface ViolationFromFirestore extends Omit<Violation, 'createdAt'> {
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}

// Helper function to format violation type string
const formatViolationType = (type: string) => {
  return type.replace(/_/g, ' ').toUpperCase();
};

// Helper function to get chip properties based on status
const getStatusChipProps = (status: ViolationStatus) => {
  switch (status) {
    case 'acknowledged':
      return { label: 'Acknowledged', color: 'warning' as const };
    case 'escalated':
      return { label: 'Escalated', color: 'error' as const };
    case 'reported':
      return { label: 'Reported', color: 'info' as const };
    case 'pending':
    default:
      return { label: 'Pending', color: 'default' as const };
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

  useEffect(() => {
    const fetchViolations = async () => {
      if (!currentUser) return;

      setLoading(true);
      const functions = getFunctions();
      const getMyViolations = httpsCallable(functions, 'getMyViolations');

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
          page,
          rowsPerPage,
          sortBy,
        });
        const { violations: newViolations, total: totalCount } = result.data as {
          violations: ViolationFromFirestore[];
          total: number;
        };

        const formattedViolations: Violation[] = newViolations.map((v) => ({
          ...v,
          createdAt: new Date(v.createdAt._seconds * 1000),
        }));

        setViolations(formattedViolations);
        setTotal(totalCount);
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
      case 'unauthorized_space':
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
                      {violation.createdAt.toLocaleDateString()}
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
