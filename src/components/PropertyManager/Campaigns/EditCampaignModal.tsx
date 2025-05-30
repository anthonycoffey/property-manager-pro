import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebaseConfig';
import type { Campaign, CampaignActionResult } from '../../../types'; // Added AppError
import { isAppError } from '../../../utils/errorUtils'; // Import isAppError

interface EditCampaignModalProps {
  open: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onCampaignUpdated: () => void; // Callback to refresh list or show success
}

const EditCampaignModal: React.FC<EditCampaignModalProps> = ({
  open,
  onClose,
  campaign,
  onCampaignUpdated,
}) => {
  const [campaignName, setCampaignName] = useState('');
  const [maxUses, setMaxUses] = useState<number | null | string>(''); // string for TextField
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [useMaxUses, setUseMaxUses] = useState(false);
  const [useExpiresAt, setUseExpiresAt] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (campaign) {
      setCampaignName(campaign.campaignName);
      
      if (campaign.maxUses !== null && campaign.maxUses !== undefined) {
        setMaxUses(campaign.maxUses);
        setUseMaxUses(true);
      } else {
        setMaxUses('');
        setUseMaxUses(false);
      }

      if (campaign.expiresAt) {
        setExpiresAt(campaign.expiresAt.toDate());
        setUseExpiresAt(true);
      } else {
        setExpiresAt(null);
        setUseExpiresAt(false);
      }
    }
  }, [campaign]);

  const handleMaxUsesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setMaxUses(value === '' ? '' : Number(value));
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value) {
      setExpiresAt(new Date(event.target.value));
    } else {
      setExpiresAt(null);
    }
  };

  const handleSubmit = async () => {
    if (!campaign) return;
    setError(null);
    setLoading(true);

    const finalMaxUses = useMaxUses ? (maxUses === '' ? null : Number(maxUses)) : null;
    const finalExpiresAt = useExpiresAt && expiresAt ? Timestamp.fromDate(expiresAt) : null;

    if (campaignName.length < 3 || campaignName.length > 100) {
        setError("Campaign name must be between 3 and 100 characters.");
        setLoading(false);
        return;
    }
    if (useMaxUses && finalMaxUses !== null && (finalMaxUses < 1 || finalMaxUses > 10000)) {
        setError("Max uses must be between 1 and 10,000, or left blank for unlimited.");
        setLoading(false);
        return;
    }
    if (useMaxUses && finalMaxUses !== null && campaign.totalAccepted > finalMaxUses) {
        setError(`New max uses (${finalMaxUses}) cannot be less than current accepted count (${campaign.totalAccepted}).`);
        setLoading(false);
        return;
    }
    if (useExpiresAt && finalExpiresAt && finalExpiresAt.toMillis() < Date.now()) {
        setError("Expiration date must be in the future.");
        setLoading(false);
        return;
    }

    const updateData: {
        campaignId: string;
        organizationId: string;
        propertyId: string;
        campaignName?: string;
        maxUses?: number | null;
        expiresAt?: Timestamp | null;
    } = {
      campaignId: campaign.id,
      organizationId: campaign.organizationId,
      propertyId: campaign.propertyId,
      campaignName: campaignName !== campaign.campaignName ? campaignName : undefined,
      maxUses: (useMaxUses && finalMaxUses !== campaign.maxUses) || (!useMaxUses && campaign.maxUses !== null) ? finalMaxUses : undefined,
      expiresAt: (useExpiresAt && finalExpiresAt?.toMillis() !== campaign.expiresAt?.toMillis()) || (!useExpiresAt && campaign.expiresAt !== null) ? finalExpiresAt : undefined,
    };
    
    // Remove undefined fields so only changed values are sent
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);


    if (Object.keys(updateData).length <= 3) { // Only IDs are present, no actual changes
        setError("No changes detected.");
        setLoading(false);
        return;
    }


    try {
      const updateCampaignFunction = httpsCallable<typeof updateData, CampaignActionResult>(functions, 'updateCampaign');
      await updateCampaignFunction(updateData);
      onCampaignUpdated();
      onClose();
    } catch (err: unknown) {
      console.error('Error updating campaign:', err);
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('Failed to update campaign.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Campaign: {campaign?.campaignName}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="Campaign Name"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          fullWidth
          margin="normal"
          variant="outlined"
          required
          inputProps={{ minLength: 3, maxLength: 100 }}
        />

        <FormControlLabel
            control={<Checkbox checked={useMaxUses} onChange={(e) => setUseMaxUses(e.target.checked)} />}
            label="Set Maximum Uses"
        />
        {useMaxUses && (
            <TextField
                label="Max Uses (leave blank for unlimited)"
                type="number"
                value={maxUses === null ? '' : maxUses}
                onChange={handleMaxUsesChange}
                fullWidth
                margin="normal"
                variant="outlined"
                inputProps={{ min: 1, max:10000 }}
            />
        )}

        <FormControlLabel
            control={<Checkbox checked={useExpiresAt} onChange={(e) => setUseExpiresAt(e.target.checked)} />}
            label="Set Expiration Date"
        />
        {useExpiresAt && (
             <TextField
                label="Expires At"
                type="datetime-local"
                value={expiresAt ? expiresAt.toISOString().substring(0, 16) : ''}
                onChange={handleDateChange}
                fullWidth
                margin="normal"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
            />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="error" variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} color="primary" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditCampaignModal;
