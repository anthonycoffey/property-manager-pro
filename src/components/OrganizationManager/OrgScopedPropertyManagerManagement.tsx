import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Snackbar,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RevokeIcon from '@mui/icons-material/Cancel';
import InvitePropertyManagerForm from '../Admin/InvitePropertyManagerForm'; // Re-use for now
import { useAuth } from '../../hooks/useAuth';
import type { AppError } from '../../types';
import { httpsCallable } from 'firebase/functions';
import { functions, db } from '../../firebaseConfig'; // Ensure correct path
import {
  collection,
  query,
  where,
  onSnapshot,
  type DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';

const updatePropertyManagerCallable = httpsCallable(
  functions,
  'updatePropertyManager'
);
const deletePropertyManagerCallable = httpsCallable(
  functions,
  'deletePropertyManager'
);
const revokeInvitationCallable = httpsCallable(functions, 'revokeInvitation');

interface OrgScopedPropertyManagerManagementProps {
  organizationId: string | null; // This will be the selected org ID for the Org Manager
  organizationCreatedBy: string | null; // UID of the user who created the selected organization
}

interface PropertyManagerUser {
  id: string; // UID
  displayName: string;
  email: string;
  createdAt?: Timestamp;
}

interface PendingInvitation {
  id: string; // Invitation document ID
  inviteeEmail: string;
  createdAt?: Timestamp;
  expiresAt?: Timestamp;
  rolesToAssign?: string[];
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

type ManagementListItem =
  | ({ type: 'active_pm' } & PropertyManagerUser)
  | ({ type: 'pending_invite' } & PendingInvitation);

const OrgScopedPropertyManagerManagement: React.FC<
  OrgScopedPropertyManagerManagementProps
> = ({ organizationId, organizationCreatedBy }) => {
  const {
    currentUser,
    roles,
    organizationIds,
    loading: authLoading,
  } = useAuth();

  const [combinedList, setCombinedList] = useState<ManagementListItem[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedInvitationForRevoke, setSelectedInvitationForRevoke] =
    useState<PendingInvitation | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const [updatePmDialogOpen, setUpdatePmDialogOpen] = useState(false);
  const [selectedPmForUpdate, setSelectedPmForUpdate] =
    useState<PropertyManagerUser | null>(null);
  const [updatePmForm, setUpdatePmForm] = useState({
    displayName: '',
    email: '',
  });
  const [updatePmLoading, setUpdatePmLoading] = useState(false);

  const [deletePmDialogOpen, setDeletePmDialogOpen] = useState(false);
  const [selectedPmForDelete, setSelectedPmForDelete] =
    useState<PropertyManagerUser | null>(null);
  const [deletePmLoading, setDeletePmLoading] = useState(false);

  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>(
    'success'
  );

  const canManage =
    currentUser &&
    roles.includes('organization_manager') &&
    (organizationIds?.includes(organizationId || '') ||
      currentUser.uid === organizationCreatedBy);

  useEffect(() => {
    // Reset dataError at the beginning of the effect to clear previous errors if conditions are now met
    setDataError(null); 

    if (!organizationId || !canManage) {
      setCombinedList([]);
      // Only set error if canManage is false, otherwise it's a "select org" message
      setDataError(canManage ? null : 'You do not have permission to manage this organization.');
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    // dataError is already reset above, no need to reset again here

    let activePMsData: PropertyManagerUser[] = [];
    let pendingInvitesData: PendingInvitation[] = [];

    const mergeAndSetData = () => {
      const newCombinedList: ManagementListItem[] = [
        ...activePMsData.map((pm) => ({ ...pm, type: 'active_pm' as const })),
        ...pendingInvitesData.map((invite) => ({
          ...invite,
          type: 'pending_invite' as const,
        })),
      ];
      newCombinedList.sort((a, b) => {
        const dateA = a.createdAt?.toDate()?.getTime() || 0;
        const dateB = b.createdAt?.toDate()?.getTime() || 0;
        return dateB - dateA;
      });
      setCombinedList(newCombinedList);
      setDataLoading(false);
    };

    const usersRef = collection(db, `organizations/${organizationId}/users`);
    const pmQuery = query(
      usersRef,
      where('organizationRoles', 'array-contains', 'property_manager')
    );

    const unsubscribePMs = onSnapshot(
      pmQuery,
      (snapshot) => {
        activePMsData = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            displayName: doc.data().displayName || 'N/A',
            email: doc.data().email || 'N/A',
            createdAt: doc.data().createdAt as Timestamp,
          })
        );
        mergeAndSetData();
      },
      (error) => {
        console.error('Error fetching property managers:', error);
        setDataError('Failed to load property managers.');
        setDataLoading(false);
      }
    );

    const invitesRef = collection(
      db,
      `organizations/${organizationId}/invitations`
    );
    const inviteQuery = query(
      invitesRef,
      where('status', '==', 'pending'),
      where('rolesToAssign', 'array-contains', 'property_manager')
    );

    const unsubscribeInvites = onSnapshot(
      inviteQuery,
      (snapshot) => {
        pendingInvitesData = snapshot.docs.map(
          (doc: QueryDocumentSnapshot<DocumentData>) => ({
            id: doc.id,
            inviteeEmail: doc.data().email || 'N/A',
            createdAt: doc.data().createdAt as Timestamp,
            expiresAt: doc.data().expiresAt as Timestamp,
            rolesToAssign: doc.data().rolesToAssign,
            status: doc.data().status as PendingInvitation['status'],
          })
        );
        mergeAndSetData();
      },
      (error) => {
        console.error('Error fetching pending invitations:', error);
        setDataError('Failed to load pending invitations.');
        setDataLoading(false);
      }
    );

    return () => {
      unsubscribePMs();
      unsubscribeInvites();
    };
  }, [organizationId, canManage]); // Add canManage to dependency array

  if (authLoading) {
    return (
      <Typography sx={{ p: 2 }}>Loading authentication details...</Typography>
    );
  }

  if (!canManage && !authLoading) {
    // Check authLoading to prevent premature redirect
    return (
      <Alert severity='error'>
        You do not have permission to manage property managers for this
        organization.
      </Alert>
    );
  }

  const handleOpenRevokeDialog = (invitation: PendingInvitation) => {
    setSelectedInvitationForRevoke(invitation);
    setRevokeDialogOpen(true);
  };

  const handleCloseRevokeDialog = () => {
    setSelectedInvitationForRevoke(null);
    setRevokeDialogOpen(false);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedInvitationForRevoke || !organizationId || !canManage) return;

    setRevokeLoading(true);
    try {
      await revokeInvitationCallable({
        organizationId: organizationId,
        invitationId: selectedInvitationForRevoke.id,
      });
      setSnackbarMessage('Invitation revoked successfully.');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error revoking invitation:', error);
      const appError = error as AppError;
      setSnackbarMessage(appError.message || 'Failed to revoke invitation.');
      setSnackbarSeverity('error');
    } finally {
      setRevokeLoading(false);
      handleCloseRevokeDialog();
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarMessage(null);
  };

  const handleOpenUpdatePmDialog = (pm: PropertyManagerUser) => {
    setSelectedPmForUpdate(pm);
    setUpdatePmForm({ displayName: pm.displayName, email: pm.email });
    setUpdatePmDialogOpen(true);
  };

  const handleCloseUpdatePmDialog = () => {
    setSelectedPmForUpdate(null);
    setUpdatePmDialogOpen(false);
    setUpdatePmForm({ displayName: '', email: '' });
  };

  const handleUpdatePmFormChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setUpdatePmForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmUpdatePm = async () => {
    if (!selectedPmForUpdate || !organizationId || !canManage) return;

    setUpdatePmLoading(true);
    try {
      await updatePropertyManagerCallable({
        uid: selectedPmForUpdate.id,
        organizationId: organizationId,
        displayName: updatePmForm.displayName,
        email: updatePmForm.email,
      });
      setSnackbarMessage('Property Manager updated successfully.');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error updating Property Manager:', error);
      const appError = error as AppError;
      setSnackbarMessage(
        appError.message || 'Failed to update Property Manager.'
      );
      setSnackbarSeverity('error');
    } finally {
      setUpdatePmLoading(false);
      handleCloseUpdatePmDialog();
    }
  };

  const handleOpenDeletePmDialog = (pm: PropertyManagerUser) => {
    setSelectedPmForDelete(pm);
    setDeletePmDialogOpen(true);
  };

  const handleCloseDeletePmDialog = () => {
    setSelectedPmForDelete(null);
    setDeletePmDialogOpen(false);
  };

  const handleConfirmDeletePm = async () => {
    if (!selectedPmForDelete || !organizationId || !canManage) return;

    setDeletePmLoading(true);
    try {
      await deletePropertyManagerCallable({
        uid: selectedPmForDelete.id,
        organizationId: organizationId,
      });
      setSnackbarMessage('Property Manager deleted successfully.');
      setSnackbarSeverity('success');
    } catch (error) {
      console.error('Error deleting Property Manager:', error);
      const appError = error as AppError;
      setSnackbarMessage(
        appError.message || 'Failed to delete Property Manager.'
      );
      setSnackbarSeverity('error');
    } finally {
      setDeletePmLoading(false);
      handleCloseDeletePmDialog();
    }
  };

  if (!organizationId) {
    return (
      <Alert severity='info' sx={{ m: 2 }}>
        Select an organization to manage its Property Managers.
      </Alert>
    );
  }

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <InvitePropertyManagerForm selectedOrganizationId={organizationId} />
      </Box>

      {dataLoading && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography>Loading data for {organizationId}...</Typography>
        </Box>
      )}
      {dataError && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {dataError}
        </Alert>
      )}

      {!dataLoading && !dataError && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table aria-label='property manager and invitations list'>
            <TableHead>
              <TableRow>
                <TableCell>Identifier</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expires/Created</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {combinedList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align='center'>
                    No property managers or pending invitations found.
                  </TableCell>
                </TableRow>
              ) : (
                combinedList.map((item) => (
                  <TableRow key={item.type + '_' + item.id}>
                    <TableCell component='th' scope='row'>
                      {item.type === 'active_pm'
                        ? item.displayName
                        : item.inviteeEmail}
                    </TableCell>
                    <TableCell>
                      {item.type === 'active_pm'
                        ? item.email
                        : item.inviteeEmail}
                    </TableCell>
                    <TableCell>
                      {item.type === 'active_pm' ? (
                        <Chip label='Active' color='success' size='small' />
                      ) : (
                        <Chip label='Invite Sent' color='info' size='small' />
                      )}
                    </TableCell>
                    <TableCell>
                      {item.type === 'pending_invite' && item.expiresAt
                        ? `Expires: ${item.expiresAt
                            .toDate()
                            .toLocaleDateString()}`
                        : item.createdAt
                        ? `Created: ${item.createdAt
                            .toDate()
                            .toLocaleDateString()}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell align='right'>
                      {item.type === 'active_pm' && (
                        <>
                          <Tooltip title='Edit PM'>
                            <IconButton
                              size='small'
                              onClick={() =>
                                handleOpenUpdatePmDialog(
                                  item as PropertyManagerUser
                                )
                              }
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Delete PM'>
                            <IconButton
                              size='small'
                              onClick={() =>
                                handleOpenDeletePmDialog(
                                  item as PropertyManagerUser
                                )
                              }
                              sx={{ ml: 1 }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {item.type === 'pending_invite' && (
                        <Tooltip title='Revoke Invitation'>
                          <IconButton
                            size='small'
                            onClick={() =>
                              handleOpenRevokeDialog(item as PendingInvitation)
                            }
                          >
                            <RevokeIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {/* Dialogs and Snackbar */}
      <Dialog open={revokeDialogOpen} onClose={handleCloseRevokeDialog}>
        <DialogTitle>Revoke Invitation?</DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            Are you sure you want to revoke the invitation for{' '}
            {selectedInvitationForRevoke?.inviteeEmail}? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRevokeDialog} variant="outlined" color="error" disabled={revokeLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmRevoke}
            variant="contained"
            color='error'
            disabled={revokeLoading}
            autoFocus
          >
            {revokeLoading ? <CircularProgress size={20} /> : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={updatePmDialogOpen} onClose={handleCloseUpdatePmDialog}>
        <DialogTitle>Edit Property Manager</DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 1 }}>
            Modify the details for{' '}
            {selectedPmForUpdate?.displayName || 'this Property Manager'}.
            Password and role changes are not handled here.
          </DialogContentText>
          <TextField
            autoFocus
            margin='dense'
            id='displayName'
            name='displayName'
            label='Display Name'
            type='text'
            fullWidth
            variant='outlined'
            value={updatePmForm.displayName}
            onChange={handleUpdatePmFormChange}
            required
          />
          <TextField
            margin='dense'
            id='email'
            name='email'
            label='Email Address'
            type='email'
            fullWidth
            variant='outlined'
            value={updatePmForm.email}
            onChange={handleUpdatePmFormChange}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseUpdatePmDialog}
            disabled={updatePmLoading}
            variant="outlined"
            color="error"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUpdatePm}
            disabled={updatePmLoading}
            variant="contained"
            color="primary"
          >
            {updatePmLoading ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deletePmDialogOpen} onClose={handleCloseDeletePmDialog}>
        <DialogTitle>Delete Property Manager?</DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            Are you sure you want to delete the property manager{' '}
            {selectedPmForDelete?.displayName} ({selectedPmForDelete?.email})?
            This action will permanently remove their account and access. This
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeletePmDialog}
            variant="outlined"
            color="error"
            disabled={deletePmLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeletePm}
            variant="contained"
            color='error'
            disabled={deletePmLoading}
            autoFocus
          >
            {deletePmLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default OrgScopedPropertyManagerManagement;
