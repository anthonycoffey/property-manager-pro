import React from 'react';
import { Box, Paper, Typography, Avatar, ListItem } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // Bot icon
import ReportProblemIcon from '@mui/icons-material/ReportProblem'; // For system notifications
import type { ChatMessage } from './types'; // Adjusted import path with type-only import

interface ChatMessageItemProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystemNotification = message.role === 'system_notification';

  let avatar: React.ReactNode = null; // Changed type to React.ReactNode
  let bubbleBgColor = 'background.paper';
  let bubbleColor = 'text.primary';
  let borderRadiusStyle = '10px';

  if (isUser) {
    avatar = (
      <Avatar sx={{ bgcolor: 'secondary.main', ml: 1 }}>
        <PersonIcon />
      </Avatar>
    );
    bubbleBgColor = 'primary.light'; 
    bubbleColor = 'primary.contrastText';
    borderRadiusStyle = '10px 10px 0 10px';
  } else if (isAssistant) {
    avatar = (
      <Avatar sx={{ bgcolor: 'primary.main', mr: 1 }}>
        <SmartToyIcon />
      </Avatar>
    );
    // bubbleBgColor = (theme) => theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[100]; // Theme-aware example
    borderRadiusStyle = '10px 10px 10px 0';
  } else if (isSystemNotification) {
    avatar = (
      <Avatar sx={{ bgcolor: 'warning.main', mr: 1 }}>
        <ReportProblemIcon />
      </Avatar>
    );
    bubbleBgColor = 'warning.light';
    bubbleColor = 'warning.contrastText';
    borderRadiusStyle = '10px';
  }

  return (
    <ListItem 
      sx={{ 
        display: 'flex', 
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 1.5,
        px: 0, 
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '80%' }}>
        {!isUser && avatar}
        <Paper 
          elevation={1} 
          sx={{ 
            p: 1.5, 
            bgcolor: bubbleBgColor, 
            color: bubbleColor,
            borderRadius: borderRadiusStyle,
            wordBreak: 'break-word', 
          }}
        >
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
          {message.timestamp && (
            <Typography 
              variant="caption" 
              display="block" 
              sx={{ 
                textAlign: 'right', 
                mt: 0.5, 
                opacity: 0.7,
                color: isUser || isSystemNotification ? 'inherit' : 'text.secondary', 
              }}
            >
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
        </Paper>
        {isUser && avatar}
      </Box>
    </ListItem>
  );
};

export default ChatMessageItem;
