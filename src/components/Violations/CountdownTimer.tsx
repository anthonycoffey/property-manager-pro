import React, { useState, useEffect } from 'react';
import { Chip } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import { Timestamp } from 'firebase/firestore';

interface CountdownTimerProps {
  createdAt: Date | Timestamp | { _seconds: number; _nanoseconds: number };
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ createdAt }) => {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const fiveMinutes = 5 * 60 * 1000;
      let startTime: number;

      if (createdAt instanceof Date) {
        startTime = createdAt.getTime();
      } else if (createdAt instanceof Timestamp) {
        startTime = createdAt.toMillis();
      } else {
        startTime =
          createdAt._seconds * 1000 + createdAt._nanoseconds / 1000000;
      }

      const expirationTime = startTime + fiveMinutes;
      const difference = expirationTime - new Date().getTime();

      if (difference > 0) {
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds
          .toString()
          .padStart(2, '0')}`;
      }
      return null; // Return null when time is up
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Set initial value
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [createdAt]);

  if (timeLeft === null) {
    return (
      <Chip
        icon={<TimerIcon />}
        label="No time remaining"
        color="error"
        variant="outlined"
      />
    );
  }

  return (
    <Chip
      icon={<TimerIcon />}
      label={`Time until tow: ${timeLeft}`}
      color="warning"
      variant="filled"
    />
  );
};

export default CountdownTimer;
