import React, { useState } from 'react';
import { Box, Typography, Divider, Alert } from '@mui/material';
import InviteResidentForm from '../../PropertyManager/InviteResidentForm';
import PropertyResidentsTable from '../../PropertyManager/PropertyResidentsTable';
import EditResidentModal from '../../PropertyManager/EditResidentModal';
import type { Resident as ResidentType } from '../../../types';
import { usePropertyManagerContext } from '../../../hooks/usePropertyManagerContext';
import { useAuth } from '../../../hooks/useAuth';

const PropertyManagerResidentsView: React.FC = () => {
  const { selectedPropertyId, selectedPropertyName } =
    usePropertyManagerContext();
  const { organizationId } = useAuth();

  const [isEditResidentModalOpen, setIsEditResidentModalOpen] = useState(false);
  const [residentToEdit, setResidentToEdit] = useState<ResidentType | null>(
    null
  );
  const [refreshResidentsKey, setRefreshResidentsKey] = useState(0); // To re-trigger list fetch

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
    // Potentially show a snackbar
  };

  const handleResidentInvited = () => {
    setRefreshResidentsKey((prev) => prev + 1);
    // Potentially show a snackbar
  };

  if (!organizationId) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        Organization context is missing.
      </Alert>
    );
  }
  if (!selectedPropertyId) {
    return (
      <Alert severity='info' sx={{ m: 2 }}>
        Please select a property to manage residents.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, lg: 3 } }}>
      <Typography variant='h5' gutterBottom sx={{ mb: 2 }}>
        Manage Residents for {selectedPropertyName || 'Selected Property'}
      </Typography>
      <InviteResidentForm
        organizationId={organizationId}
        propertyId={selectedPropertyId}
        propertyName={selectedPropertyName || undefined}
        onInvitationSent={handleResidentInvited}
      />
      <Divider sx={{ my: 3 }} />
      <PropertyResidentsTable
        organizationId={organizationId}
        propertyId={selectedPropertyId}
        onEditResident={handleOpenEditResidentModal}
        refreshKey={refreshResidentsKey}
      />
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
    </Box>
  );
};

export default PropertyManagerResidentsView;
