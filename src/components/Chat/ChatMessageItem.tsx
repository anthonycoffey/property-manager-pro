import React from 'react';
import { Box, Paper, Typography, Avatar, ListItem, useTheme } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import type { ChatMessage } from './types';

interface ChatMessageItemProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystemNotification = message.role === 'system_notification';
  const theme = useTheme();

  let avatar: React.ReactNode = null;
  let bubbleBgColor: string;
  let bubbleColor: string;
  let borderRadiusStyle = '10px';

  if (isUser) {
    avatar = (
      <Avatar sx={{ bgcolor: theme.palette.secondary.main, ml: 1, top: 10}}>
        <PersonIcon />
      </Avatar>
    );
    bubbleBgColor = theme.palette.primary.main;
    bubbleColor = theme.palette.primary.contrastText;
    borderRadiusStyle = '10px 10px 0 10px';
  } else if (isAssistant) {
    avatar = (
      <Avatar
        src='/mcu-logo-small.png'
        alt='Assistant'
        sx={{
          bgcolor: theme.palette.primary.main,
          mr: 1,
          top: 12,
        }}
      />
    );
    bubbleBgColor =
      theme.palette.mode === 'dark'
        ? theme.palette.grey[700]
        : theme.palette.grey[100];
    bubbleColor = theme.palette.text.primary;
    borderRadiusStyle = '10px 10px 10px 0';
  } else if (isSystemNotification) {
    avatar = (
      <Avatar sx={{ bgcolor: theme.palette.warning.main, mr: 1 }}>
        <ReportProblemIcon />
      </Avatar>
    );
    bubbleBgColor = theme.palette.warning.light;
    bubbleColor = theme.palette.warning.contrastText;
    borderRadiusStyle = '10px';
  } else {
    bubbleBgColor =
      theme.palette.mode === 'dark'
        ? theme.palette.grey[700]
        : theme.palette.grey[100];
    bubbleColor = theme.palette.text.primary;
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
          variant='outlined'
          elevation={5}
          sx={{
            p: 1.5,
            bgcolor: bubbleBgColor,
            color: bubbleColor,
            borderRadius: borderRadiusStyle,
            wordBreak: 'break-word',
            borderColor:
              isSystemNotification
                ? theme.palette.warning.main
                : theme.palette.divider,
          }}
        >
          <Typography variant='body1' sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
          {message.timestamp && (
            <Typography
              variant='caption'
              display='block'
              sx={{
                textAlign: 'right',
                mt: 0.5,
                opacity: 0.7,
                color:
                  isUser || isSystemNotification
                    ? bubbleColor
                    : theme.palette.text.secondary,
              }}
            >
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          )}
        </Paper>
        {isUser && avatar}
      </Box>
    </ListItem>
  );
};

export default ChatMessageItem;
