import React, { useState } from 'react';
import {
  Typography,
  Button,
  // IconButton,
  // Drawer,
  // List,
  // ListItem,
  // ListItemButton,
  // ListItemIcon,
  // ListItemText,
  Box,
  Container,
  Paper,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  RadioGroup,
  Radio,
  Slider,
  Switch,
  Rating,
  Autocomplete,
  Chip,
  Avatar,
  Badge,
  Tooltip,
  Divider,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Snackbar,
  Alert,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  CssBaseline,
  useTheme,
  Popover,
  Backdrop,
  Popper,
  Fade,
  ClickAwayListener,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MailIcon from '@mui/icons-material/Mail';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StarIcon from '@mui/icons-material/Star';

const DemoPage: React.FC = () => {
  const theme = useTheme();

  // --- State for Interactive Components ---
  const [textFieldValue, setTextFieldValue] = useState('');
  const [selectValue, setSelectValue] = useState('option1');
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [radioValue, setRadioValue] = useState('male');
  const [sliderValue, setSliderValue] = useState(50);
  const [switchChecked, setSwitchChecked] = useState(true);
  const [ratingValue, setRatingValue] = useState<number | null>(3);
  const autocompleteOptions = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [popoverAnchorEl, setPopoverAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [openBackdrop, setOpenBackdrop] = useState(false);
  const [popperAnchorEl, setPopperAnchorEl] = useState<null | HTMLElement>(null);
  const [openPopper, setOpenPopper] = useState(false);


  const handleSnackbarClose = () => setOpenSnackbar(false);
  const handleDialogOpen = () => setOpenDialog(true);
  const handleDialogClose = () => setOpenDialog(false);

  const handlePopoverOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setPopoverAnchorEl(event.currentTarget);
  };
  const handlePopoverClose = () => {
    setPopoverAnchorEl(null);
  };
  const openPopover = Boolean(popoverAnchorEl);

  const handleBackdropClose = () => {
    setOpenBackdrop(false);
  };
  const handleBackdropToggle = () => {
    setOpenBackdrop(!openBackdrop);
  };

  const handlePopperClick = (event: React.MouseEvent<HTMLElement>) => {
    setPopperAnchorEl(event.currentTarget);
    setOpenPopper((previousOpen) => !previousOpen);
  };

  const handlePopperClose = () => {
    setOpenPopper(false);
  };


  const tableRows = [
    { id: 1, name: 'Frozen yoghurt', calories: 159, fat: 6.0 },
    { id: 2, name: 'Ice cream sandwich', calories: 237, fat: 9.0 },
    { id: 3, name: 'Eclair', calories: 262, fat: 16.0 },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: theme.spacing(4) }}>
      <CssBaseline />
      <Typography variant="h3" component="h1" gutterBottom sx={{ color: theme.palette.primary.main, textAlign: 'center', mb: theme.spacing(4) }}>
        MUI Component Showcase
      </Typography>

      {/* Section: Basic Inputs */}
      <Paper elevation={3} sx={{ p: theme.spacing(3), mb: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom sx={{ color: theme.palette.secondary.main, mb: theme.spacing(2) }}>
          Input Components
        </Typography>
        <Stack spacing={3}>
          <TextField
            label="Text Field"
            variant="outlined"
            fullWidth
            value={textFieldValue}
            onChange={(e) => setTextFieldValue(e.target.value)}
            helperText="Enter some text"
          />
          <Select
            value={selectValue}
            onChange={(e) => setSelectValue(e.target.value)}
            fullWidth
            variant="outlined"
            displayEmpty
          >
            <MenuItem value="option1">Option 1</MenuItem>
            <MenuItem value="option2">Option 2</MenuItem>
          </Select>
          <FormControlLabel
            control={
              <Checkbox
                checked={checkboxChecked}
                onChange={(e) => setCheckboxChecked(e.target.checked)}
                color="primary"
              />
            }
            label="Checkbox"
          />
          <RadioGroup row value={radioValue} onChange={(e) => setRadioValue(e.target.value)}>
            <FormControlLabel value="male" control={<Radio />} label="Male" />
            <FormControlLabel value="female" control={<Radio />} label="Female" />
          </RadioGroup>
          <Box>
            <Typography gutterBottom>Slider</Typography>
            <Slider
              value={sliderValue}
              onChange={(_event, newValue) => setSliderValue(newValue as number)}
              aria-labelledby="input-slider"
              valueLabelDisplay="auto"
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={switchChecked}
                onChange={(e) => setSwitchChecked(e.target.checked)}
                color="primary"
              />
            }
            label="Switch"
          />
          <Box>
            <Typography gutterBottom>Rating</Typography>
            <Rating
              name="simple-controlled"
              value={ratingValue}
              onChange={(_event, newValue) => {
                setRatingValue(newValue);
              }}
              emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
            />
          </Box>
          <Autocomplete
            options={autocompleteOptions}
            renderInput={(params) => <TextField {...params} label="Autocomplete" variant="outlined" />}
            fullWidth
          />
          <Button variant="contained" color="primary" onClick={() => alert('Button Clicked!')}>
            Contained Button
          </Button>
          <Button variant="outlined" color="secondary">
            Outlined Button
          </Button>
        </Stack>
      </Paper>

      <Divider sx={{ my: theme.spacing(4) }} />

      {/* Section: Display & Layout */}
      <Paper elevation={3} sx={{ p: theme.spacing(3), mb: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom sx={{ color: theme.palette.secondary.main, mb: theme.spacing(2) }}>
          Display & Layout
        </Typography>
        <Stack spacing={3} direction={{ xs: 'column', sm: 'row' }} alignItems="flex-start">
          <Card sx={{ minWidth: 275, flex: 1 }}>
            <CardMedia
              component="img"
              height="140"
              image="https://picsum.photos/id/10/300/140" // Example ID 10
              alt="Random Image"
            />
            <CardContent>
              <Typography gutterBottom variant="h6" component="div">
                Card Title
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This is a sample card demonstrating MUI Card component with media, content, and actions.
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small" color="primary">Share</Button>
              <Button size="small" color="primary">Learn More</Button>
            </CardActions>
          </Card>
          <Stack spacing={2} alignItems="center" sx={{ flex: 1, justifyContent: 'center' }}>
            <Avatar sx={{ bgcolor: theme.palette.primary.light, color: theme.palette.primary.contrastText }}>JD</Avatar>
            <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
              <MenuIcon />
            </Avatar>
            <Chip label="Primary Chip" color="primary" />
            <Chip label="Secondary Chip" color="secondary" variant="outlined" />
            <Badge badgeContent={4} color="error">
              <MailIcon color="action" />
            </Badge>
            <Badge badgeContent={100} color="primary" max={99}>
              <NotificationsIcon color="action" />
            </Badge>
            <Tooltip title="This is a tooltip!" arrow>
              <Button variant="text">Hover for Tooltip</Button>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      <Divider sx={{ my: theme.spacing(4) }} />

      {/* Section: Feedback */}
      <Paper elevation={3} sx={{ p: theme.spacing(3), mb: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom sx={{ color: theme.palette.secondary.main, mb: theme.spacing(2) }}>
          Feedback Components
        </Typography>
        <Stack spacing={3}>
          <Alert severity="success">This is a success alert — check it out!</Alert>
          <Alert severity="info">This is an info alert!</Alert>
          <Alert severity="warning">This is a warning alert!</Alert>
          <Alert severity="error">This is an error alert!</Alert>
          <Button variant="contained" onClick={() => setOpenSnackbar(true)}>
            Open Snackbar
          </Button>
          <Snackbar
            open={openSnackbar}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            message="Snackbar message!"
            action={
              <Button color="secondary" size="small" onClick={handleSnackbarClose}>
                UNDO
              </Button>
            }
          />
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: theme.spacing(2) }}>
            <CircularProgress />
            <CircularProgress color="secondary" />
          </Box>
          <LinearProgress />
          <LinearProgress color="secondary" variant="determinate" value={60} />
          <Button variant="outlined" onClick={handleDialogOpen}>
            Open Dialog
          </Button>
          <Dialog open={openDialog} onClose={handleDialogClose}>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogContent>
              <Typography>
                This is a simple dialog. It can contain forms, information, or actions.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDialogClose} color="primary">Cancel</Button>
              <Button onClick={handleDialogClose} color="primary" autoFocus>
                Agree
              </Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </Paper>


      <Divider sx={{ my: theme.spacing(4) }} />

      {/* Section: Data Display */}
      <Paper elevation={3} sx={{ p: theme.spacing(3), mb: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom sx={{ color: theme.palette.secondary.main, mb: theme.spacing(2) }}>
          Data Display (Table)
        </Typography>
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
          <Table aria-label="simple table">
            <TableHead sx={{ backgroundColor: theme.palette.action.hover }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Dessert (100g serving)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Calories</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>Fat&nbsp;(g)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: theme.palette.action.selected } }}
                >
                  <TableCell component="th" scope="row">
                    {row.name}
                  </TableCell>
                  <TableCell align="right">{row.calories}</TableCell>
                  <TableCell align="right">{row.fat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Divider sx={{ my: theme.spacing(4) }} />

      {/* Section: Helpers & Overlays */}
      <Paper elevation={3} sx={{ p: theme.spacing(3), mb: theme.spacing(4) }}>
        <Typography variant="h5" gutterBottom sx={{ color: theme.palette.secondary.main, mb: theme.spacing(2) }}>
          Helpers & Overlays
        </Typography>
        <Stack spacing={3}>


          {/* Popover Example */}
          <Box>
            <Typography variant="h6" gutterBottom>Popover</Typography>
            <Button aria-describedby={openPopover ? 'simple-popover' : undefined} variant="contained" onClick={handlePopoverOpen}>
              Open Popover
            </Button>
            <Popover
              id={openPopover ? 'simple-popover' : undefined}
              open={openPopover}
              anchorEl={popoverAnchorEl}
              onClose={handlePopoverClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
            >
              <Typography sx={{ p: 2 }}>The content of the Popover.</Typography>
            </Popover>
          </Box>

          {/* Backdrop Example */}
          <Box>
            <Typography variant="h6" gutterBottom>Backdrop</Typography>
            <Button onClick={handleBackdropToggle}>Show Backdrop</Button>
            <Backdrop
              sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
              open={openBackdrop}
              onClick={handleBackdropClose}
            >
              <CircularProgress color="inherit" />
            </Backdrop>
          </Box>

          {/* Popper Example */}
          <Box>
            <Typography variant="h6" gutterBottom>Popper</Typography>
            <ClickAwayListener onClickAway={handlePopperClose}>
              <div>
                <Button aria-describedby="fade-popper" type="button" onClick={handlePopperClick}>
                  Toggle Popper
                </Button>
                <Popper id="fade-popper" open={openPopper} anchorEl={popperAnchorEl} transition>
                  {({ TransitionProps }) => (
                    <Fade {...TransitionProps} timeout={350}>
                      <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid' }}>
                        <Typography>The content of the Popper.</Typography>
                      </Paper>
                    </Fade>
                  )}
                </Popper>
              </div>
            </ClickAwayListener>
          </Box>
        </Stack>
      </Paper>

    </Container>
  );
};

export default DemoPage;
