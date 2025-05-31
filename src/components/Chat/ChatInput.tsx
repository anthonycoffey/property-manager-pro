import React, { useState, useRef } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

// Define a handle type for the imperative methods that ChatView might call
export interface ChatInputHandle {
  focusInput: () => void;
}

const ChatInput = React.forwardRef<ChatInputHandle, ChatInputProps>(({ onSendMessage, isLoading }, ref) => {
  const [inputValue, setInputValue] = useState('');
  const internalInputRef = useRef<HTMLInputElement>(null); // Ref for the actual DOM input element

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      // Parent (ChatView) will call focusInput via ref after message processing
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !isLoading && inputValue.trim()) {
      event.preventDefault(); 
      handleSubmit(event as unknown as React.FormEvent); 
    }
  };
  
  // Expose focus method to parent component via ref
  React.useImperativeHandle(ref, () => ({
    focusInput: () => {
      internalInputRef.current?.focus();
    }
  }), []); // Empty dependency array means this is stable

  return (
    <Box 
      component="form" 
      onSubmit={handleSubmit} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        borderTop: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'background.default' 
      }}
    >
      <TextField
        fullWidth
        variant="outlined" 
        placeholder={isLoading ? "RescueBot is replying..." : "Type your message..."}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyPress}
        disabled={isLoading}
        inputRef={internalInputRef} // Assign internalRef for focusing
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px', backgroundColor: 'background.paper' } }} 
      />
      <IconButton 
        type="submit" 
        color="primary" 
        disabled={isLoading || !inputValue.trim()} 
        sx={{ ml: 1 }}
        aria-label="Send message"
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
});

export default ChatInput;
