import React from 'react';
import {
  Box,
  Container,
  Stack,
  Typography,
  Link,
  useTheme,
} from '@mui/material';

const Footer: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      component='footer'
      sx={{
        py: 4,
        px: 2,
        mt: 'auto',
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
      }}
    >
      <Container maxWidth='lg'>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 4, md: 2 }}
          justifyContent='space-between'
          // alignItems='center'
        >
          {/* Links Section */}
          <Stack
            spacing={1}
            alignItems={{ xs: 'flex-start', md: 'flex-start' }}
          >
            <Typography variant='h6' gutterBottom>
              Property Manager Pro
            </Typography>
            <ul>
              <li>
                {' '}
                <Link href='#' color='inherit' underline='hover'>
                  Privacy Policy
                </Link>
              </li>
              <li>
                {' '}
                <Link href='#' color='inherit' underline='hover'>
                  Terms of Service
                </Link>
              </li>
            </ul>
          </Stack>

          {/* Social Proof Images Section */}
          <Stack
            direction='row'
            spacing={8}
            alignItems='center'
            justifyContent='space-between'
          >
            <Box
              component='img'
              src='/review1.png'
              alt='Social proof review 1'
              sx={{
                width: { xs: 100, lg: 180 },
                height: 'auto',
                borderRadius: 1,
              }}
            />

            <Box
              component='img'
              src='/review2.png'
              alt='Social proof review 2'
              sx={{
                width: { xs: 100, lg: 180 },
                height: 'auto',
                borderRadius: 1,
              }}
            />
            <Box
              component='img'
              src='/review3.png'
              alt='Social proof review 3'
              sx={{
                width: { xs: 100, lg: 180 },
                height: 'auto',
                borderRadius: 1,
              }}
            />
          </Stack>
        </Stack>
        <Typography variant='body2' sx={{ pt: 4, textAlign: { xs: 'center' } }}>
          © {new Date().getFullYear()} Property Manager Pro. All rights
          reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
