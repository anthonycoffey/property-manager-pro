import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link as MuiLink,
  Button as MuiButton,
  IconButton,
} from '@mui/material';
import type { Job } from '../../types';
import { Phone, Sms } from '@mui/icons-material';

const formatDateTime = (isoString: string | null | undefined) => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleString();
  } catch (e) {
    console.error('Invalid Date', e);
    return 'Invalid Date';
  }
};

interface JobDetailsDisplayProps {
  job: Job | null;
}

const JobDetailsDisplay: React.FC<JobDetailsDisplayProps> = ({ job }) => {
  if (!job) {
    return <Typography>No job details available.</Typography>;
  }

  const {
    Customer: customer,
    Car: car,
    arrivalTime,
    Address: serviceAddress,
    JobLineItems: services,
    Invoices: invoices,
    dispatcher,
  } = job;

  const vehicleDisplay = car ? `${car.year} ${car.make} ${car.model}` : 'N/A';
  const relevantInvoice =
    invoices?.find((inv) => inv.status === 'pending') || invoices?.[0];
  const dispatchNumber = '+18444072723'; // Static as per Vue component

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        {/* Left Column: Customer & Service Info */}
        <Box sx={{ flex: 1, width: { xs: '100%', md: '50%' } }}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            {customer && (
              <Box mb={1}>
                <Typography variant='overline' display='block' gutterBottom>
                  Customer Name
                </Typography>
                <Typography variant='h6'>{customer.fullName}</Typography>
              </Box>
            )}
            {car && (
              <Box mb={1}>
                <Typography variant='overline' display='block' gutterBottom>
                  Vehicle
                </Typography>
                <Typography variant='h6'>{vehicleDisplay}</Typography>
              </Box>
            )}
            <Box mb={1}>
              <Typography variant='overline' display='block' gutterBottom>
                Arrival Time
              </Typography>
              <Typography variant='h6'>
                {formatDateTime(arrivalTime)}
              </Typography>
            </Box>
            {serviceAddress && (
              <Box mb={2}>
                <Typography variant='overline' display='block' gutterBottom>
                  Service Location
                </Typography>
                <Typography
                  variant='h6'
                  component='address'
                  sx={{ fontStyle: 'normal' }}
                >
                  {serviceAddress.short}
                </Typography>
              </Box>
            )}

            {services && services.length > 0 && (
              <TableContainer
                component={Paper}
                variant='outlined'
                sx={{ mb: 2 }}
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell align='right'>Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {services.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.Service?.name || 'N/A'}</TableCell>
                        <TableCell align='right'>
                          ${(item.price / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {relevantInvoice && (
                      <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
                        <TableCell align='right'>Total</TableCell>
                        <TableCell align='right'>
                          ${(relevantInvoice.total / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {relevantInvoice && (
              <MuiButton
                variant='contained'
                color='success'
                href={`https://staging--phoenix-ui.netlify.app/invoices/${relevantInvoice.linkCode}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                Pay Now
              </MuiButton>
            )}
          </Paper>
        </Box>

        {/* Right Column: Dispatcher Info */}
        <Box sx={{ flex: 1, width: { xs: '100%', md: '50%' } }}>
          <Paper elevation={1} sx={{ p: 2, height: '100%' }}>
            {dispatcher && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box>
                  <Typography variant='overline' display='block' gutterBottom>
                  Dispatcher
                  </Typography>
                  <Typography variant='h6' gutterBottom>
                  {dispatcher.fullName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                  <IconButton
                  component={dispatchNumber ? 'a' : 'button'}
                  aria-label='sms dispatcher'
                  disabled={!dispatchNumber}
                  href={dispatchNumber ? `sms:${dispatchNumber}` : undefined}
                  >
                  <Sms />
                  </IconButton>
                  <IconButton
                  component={dispatchNumber ? 'a' : 'button'}
                  aria-label='call dispatcher'
                  disabled={!dispatchNumber}
                  href={dispatchNumber ? `tel:${dispatchNumber}` : undefined}
                  >
                  <Phone />
                  </IconButton>
                </Box>
                </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Badges Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          my: 3,
          py: 2,
          borderTop: '1px solid #eee',
          borderBottom: '1px solid #eee',
        }}
      >
        <img
          src='/review3.png'
          alt='Satisfaction Guaranteed'
          style={{ maxWidth: '100px', height: 'auto' }}
        />
        <img
          src='/review2.png'
          alt='Years Experience'
          style={{ maxWidth: '100px', height: 'auto' }}
        />
        <img
          src='/review1.png'
          alt='Star Rating'
          style={{ maxWidth: '100px', height: 'auto' }}
        />
      </Box>

      {/* Footer Section: Compliance Text */}
      <Box
        sx={{
          fontSize: '0.75rem',
          color: 'text.secondary',
          textAlign: 'center',
          mt: 2,
        }}
      >
        <Typography variant='body2' gutterBottom sx={{ fontWeight: 'bold' }}>
          We value your privacy and adhere to strict industry standards for
          payment processing!
        </Typography>
        <ul
          style={{
            listStyleType: 'disc',
            paddingLeft: '20px',
            textAlign: 'left',
            display: 'inline-block',
          }}
        >
          <li>
            128-bit Secure Sockets Layer (SSL) technology for secure Internet
            Protocol (IP) transactions.
          </li>
          <li>
            Industry leading encryption hardware and software methods and
            security protocols to protect customer information.
          </li>
          <li>
            Compliance with the Payment Card Industry Data Security Standard
            (PCI DSS).
          </li>
        </ul>
        <Typography variant='body2' sx={{ mt: 2 }}>
          For more details, please review our company's {}
          <MuiLink
            href='https://24hrcarunlocking.com/terms-and-conditions/'
            target='_blank'
            rel='noopener noreferrer'
          >
            Terms and Conditions
          </MuiLink>
          {} and {}
          <MuiLink
            href='https://24hrcarunlocking.com/privacy-policy/'
            target='_blank'
            rel='noopener noreferrer'
          >
            Privacy Policy
          </MuiLink>
          .
        </Typography>
        <Typography variant='body2' sx={{ mt: 1 }}>
          For additional information regarding the privacy of your sensitive
          cardholder data, please refer to Authorize.Net's {}
          <MuiLink
            href='http://www.authorize.net/company/privacy/'
            target='_blank'
            rel='noopener noreferrer'
          >
            Privacy Policy
          </MuiLink>
          {} and {}
          <MuiLink
            href='https://www.authorize.net/about-us/terms.html'
            target='_blank'
            rel='noopener noreferrer'
          >
            Terms of Use
          </MuiLink>
          .
        </Typography>
      </Box>
    </Box>
  );
};

export default JobDetailsDisplay;
