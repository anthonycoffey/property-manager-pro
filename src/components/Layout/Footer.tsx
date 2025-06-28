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
        py: 8,
        px: { xs: 1, md: 2 },
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
            spacing={{ xs: 2, sm: 4, md: 10 }}
            alignItems='flex-end'
            justifyContent={{ xs: 'center', sm: 'flex-end' }}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              mt: { xs: 3, sm: 0 },
              mb: { xs: 2, sm: 0 },
              flexWrap: 'wrap',
            }}
          >
            <Box
              component='img'
              src='/review2.png'
              alt='Social proof review 2'
              sx={{
                width: '100%',
                maxWidth: { xs: 80, sm: 120, md: 150 },
                height: 'auto',
                borderRadius: 1,
                mb: 0,
                mx: { xs: 'auto', sm: 0 },
              }}
            />
            <Box
              component='img'
              src='/review1.png'
              alt='Social proof review 1'
              sx={{
                width: '100%',
                maxWidth: { xs: 80, sm: 120, md: 150 },
                height: 'auto',
                borderRadius: 1,
                mb: 0,
                mx: { xs: 'auto', sm: 0 },
              }}
            />
            <Box
              component='img'
              src='/review3.png'
              alt='Social proof review 3'
              sx={{
                width: '100%',
                maxWidth: { xs: 80, sm: 120, md: 150 },
                height: 'auto',
                borderRadius: 1,
                mx: { xs: 'auto', sm: 0 },
              }}
            />
          </Stack>
        </Stack>
        <Typography
        component={'div'}
          variant='body2'
          sx={{ pt: 4, textAlign: { xs: 'center' } }}
        >
          © {new Date().getFullYear()} All rights
          reserved.  24HR Car Unlocking Emergency Roadside Services
        </Typography>        
        <Typography
        component={'div'}
          variant='body2'
          sx={{  textAlign: { xs: 'center' } }}
        >
          Locksmith License #: B26277801
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
