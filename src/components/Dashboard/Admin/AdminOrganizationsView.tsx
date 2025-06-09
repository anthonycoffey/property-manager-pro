import React, { useState, useCallback } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import AddOrganizationModal from '../../Admin/AddOrganizationModal';
import OrganizationManagementPanel from '../../Admin/OrganizationManagementPanel';

const AdminOrganizationsView: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  const handleOpenAddModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleCloseAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const handleOrganizationCreated = useCallback(() => {
    handleCloseAddModal();
    setSnackbarMessage('Organization created successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setRefreshTrigger(prev => prev + 1); // Trigger refresh in OrganizationManagementPanel
  }, [handleCloseAddModal]);

  const handleCloseSnackbar = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Box>
      <OrganizationManagementPanel 
        onOpenAddModal={handleOpenAddModal} 
        refreshTrigger={refreshTrigger} 
      />
      <AddOrganizationModal
        open={isAddModalOpen}
        onClose={handleCloseAddModal}
        onOrganizationCreated={handleOrganizationCreated}
      />
      <Snackbar
        open={snackbarOpen}
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
    </Box>
  );
};

export default AdminOrganizationsView;
