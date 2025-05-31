import React, { useState, useEffect, useRef } from 'react'; // Removed useCallback
import { Paper, Alert } from '@mui/material'; // Removed CircularProgress as it's in MessageList
import { getFunctions, httpsCallable } from 'firebase/functions';
// Assuming firebaseApp is initialized and exported from your firebaseConfig
// Adjust the import path as necessary for your project structure.
import { app as firebaseApp } from '../../firebaseConfig'; // Corrected import for firebaseApp

import MessageList from './MessageList';
import ChatInput from './ChatInput';
import type { ChatInputHandle } from './ChatInput'; // Type-only import
import type { ChatMessage, GptChatResponseData, GptChatRequestData } from './types'; // Type-only import

// Initialize Firebase Functions
const functions = getFunctions(firebaseApp);
// Define types for callable function explicitly
const callGetGptChatResponse = httpsCallable<GptChatRequestData, GptChatResponseData>(functions, 'getGptChatResponse');

const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatInputRef = useRef<ChatInputHandle>(null); // Ref for ChatInput component

  // Initial welcome message from RescueBot
  useEffect(() => {
    setMessages([
      {
        id: 'initial-bot-greeting-' + Date.now(), // Unique ID
        role: 'assistant',
        content: "Hi! I'm RescueBot, your virtual roadside assistant. How can I help you get the assistance you need today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Removed useCallback for debugging to ensure no stale closures
  const handleSendMessage = async (inputText: string) => { 
    if (isLoading || !inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    // Construct the next state of messages
    const nextMessagesState = [...messages, userMessage];

    // Update UI optimistically
    setMessages(nextMessagesState);
    setIsLoading(true);
    setError(null);
    
    // Use this 'nextMessagesState' to create the payload for the backend
    const messagesForBackendPayload = nextMessagesState
      .filter(msg => msg.role === 'user' || msg.role === 'assistant') // Only send user/assistant roles
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant', // Assert type after filtering
        content: msg.content,
      }));
    
    // Ensure payload is not empty (primarily for the very first message after initial greeting)
    // The backend also validates this.
    if (messagesForBackendPayload.filter(m => m.role === 'user').length === 0 && messagesForBackendPayload.length <=1 ) {
        // This condition means only the initial assistant message might be in payload, or it's empty.
        // This check might be too aggressive if system prompt is added client-side.
        // Given backend adds system prompt, we just need to ensure we send *something*.
        // The backend's check for messages.length === 0 is the ultimate guard.
        // Let's ensure the payload sent to backend is never literally empty.
        if (messagesForBackendPayload.length === 0) {
            console.error("Frontend Error: messagesForBackendPayload is empty before sending, after filtering.");
            setError("Cannot send an empty message list to the assistant.");
            setIsLoading(false);
            chatInputRef.current?.focusInput();
            return;
        }
    }

    console.log("Frontend: Sending messages payload to backend:", JSON.stringify(messagesForBackendPayload, null, 2)); // ADDED LOGGING

    try {
      const result = await callGetGptChatResponse({ 
        messages: messagesForBackendPayload,
        useFineTuned: true, 
        // debugMode: true, // Enable this on backend if needed by setting it in the call
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
      console.error("Error calling getGptChatResponse:", err);
      let friendlyErrorMessage = "Sorry, I encountered an issue. Please try again.";
      // Check if it's a Firebase HttpsError from the client SDK
      if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
        // This is likely a FirebaseError or HttpsError from firebase/app or firebase/functions client SDK
        const firebaseError = err as { code: string; message: string; details?: any };
        friendlyErrorMessage = firebaseError.message || friendlyErrorMessage;
        console.error(`Firebase HttpsError: Code: ${firebaseError.code}, Message: ${firebaseError.message}`, firebaseError.details);
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
  }; // Removed useCallback dependency array

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        height: '50vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden', 
      }}
    >
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 1, mb: 0, flexShrink: 0 }}>
          {error}
        </Alert>
      )}
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput ref={chatInputRef} onSendMessage={handleSendMessage} isLoading={isLoading} />
    </Paper>
  );
};

export default ChatView;
