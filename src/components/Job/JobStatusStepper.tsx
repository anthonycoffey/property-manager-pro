import React from 'react';
import { Stepper, Step, StepLabel, Box } from '@mui/material';

interface JobStatusStepperProps {
  currentStep: number;
}

const steps = ['Dispatched', 'In Progress', 'Completed']; // Example steps

const JobStatusStepper: React.FC<JobStatusStepperProps> = ({ currentStep }) => {
  console.log({ currentStep });
  // Adjust activeStep to be 0-indexed for the Stepper component
  // If currentStep is 1, activeStep is 0. If currentStep is 0 (e.g. canceled), show no active step or a specific state.
  const activeStep = currentStep > 0 ? currentStep - 1 : -1; // -1 means no step is active

  return (
    <Box sx={{ width: '100%', my: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
};

export default JobStatusStepper;
