import React, { useEffect, useRef, useState } from 'react';
import { Box, List, Typography, CircularProgress } from '@mui/material';
import ChatMessageItem from './ChatMessageItem';
import type { ChatMessage } from './types'; // Use type-only import

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean; // To display typing/loading indicator
}

const loadingWords = [
  'cooking',
  'thinking',
  'searching',
  'vibing',
  'working',
  'looking',
  'checking',
];

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentLoadingWord, setCurrentLoadingWord] = useState('');

  useEffect(() => {
    if (isLoading) {
      const randomIndex = Math.floor(Math.random() * loadingWords.length);
      setCurrentLoadingWord(loadingWords[randomIndex]);
    } else {
      setCurrentLoadingWord(''); // Clear word when not loading
    }
  }, [isLoading]); // Rerun effect when isLoading changes

  useEffect(() => {
    // Only scroll when there are more than 3 messages
    if (messages.length > 3) {
      // Scroll to bottom when messages array changes, but give a slight delay
      // for the new message to render and height to be calculated.
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      <List sx={{ py: 0 }}>
        {' '}
        {/* Remove default List padding if Box handles it */}
        {messages.map((msg, index) => (
          <ChatMessageItem key={msg.id || index} message={msg} />
        ))}
      </List>
      {isLoading && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            p: 1,
            pl: 2,
            minHeight:
              '40px' /* Consistent height with ChatMessageItem approx */,
          }}
        >
          {/* Optional: Avatar for assistant while typing, consistent with ChatMessageItem */}
          {/* <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}><SmartToyIcon fontSize="small" /></Avatar> */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              pl: '48px' /* Indent like assistant message if no avatar shown here */,
            }}
          >
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant='caption' color='text.secondary'>
              RescueBot is {currentLoadingWord}...
            </Typography>
          </Box>
        </Box>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
