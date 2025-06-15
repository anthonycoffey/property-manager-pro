import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Rating,
  Stack,
} from '@mui/material';

interface TestimonialCardProps {
  quote: string;
  author: string;
  avatarUrl?: string;
  authorRole?: string; // Optional role/company
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  quote,
  author,
  avatarUrl,
  authorRole,
}) => {
  return (
    <Card
      elevation={4}
      sx={{
        p: 2,
        borderRadius: 2,
        maxWidth: 500,
      }}
    >
      <CardContent>
        <Stack direction='row' spacing={2} alignItems='center' mb={2}>
          {avatarUrl ? (
            <Avatar src={avatarUrl} alt={author} />
          ) : (
            <Avatar sx={{ bgcolor: 'primary.main' }}>{author.charAt(0)}</Avatar>
          )}
          <Stack direction='column' alignItems='flex-start'>
            <Typography variant='subtitle1' component='div' fontWeight='bold'>
              {author}
            </Typography>
            {authorRole && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mb: 0.5 }}
              >
                {authorRole}
              </Typography>
            )}
            <Rating name='read-only' value={5} readOnly size='small' />
          </Stack>
        </Stack>
        <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
          "{quote}"
        </Typography>
      </CardContent>
    </Card>
  );
};

export default TestimonialCard;
