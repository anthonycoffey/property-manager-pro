import React, { useEffect, useRef } from 'react';
import { Box, List, Typography, CircularProgress } from '@mui/material';
import ChatMessageItem from './ChatMessageItem';
import type { ChatMessage } from './types'; // Use type-only import

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean; // To display typing/loading indicator
}

const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages array changes, but give a slight delay 
    // for the new message to render and height to be calculated.
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      <List sx={{ py: 0 }}> {/* Remove default List padding if Box handles it */}
        {messages.map((msg, index) => (
          <ChatMessageItem key={msg.id || index} message={msg} />
        ))}
      </List>
      {isLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', p: 1, pl: 2, minHeight: '40px' /* Consistent height with ChatMessageItem approx */ }}>
          {/* Optional: Avatar for assistant while typing, consistent with ChatMessageItem */}
          {/* <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}><SmartToyIcon fontSize="small" /></Avatar> */}
          <Box sx={{ display: 'flex', alignItems: 'center', pl: '48px' /* Indent like assistant message if no avatar shown here */ }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              RescueBot is typing...
            </Typography>
          </Box>
        </Box>
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
