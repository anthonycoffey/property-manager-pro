import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import OrganizationSelector from '../../Admin/OrganizationSelector'; // Reusing Admin's Org Selector
import PropertySelectorDropdown from '../../PropertyManager/PropertySelectorDropdown';
import PropertyCampaignsView from '../../PropertyManager/Campaigns/PropertyCampaignsView';

interface Organization {
  id: string;
  name: string;
  // Add other relevant fields if needed
}

const OrgManagerCampaignsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null
  );
  const [loadingOrgs, setLoadingOrgs] = useState<boolean>(false);
  const [errorOrgs, setErrorOrgs] = useState<string | null>(null);

  const managedOrgIds = useMemo(
    () => (currentUser?.customClaims?.organizationIds as string[]) || [],
    [currentUser]
  );
  const isMultiOrgManager = managedOrgIds.length > 1;
  const isSingleOrgManager = managedOrgIds.length === 1;

  useEffect(() => {
    if (isSingleOrgManager) {
      setSelectedOrganizationId(managedOrgIds[0]);
    } else if (isMultiOrgManager) {
      setLoadingOrgs(true);
      setErrorOrgs(null);
      const fetchOrganizations = async () => {
        try {
          if (managedOrgIds.length === 0) {
            setOrganizations([]);
            setLoadingOrgs(false);
            return;
          }
          // Fetch details for only the organizations the OM manages
          const orgsQuery = query(
            collection(db, 'organizations'),
            where('__name__', 'in', managedOrgIds)
          );
          const querySnapshot = await getDocs(orgsQuery);
          const fetchedOrganizations = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name as string,
          }));
          setOrganizations(fetchedOrganizations);
        } catch (err) {
          console.error('Error fetching organizations:', err);
          setErrorOrgs('Failed to load organizations.');
        } finally {
          setLoadingOrgs(false);
        }
      };
      fetchOrganizations();
    } else {
      // No organizations assigned
      setOrganizations([]);
      setSelectedOrganizationId(null);
    }
  }, [currentUser, isSingleOrgManager, isMultiOrgManager, managedOrgIds]);

  const handleOrganizationChange = (orgId: string | null) => {
    setSelectedOrganizationId(orgId);
    setSelectedPropertyId(null); // Reset property when org changes
  };

  const handlePropertyChange = (propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
  };

  if (
    !currentUser ||
    !currentUser.customClaims?.roles?.includes('organization_manager')
  ) {
    return (
      <Typography color='error'>
        Access Denied. You are not an Organization Manager.
      </Typography>
    );
  }

  if (managedOrgIds.length === 0 && !isMultiOrgManager) {
    return (
      <Typography>
        You are not assigned to any organizations to manage campaigns.
      </Typography>
    );
  }

  return (
    <Paper>
      {isMultiOrgManager && (
        <Box sx={{ mb: 2 }}>
          <Typography variant='subtitle1' gutterBottom>
            Select Organization:
          </Typography>
          {/* OrganizationSelector will show its own loading/error state based on managedOrgIds */}
          <OrganizationSelector
            selectedOrganizationId={selectedOrganizationId}
            onOrganizationChange={handleOrganizationChange}
            managedOrganizationIds={managedOrgIds}
            label='Select Managed Organization'
          />
          {/* The OrganizationSelector itself will display messages like "No organizations found..." */}
          {/* So, the specific loading/error/empty states for 'organizations' in this component might be redundant if selector handles it well */}
          {/* However, keeping a general loading/error for the initial fetch of managedOrgIds might still be useful if that fetch was complex */}
          {/* For now, assuming OrganizationSelector handles its display based on managedOrgIds */}
          {loadingOrgs && (
            <CircularProgress
              size={24}
              sx={{
                display: organizations.length > 0 ? 'none' : 'block',
                margin: 'auto',
              }}
            />
          )}
          {errorOrgs && <Typography color='error'>{errorOrgs}</Typography>}
          {/* This specific check might be redundant if OrganizationSelector handles empty states based on managedOrgIds */}
          {/* {!loadingOrgs && !errorOrgs && organizations.length === 0 && managedOrgIds.length > 0 && (
            <Typography>No organizations found for your assigned IDs.</Typography>
          )} */}
        </Box>
      )}

      {selectedOrganizationId && (
        <Box sx={{ mb: 2 }}>
          <PropertySelectorDropdown
            organizationId={selectedOrganizationId}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={handlePropertyChange}
            label='Properties'
          />
        </Box>
      )}

      {selectedOrganizationId && selectedPropertyId && (
        <PropertyCampaignsView
          organizationId={selectedOrganizationId}
          propertyId={selectedPropertyId}
        />
      )}
      {selectedOrganizationId && !selectedPropertyId && (
        <Typography sx={{ mt: 2 }}>
          Please select a property to view campaigns.
        </Typography>
      )}
      {!selectedOrganizationId && isMultiOrgManager && (
        <Typography sx={{ mt: 2 }}>
          Please select an organization to manage campaigns.
        </Typography>
      )}
    </Paper>
  );
};

export default OrgManagerCampaignsView;
