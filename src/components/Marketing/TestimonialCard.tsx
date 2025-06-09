import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Rating,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

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
      sx={{
      maxWidth: { xs: '100%', lg: '50%' },
      m: 2,
      boxShadow: 3,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%', // Ensure cards in a row have same height
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', mb: 1.5 }}>
          <Rating
            name='testimonial-rating'
            value={5}
            readOnly
            precision={0.5}
            emptyIcon={
              <StarIcon style={{ opacity: 0.55 }} fontSize='inherit' />
            }
          />
        </Box>
        <Typography
          variant='body1'
          component='p'
          sx={{ fontStyle: 'italic', mb: 2 }}
        >
          "{quote}"
        </Typography>
      </CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pt: 0 }}>
        {avatarUrl ? (
          <Avatar src={avatarUrl} alt={author} sx={{ mr: 1.5 }} />
        ) : (
          <Avatar sx={{ mr: 1.5, bgcolor: 'primary.main' }}>
            {author.substring(0, 1).toUpperCase()}
          </Avatar>
        )}
        <Box>
          <Typography
            variant='subtitle2'
            component='div'
            sx={{ fontWeight: 'bold' }}
          >
            {author}
          </Typography>
          {authorRole && (
            <Typography variant='caption' color='text.secondary'>
              {authorRole}
            </Typography>
          )}
        </Box>
      </Box>
    </Card>
  );
};

export default TestimonialCard;
