import React, { useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  Button,
  Snackbar,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

// Re-using Admin components where applicable, or specific OrgManager components if they exist
import OrganizationPropertiesList from '../../Admin/OrganizationPropertiesList'; // Can be reused if props allow scoping
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

import { useOrgManagerContext } from '../../../contexts/OrgManagerContext';

// interface OrgManagerPropertiesViewProps {
//   selectedOrgId: string | null; // Will come from context
// }

const OrgManagerPropertiesView: React.FC = () => {
  const { selectedOrgId, selectedOrganization } = useOrgManagerContext(); // Consume context

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

  if (!selectedOrgId || !selectedOrganization) {
    return (
      <Alert severity='info'>
        Please select an organization to manage its properties and residents.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
        Properties & Residents for {selectedOrganization.name}
      </Typography>
      <Button
        variant='contained'
        startIcon={<AddIcon />}
        onClick={handleOpenCreatePropertyModal}
        sx={{ mb: 2 }}
        // disabled={!selectedOrgId} // selectedOrgId is guaranteed by the guard clause
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

      {/* Modals */}
      {selectedOrgId && ( // Ensure selectedOrgId is present for modals
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
              key={`residents-table-${refreshResidentsListKey}`}
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
    </Box>
  );
};

export default OrgManagerPropertiesView;
