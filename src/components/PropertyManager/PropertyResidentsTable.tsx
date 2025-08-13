import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  Typography,
  CircularProgress,
  Box,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { collection, query, getDocs, orderBy, limit, startAfter, type DocumentData, type QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';
import { db as firestore } from '../../firebaseConfig';
import type { Resident, Address } from '../../types';

interface PropertyResidentsTableProps {
  organizationId: string;
  propertyId: string | null;
  onEditResident: (resident: Resident) => void;
  refreshKey?: number;
}

const formatAddress = (address: Address | undefined): string => {
  if (!address) return 'N/A';
  const { street, city, state, zip, unit } = address;
  let formattedAddress = `${street || ''}, ${city || ''}, ${state || ''} ${zip || ''}`;
  if (unit) {
    formattedAddress += `, Unit ${unit}`;
  }
  return formattedAddress;
};

const PropertyResidentsTable: React.FC<PropertyResidentsTableProps> = ({ organizationId, propertyId, onEditResident, refreshKey }) => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [totalResidents, setTotalResidents] = useState<number>(0);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisible, setFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const fetchResidentsCount = useCallback(async () => {
    if (!propertyId || !organizationId) return 0;
    try {
      const residentsRef = collection(firestore, `organizations/${organizationId}/properties/${propertyId}/residents`);
      const q = query(residentsRef);
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (err) {
      console.error('Error fetching residents count:', err);
      return 0;
    }
  }, [organizationId, propertyId]);

  const fetchResidents = useCallback(async (newPage: number, newRowsPerPage: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    if (!propertyId || !organizationId) {
      setResidents([]);
      setTotalResidents(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const residentsRef = collection(firestore, `organizations/${organizationId}/properties/${propertyId}/residents`);
      let q;

      if (direction === 'first' || newPage === 0) {
        const count = await fetchResidentsCount();
        setTotalResidents(count);
        q = query(residentsRef, orderBy('displayName'), limit(newRowsPerPage));
      } else if (direction === 'next' && lastVisible) {
        q = query(residentsRef, orderBy('displayName'), startAfter(lastVisible), limit(newRowsPerPage));
      } else if (direction === 'prev' && firstVisible) {
        const tempCount = await fetchResidentsCount();
        setTotalResidents(tempCount);
        const itemsToSkip = newPage * newRowsPerPage;
        const tempQuery = query(residentsRef, orderBy('displayName'), limit(itemsToSkip + newRowsPerPage));
        const documentSnapshots = await getDocs(tempQuery);
        const allFetchedResidents = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resident));
        const pageResidents = allFetchedResidents.slice(itemsToSkip, itemsToSkip + newRowsPerPage);
        setResidents(pageResidents);
        if (documentSnapshots.docs.length > 0) {
            setFirstVisible(documentSnapshots.docs[0]);
            setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        } else {
            setFirstVisible(null);
            setLastVisible(null);
        }
        setLoading(false);
        return;
      } else {
        const count = await fetchResidentsCount();
        setTotalResidents(count);
        q = query(residentsRef, orderBy('displayName'), limit(newRowsPerPage));
      }

      const documentSnapshots = await getDocs(q);
      const fetchedResidents = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resident));
      setResidents(fetchedResidents);

      if (documentSnapshots.docs.length > 0) {
        if (direction === 'first' || newPage === 0) setFirstVisible(documentSnapshots.docs[0]);
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
      } else {
        if (direction === 'first' || newPage === 0) setFirstVisible(null);
        setLastVisible(null);
      }

    } catch (err: unknown) {
      console.error('Error fetching residents:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError('Failed to fetch residents. ' + errorMessage);
      setResidents([]);
      setTotalResidents(0);
    } finally {
      setLoading(false);
    }
  }, [organizationId, propertyId, lastVisible, firstVisible, fetchResidentsCount]);

  useEffect(() => {
    setPage(0);
    setLastVisible(null);
    setFirstVisible(null);
    fetchResidents(0, rowsPerPage, 'first');
  }, [propertyId, organizationId, rowsPerPage, fetchResidents, refreshKey]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    const direction = newPage > page ? 'next' : 'prev';
    setPage(newPage);
    if (direction === 'prev' && newPage < page) {
         fetchResidents(newPage, rowsPerPage, newPage === 0 ? 'first' : 'prev');
    } else {
        fetchResidents(newPage, rowsPerPage, direction);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    setLastVisible(null);
    setFirstVisible(null);
    fetchResidents(0, newRowsPerPage, 'first');
  };

  if (!propertyId) {
    return <Typography variant="body1" sx={{ mt: 2 }}>Select a property to view its residents.</Typography>;
  }

  if (loading && residents.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>;
  }

  if (residents.length === 0 && !loading) {
    return <Typography variant="body1" sx={{ mt: 2 }}>No residents found for this property.</Typography>;
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }} elevation={0}>
      <TableContainer>
        <Table stickyHeader aria-label="residents table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Address</TableCell>
              <TableCell>Lease Start</TableCell>
              <TableCell>Lease End</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {residents.map((resident) => {
              const leaseStartDate = resident.leaseStartDate instanceof Timestamp ? resident.leaseStartDate.toDate() : resident.leaseStartDate;
              const leaseEndDate = resident.leaseEndDate instanceof Timestamp ? resident.leaseEndDate.toDate() : resident.leaseEndDate;
              return (
                <TableRow hover role="checkbox" tabIndex={-1} key={resident.id}>
                  <TableCell>{resident.displayName}</TableCell>
                  <TableCell>{resident.email}</TableCell>
                  <TableCell>{formatAddress(resident.address)}</TableCell>
                  <TableCell>{leaseStartDate ? new Date(leaseStartDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{leaseEndDate ? new Date(leaseEndDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label="edit resident"
                      size="small"
                      onClick={() => onEditResident(resident)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalResidents}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default PropertyResidentsTable;
