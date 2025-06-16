import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Rating,
  IconButton,
  useTheme,
  Stack,
} from '@mui/material';
import { KeyboardArrowLeft, KeyboardArrowRight } from '@mui/icons-material';

interface Review {
  quote: string;
  author: string;
  authorRole: string;
}

interface ResidentReviewSliderProps {
  reviews: Review[];
}

const ResidentReviewSlider: React.FC<ResidentReviewSliderProps> = ({
  reviews,
}) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const maxSteps = reviews.length;
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep + 1) % maxSteps);
  };

  const handleBack = () => {
    setActiveStep(
      (prevActiveStep) => (prevActiveStep - 1 + maxSteps) % maxSteps
    );
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  const [direction, setDirection] = useState(0);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    if (newDirection > 0) {
      handleNext();
    } else {
      handleBack();
    }
  };

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        paginate(1);
      }, 5000);
    }
  }, [isPaused, paginate]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeStep, isPaused, resetTimer]);

  if (!reviews || reviews.length === 0) {
    return null;
  }

  const activeReview = reviews[activeStep];

  return (
    <Box
      sx={{
        maxWidth: 400,
        flexGrow: 1,
        margin: 'auto',
        position: 'relative',
        minHeight: 220,
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={activeStep}
          custom={direction}
          variants={variants}
          initial='enter'
          animate='center'
          exit='exit'
          transition={{
            x: { type: 'spring', stiffness: 200, damping: 25 },
            opacity: { duration: 0.4 },
          }}
          drag='x'
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(_e, { offset, velocity }) => {
            const swipe = Math.abs(offset.x) * velocity.x;

            if (swipe < -10000) {
              paginate(1);
            } else if (swipe > 10000) {
              paginate(-1);
            }
            resetTimer();
          }}
          style={{ position: 'absolute', width: '100%' }}
        >
          <Card
            elevation={4}
            sx={{
              p: 2,
              backgroundColor: theme.palette.background.paper,
              borderRadius: 2,
              minHeight: 180,
            }}
          >
            <CardContent>
              <Stack direction='row' spacing={2} alignItems='center' mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {activeReview.author.charAt(0)}
                </Avatar>
                <Box>
                  <Typography
                    variant='subtitle1'
                    component='div'
                    fontWeight='bold'
                  >
                    {activeReview.author}
                  </Typography>
                  <Rating name='read-only' value={5} readOnly size='small' />
                </Box>
              </Stack>
              <Typography variant='body1' color='text.secondary'>
                "{activeReview.quote}"
              </Typography>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <Stack
        direction='row'
        justifyContent='center'
        alignItems='center'
        spacing={2}
        sx={{ position: 'absolute', bottom: 0, width: '100%' }}
      >
        <IconButton
          onClick={() => {
            paginate(-1);
            resetTimer();
          }}
          size='medium'
          disabled={maxSteps <= 1}
        >
          <KeyboardArrowLeft />
        </IconButton>
        <Stack direction='row' justifyContent='center' spacing={1}>
          {reviews.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor:
                  activeStep === index ? 'primary.main' : 'action.disabled',
                cursor: 'pointer',
                transition: 'background-color 0.3s',
              }}
              onClick={() => {
                setDirection(index > activeStep ? 1 : -1);
                setActiveStep(index);
                resetTimer();
              }}
            />
          ))}
        </Stack>
        <IconButton
          onClick={() => {
            paginate(1);
            resetTimer();
          }}
          size='medium'
          disabled={maxSteps <= 1}
        >
          <KeyboardArrowRight />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default ResidentReviewSlider;
