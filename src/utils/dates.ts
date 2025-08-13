import { Timestamp } from 'firebase/firestore';

// A simplified version of a relative time formatter.
// For a more robust solution, a library like `date-fns` would be ideal.
export const formatRelativeTime = (date: Date | Timestamp | undefined): string => {
  if (!date) {
    return '';
  }

  const d = date instanceof Timestamp ? date.toDate() : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  return d.toLocaleDateString();
};
