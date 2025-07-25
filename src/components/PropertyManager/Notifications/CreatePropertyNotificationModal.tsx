import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isAppError } from '../../../utils/errorUtils';

const functions = getFunctions();
const createPropertyNotificationCallable = httpsCallable(
  functions,
  'createPropertyNotification'
);

const notificationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
  licensePlate: z.string().optional(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface CreatePropertyNotificationModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  propertyId: string;
}

const CreatePropertyNotificationModal: React.FC<
  CreatePropertyNotificationModalProps
> = ({ open, onClose, organizationId, propertyId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: '',
      message: '',
      licensePlate: '',
    },
  });

  const onSubmit = async (data: NotificationFormData) => {
    setLoading(true);
    setError(null);

    const { title, message, licensePlate } = data;
    const vehicleData = licensePlate ? { licensePlate } : null;

    try {
      await createPropertyNotificationCallable({
        organizationId,
        propertyId,
        notification: {
          title,
          message,
          ...(vehicleData && { vehicle: vehicleData }),
        },
      });
      reset();
      onClose();
    } catch (err) {
      console.error('Error creating property notification:', err);
      if (isAppError(err)) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Property Notification</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Title"
                  fullWidth
                  required
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
              )}
            />
            <Controller
              name="message"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Message"
                  fullWidth
                  required
                  multiline
                  rows={4}
                  error={!!errors.message}
                  helperText={errors.message?.message}
                />
              )}
            />
            <Controller
              name="licensePlate"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="License Plate (Optional)"
                  fullWidth
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreatePropertyNotificationModal;
