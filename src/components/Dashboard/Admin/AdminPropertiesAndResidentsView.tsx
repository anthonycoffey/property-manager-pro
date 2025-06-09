import React, { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  Snackbar,
  Alert,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import OrganizationSelector from '../../Admin/OrganizationSelector';
import OrganizationPropertiesList from '../../Admin/OrganizationPropertiesList';
import AddOrganizationModal from '../../Admin/AddOrganizationModal'; // Reused for modals
import CreatePropertyForm from '../../PropertyManager/CreatePropertyForm';
import EditPropertyModal from '../../PropertyManager/EditPropertyModal';
import PropertyResidentsTable from '../../PropertyManager/PropertyResidentsTable';
import InviteResidentForm from '../../PropertyManager/InviteResidentForm';
import EditResidentModal from '../../PropertyManager/EditResidentModal';

import type {
  Property as PropertyType,
  Resident as ResidentType,
} from '../../../types';

const AdminPropertiesAndResidentsView: React.FC = () => {
  const [selectedAdminOrgId, setSelectedAdminOrgId] = useState<string | null>(
    null
  );
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

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('success');

  const handleAdminOrgChange = (orgId: string | null) => {
    setSelectedAdminOrgId(orgId);
    // Reset property-specific states when org changes
    setPropertyToEdit(null);
    setPropertyForResidents(null);
    setResidentToEdit(null);
  };

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
    setRefreshResidentsListKey((prev) => prev + 1); // Refresh residents list in modal
  };

  const handleResidentUpdated = () => {
    setSnackbarMessage('Resident updated successfully!');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    setIsEditResidentModalOpen(false);
    setResidentToEdit(null);
    setRefreshResidentsListKey((prev) => prev + 1); // Refresh residents list in modal
  };

  const handlePropertiesUpdate = () => {
    setRefreshPropertiesListKey((prev) => prev + 1);
  };

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Paper sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>

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
            Create Property for Selected Organization
          </Button>
          <OrganizationPropertiesList
            key={refreshPropertiesListKey}
            organizationId={selectedAdminOrgId}
            onEditProperty={handleOpenEditPropertyModal}
            onManageResidents={handleManageResidents}
            onPropertiesUpdate={handlePropertiesUpdate} // Ensure this callback is passed and used if needed
          />
        </>
      ) : (
        <Typography>
          Select an organization to manage its properties and residents.
        </Typography>
      )}

      {/* Modals */}
      {selectedAdminOrgId && (
        <AddOrganizationModal // Reusing AddOrganizationModal as a generic modal container
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
        <AddOrganizationModal // Reusing AddOrganizationModal
          open={isManageResidentsModalOpen}
          onClose={handleCloseManageResidentsModal}
          title={`Residents for Property: ${propertyForResidents.name}`}
          // maxWidth="md" // Removed prop causing TS error
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
              key={`residents-table-${refreshResidentsListKey}`} // Ensure key updates
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
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default AdminPropertiesAndResidentsView;
