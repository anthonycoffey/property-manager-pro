import { isAppError } from '../../utils/errorUtils';
import React, { useState, useEffect, useRef } from 'react';
import { Paper, Alert, Button, Box } from '@mui/material';
import { PhoneCallback as PhoneCallbackIcon } from '@mui/icons-material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app as firebaseApp } from '../../firebaseConfig';

import MessageList from './MessageList';
import ChatInput from './ChatInput';
import RequestTwilioCallDialog from './RequestTwilioCallDialog'; // Import the new dialog
import type { ChatInputHandle } from './ChatInput';
import type {
  ChatMessage,
  GptChatResponseData,
  GptChatRequestData,
} from './types';

const functions = getFunctions(firebaseApp);
const callGetGptChatResponse = httpsCallable<
  GptChatRequestData,
  GptChatResponseData
>(functions, 'getGptChatResponse');

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatInputRef = useRef<ChatInputHandle>(null);
  const [isRequestCallDialogOpen, setIsRequestCallDialogOpen] = useState(false); // State for dialog

  useEffect(() => {
    setMessages([
      {
        id: 'initial-bot-greeting-' + Date.now(),
        role: 'assistant',
        content:
          "Hi! I'm RescueBot, your virtual roadside assistant. How can I help you get the assistance you need today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  const handleSendMessage = async (inputText: string) => {
    if (isLoading || !inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    const nextMessagesState = [...messages, userMessage];
    setMessages(nextMessagesState);
    setIsLoading(true);
    setError(null);

    const messagesForBackendPayload = nextMessagesState
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    if (
      messagesForBackendPayload.filter((m) => m.role === 'user').length === 0 &&
      messagesForBackendPayload.length <= 1
    ) {
      if (messagesForBackendPayload.length === 0) {
        console.error(
          'Frontend Error: messagesForBackendPayload is empty before sending, after filtering.'
        );
        setError('Cannot send an empty message list to the assistant.');
        setIsLoading(false);
        chatInputRef.current?.focusInput();
        return;
      }
    }

    console.log(
      'Frontend: Sending messages payload to backend:',
      JSON.stringify(messagesForBackendPayload, null, 2)
    );

    try {
      const result = await callGetGptChatResponse({
        messages: messagesForBackendPayload,
        useFineTuned: true,
      });

      const responseData = result.data;
      const assistantMessage: ChatMessage = {
        id: 'assistant-' + Date.now(),
        role: 'assistant',
        content: responseData.message,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (err: unknown) {
      console.error('Error calling getGptChatResponse:', err);
      let friendlyErrorMessage =
        'Sorry, I encountered an issue. Please try again.';
      if (isAppError(err)) {
        friendlyErrorMessage = err.message;
      } else if (err instanceof Error) {
        friendlyErrorMessage = err.message;
      }
      setError(friendlyErrorMessage);
      const errorNotification: ChatMessage = {
        id: 'error-' + Date.now(),
        role: 'system_notification',
        content: `Error: ${friendlyErrorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorNotification]);
    } finally {
      setIsLoading(false);
      chatInputRef.current?.focusInput();
    }
  };

  return (
    <>
      <Paper
      elevation={5}
        // variant='outlined'
        sx={{
          backgroundColor: 'background.paper',
          minHeight: '50vh', // Or adjust as needed
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {error && (
          <Alert
            severity='error'
            onClose={() => setError(null)}
            sx={{ m: 1, mb: 0, flexShrink: 0 }}
          >
            {error}
          </Alert>
        )}

        <MessageList messages={messages} isLoading={isLoading} />
        <ChatInput
          ref={chatInputRef}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', my: 3 }}>
        <Button
          variant='outlined'
          size='small'
          onClick={() => setIsRequestCallDialogOpen(true)}
          startIcon={<PhoneCallbackIcon />}
          sx={{ mr: 1 }}
          title='Speak to a Live Agent'
        >
          Connect to Live Agent
        </Button>
      </Box>
      <RequestTwilioCallDialog
        open={isRequestCallDialogOpen}
        onOpenChange={setIsRequestCallDialogOpen}
      />
    </>
  );
};

export default ChatView;
