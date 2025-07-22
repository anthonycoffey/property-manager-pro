import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Chip,
  IconButton,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../hooks/useAuth';

// Define the structure of a violation
interface Violation {
  id: string;
  licensePlate: string;
  violationType: string;
  photoUrl: string;
  status: 'pending_acknowledgement' | 'acknowledged' | 'escalated_to_manager' | 'reported';
  createdAt: Date;
}

interface Timestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface ViolationData extends Omit<Violation, 'createdAt'> {
  createdAt: Timestamp;
}

const MyViolationsListView: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

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
          throw new Error('Organization ID or Property ID not found in user claims.');
        }

        const result = await getMyViolations({ organizationId, propertyId, page, rowsPerPage });
        const { violations: newViolations, total: totalCount } = result.data as { violations: { id: string }[], total: number };

        const formattedViolations: Violation[] = newViolations.map((v: any) => ({
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
  }, [currentUser, page, rowsPerPage]);


  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>My Reported Violations</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>License Plate</TableCell>
              <TableCell>Violation Type</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No violations found.
                </TableCell>
              </TableRow>
            ) : (
              violations.map((violation) => (
                <TableRow key={violation.id} hover={false}>
                  <TableCell>{violation.licensePlate}</TableCell>
                  <TableCell>
                    <Chip label={violation.violationType.replace(/_/g, ' ').toUpperCase()} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={violation.status.toUpperCase()}
                      color={
                        violation.status === 'acknowledged'
                          ? 'warning'
                          : violation.status === 'escalated_to_manager'
                          ? 'error'
                          : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{violation.createdAt.toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={() => navigate(`/dashboard/resident/violations/${violation.id}`)}
                    >
                      <LinkIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_event, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
      />
    </Box>
  );
};

export default MyViolationsListView;
