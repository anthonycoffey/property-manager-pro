import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Box,
  Typography,
  CircularProgress,
  LinearProgress, // Import LinearProgress
  IconButton, // Added for copy icon
  InputAdornment, // Added for copy icon
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; // Added for copy icon
import DownloadIcon from '@mui/icons-material/Download'; // Added for QR download button
// import { Timestamp } from 'firebase/firestore'; // Not needed directly if sending millis
import { getFunctions, httpsCallable } from 'firebase/functions'; // For calling Firebase functions
import { getStorage, ref as storageRef, uploadBytesResumable } from 'firebase/storage'; // For file uploads
import { QRCodeCanvas } from 'qrcode.react'; // Changed from QRCodeSVG to QRCodeCanvas
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import type { Property, Address } from '../../../types';

import { useAuth } from '../../../hooks/useAuth'; // To get current user for createdBy or storage paths
import { isAppError } from '../../../utils/errorUtils'; // For error handling

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string | null;
  propertyId: string | null;
  // onCampaignCreated: (campaignId: string) => void; // Callback after successful creation
}

type CampaignType = 'csv_import' | 'public_link';

const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({
  open,
  onClose,
  organizationId,
  propertyId,
  // onCampaignCreated,
}) => {
  // const { currentUser } = useAuth();
  const [campaignName, setCampaignName] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>('public_link');
  const [maxUses, setMaxUses] = useState<string>(''); // Store as string for TextField
  const [expiresAt, setExpiresAt] = useState<string>(''); // Store as string for TextField (YYYY-MM-DDTHH:mm)
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [accessUrl, setAccessUrl] = useState<string | null>(null); // For public_link success
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);


  useEffect(() => {
    const fetchProperty = async () => {
      if (organizationId && propertyId) {
        const docRef = doc(db, `organizations/${organizationId}/properties/${propertyId}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProperty(docSnap.data() as Property);
        }
      }
    };

    if (open) {
      fetchProperty();
      setCampaignName('');
      setCampaignType('public_link');
      setMaxUses('');
      setExpiresAt('');
      setCsvFile(null);
      setSelectedAddress('');
      setError(null);
      setSuccessMessage(null);
      setAccessUrl(null);
      setIsLoading(false);
      setUploadProgress(null);
    }
  }, [open, organizationId, propertyId]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setAccessUrl(null);
    setUploadProgress(null);

    if (!organizationId || !propertyId) {
      setError('Organization ID or Property ID is missing.');
      return;
    }
    if (!campaignName.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (campaignType === 'csv_import' && !csvFile) {
      setError('A CSV file is required for CSV Import campaigns.');
      return;
    }

    setIsLoading(true);

    try {
      const functions = getFunctions();
      const callCreateCampaign = httpsCallable(functions, 'createCampaign');
      
      let storageFilePath: string | undefined = undefined;

      if (campaignType === 'csv_import' && csvFile && currentUser?.uid) {
        setUploadProgress(0);
        const timestamp = Date.now();
        const filePath = `campaign_csvs_pending/${currentUser.uid}/${timestamp}_${csvFile.name}`;
        const fileRef = storageRef(getStorage(), filePath);
        
        const uploadTask = uploadBytesResumable(fileRef, csvFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            },
            (uploadError) => {
              console.error('Upload failed:', uploadError);
              setError(`CSV upload failed: ${uploadError.message}`);
              reject(uploadError);
            },
            async () => {
              storageFilePath = filePath; // Use the full path for the function
              console.log('File uploaded to:', storageFilePath);
              setUploadProgress(100);
              resolve();
            }
          );
        });

        if (!storageFilePath) { // Check if upload failed and path wasn't set
          setIsLoading(false);
          return; // Error already set by upload listener
        }
      }

      // Define a type for the parameters being sent to the Firebase function
      interface CreateCampaignFunctionParams {
        organizationId: string;
        propertyId: string;
        campaignName: string;
        campaignType: CampaignType; // Use existing CampaignType
        rolesToAssign: string[];
        maxUses?: number;
        expiresAt?: number; // timestamp in milliseconds
        storageFilePath?: string;
        sourceFileName?: string;
        address?: Address;
      }

      const params: CreateCampaignFunctionParams = {
        organizationId,
        propertyId,
        campaignName: campaignName.trim(),
        campaignType,
        rolesToAssign: ['resident'], // Hardcoded for now as per backend
      };

      if (maxUses) params.maxUses = parseInt(maxUses, 10);
      if (expiresAt) params.expiresAt = new Date(expiresAt).getTime();
      if (selectedAddress) {
        params.address = property?.addresses?.find(a => a.street === selectedAddress);
      }
      if (campaignType === 'csv_import') {
        params.storageFilePath = storageFilePath;
        params.sourceFileName = csvFile?.name;
      }
      
      const result = await callCreateCampaign(params);
      const resultData = result.data as { campaignId: string; accessUrl?: string };

      setSuccessMessage(`Campaign "${campaignName}" created successfully!`);
      if (campaignType === 'public_link' && resultData.accessUrl) {
        setAccessUrl(resultData.accessUrl);
      }
      // if (onCampaignCreated) {
      //   onCampaignCreated(resultData.campaignId);
      // }

    } catch (err) {
      console.error('Failed to create campaign:', err);
      if (isAppError(err)) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };
  const { currentUser } = useAuth(); // Moved here to satisfy hook rules

  return (
    <Dialog open={open} onClose={isLoading ? () => {} : onClose} fullWidth maxWidth="sm"> {/* Prevent close while loading */}
      <DialogTitle>Create New Invitation Campaign</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && (
            <Typography color="error" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
              {error}
            </Typography>
          )}
          {successMessage && !error && (
            <Typography color="primary.main" gutterBottom>
              {successMessage}
            </Typography>
          )}
          {accessUrl && campaignType === 'public_link' && !error && (
            <Box my={2}>
              <Typography variant="subtitle1" gutterBottom>Shareable Link & QR Code:</Typography>
              <TextField
                fullWidth
                value={accessUrl}
                variant="outlined"
                size="small"
                onClick={(e) => (e.target as HTMLInputElement).select()}
                helperText="Click field to select, then Ctrl+C/Cmd+C to copy, or use the icon."
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="copy shareable link"
                        onClick={() => {
                          if (accessUrl) {
                            navigator.clipboard.writeText(accessUrl)
                              .then(() => {
                                // Optionally: show a temporary "Copied!" message or change icon
                                console.log('Link copied to clipboard');
                              })
                              .catch(cpError => {
                                console.warn('Failed to copy link to clipboard:', cpError);
                              });
                          }
                        }}
                        edge="end"
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box mt={2} display="flex" flexDirection="column" alignItems="center">
                <QRCodeCanvas id="campaign-qr-code" value={accessUrl} size={128} level="H" />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    const canvas = document.getElementById('campaign-qr-code') as HTMLCanvasElement;
                    if (canvas) {
                      const pngUrl = canvas
                        .toDataURL('image/png')
                        .replace('image/png', 'image/octet-stream'); // Suggest download
                      const downloadLink = document.createElement('a');
                      downloadLink.href = pngUrl;
                      downloadLink.download = `campaign_qr_${campaignName.replace(/\s+/g, '_') || 'code'}.png`;
                      document.body.appendChild(downloadLink);
                      downloadLink.click();
                      document.body.removeChild(downloadLink);
                    }
                  }}
                  sx={{ mt: 1 }}
                >
                  Download QR Code
                </Button>
              </Box>
            </Box>
          )}

          {uploadProgress !== null && campaignType === 'csv_import' && (
            <Box sx={{ width: '100%', my: 1 }}>
              <Typography variant="caption" display="block" gutterBottom>
                Upload Progress: {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <TextField
            autoFocus
            margin="dense"
            id="campaignName"
            label="Campaign Name"
            type="text"
            fullWidth
            variant="outlined"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            required
            disabled={isLoading || !!successMessage} // Disable if success message is shown
          />

          <FormControl component="fieldset" margin="normal" disabled={isLoading || !!successMessage}>
            <FormLabel component="legend">Campaign Type</FormLabel>
            <RadioGroup
              row
              aria-label="campaign type"
              name="campaignType"
              value={campaignType}
              onChange={(e) => {
                setCampaignType(e.target.value as CampaignType);
                setCsvFile(null); // Reset file if type changes
                setError(null); // Clear errors related to file input
              }}
            >
              <FormControlLabel
                value="public_link"
                control={<Radio />}
                label="Public Link / QR Code"
              />
              <FormControlLabel
                value="csv_import"
                control={<Radio />}
                label="CSV Import"
              />
            </RadioGroup>
          </FormControl>

          {property?.addresses && (
            <FormControl fullWidth margin="dense" disabled={isLoading || !!successMessage}>
              <InputLabel id="address-select-label">Address</InputLabel>
              <Select
                labelId="address-select-label"
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(e.target.value)}
                label="Address"
              >
                {property.addresses.map((addr, index) => (
                  <MenuItem key={index} value={addr.street}>
                    {addr.street}, {addr.city}, {addr.state} {addr.zip}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {campaignType === 'csv_import' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  component="a"
                  href="/resident_invitation_template.csv"
                  download="resident_invitation_template.csv"
                  startIcon={<DownloadIcon />}
                  size="small"
                  sx={{ mb: 1, textTransform: 'none' }}
                >
                  Download CSV Template
                </Button>
              </Box>
              <TextField
                margin="dense"
                id="csvFile"
                type="file"
                fullWidth
                variant="outlined"
                onChange={handleFileChange}
                inputProps={{ accept: '.csv, text/csv' }}
                required
                disabled={isLoading || !!successMessage}
                helperText={csvFile ? `Selected: ${csvFile.name}` : 'Select a .csv file'}
              />
            </Box>
          )}

          <TextField
            margin="dense"
            id="maxUses"
            label="Max Uses (Optional)"
            type="number"
            fullWidth
            variant="outlined"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            inputProps={{ min: 0 }}
            disabled={isLoading || !!successMessage}
          />

          <TextField
            margin="dense"
            id="expiresAt"
            label="Expires At (Optional)"
            type="datetime-local" // HTML5 datetime-local input
            fullWidth
            variant="outlined"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={isLoading || !!successMessage}
          />
        </DialogContent>
        <DialogActions sx={{ pr: 3, pb: 2 }}>
          <Button onClick={isLoading ? () => {} : onClose} color="inherit" variant="outlined" disabled={isLoading}>
            {successMessage ? 'Close' : 'Cancel'}
          </Button>
          {!successMessage && ( // Only show Create button if no success message
             <Button type="submit" color="primary" variant="contained" disabled={isLoading}>
               {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Campaign'}
             </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateCampaignModal;
// Added LinearProgress for upload
// Moved currentUser hook call
// Made dialog unclosable while loading
// Made form fields uneditable on success
// Improved file input label/helper text
// Changed Cancel button to Close on success
// Hid Create button on success
