import React, { useState } from 'react'; // Added useState for modals if needed here
import {  Alert } from '@mui/material';
import PropertyManagerPropertiesList from '../../PropertyManager/PropertyManagerPropertiesList';
import EditPropertyModal from '../../PropertyManager/EditPropertyModal'; // If edit is triggered from here
import type { Property as PropertyType } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';

const PropertyManagerMyPropertiesView: React.FC = () => {
  const { organizationId } = useAuth();

  // State for EditPropertyModal if it's managed by this view
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<PropertyType | null>(
    null
  );
  const [refreshPropertiesKey, setRefreshPropertiesKey] = useState(0); // To re-trigger list fetch if needed

  const handleOpenEditPropertyModal = (property: PropertyType) => {
    setPropertyToEdit(property);
    setIsEditPropertyModalOpen(true);
  };

  const handleCloseEditPropertyModal = () => {
    setPropertyToEdit(null);
    setIsEditPropertyModalOpen(false);
  };

  const handlePropertyUpdated = () => {
    handleCloseEditPropertyModal();
    setRefreshPropertiesKey((prev) => prev + 1); // Refresh the list
    // Potentially show a snackbar
  };

  if (!organizationId) {
    return (
      <Alert severity='error' sx={{ m: 2 }}>
        Organization context is missing for Property Manager.
      </Alert>
    );
  }

  return (
    <>
      <PropertyManagerPropertiesList
        key={refreshPropertiesKey} // Use key to force re-render if properties list changes externally
        // organizationId is implicitly handled by PropertyManagerPropertiesList via useAuth or props if needed
        onEditProperty={handleOpenEditPropertyModal} // To trigger edit modal from the list
        onPropertiesUpdate={() => setRefreshPropertiesKey((prev) => prev + 1)} // If list has delete/archive actions
      />
      {propertyToEdit &&
        organizationId && ( // Ensure orgId is available for the modal
          <EditPropertyModal
            open={isEditPropertyModalOpen}
            onClose={handleCloseEditPropertyModal}
            propertyData={propertyToEdit}
            onSuccess={handlePropertyUpdated}
            organizationId={organizationId}
          />
        )}
    </>
  );
};

export default PropertyManagerMyPropertiesView;
