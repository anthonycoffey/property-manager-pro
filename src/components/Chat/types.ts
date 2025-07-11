// src/components/Chat/types.ts
export interface ChatMessage {
  id?: string; // Optional unique ID for React keys, can be generated client-side
  role: 'user' | 'assistant' | 'system_notification'; // 'system_notification' for errors/info
  content: string;
  timestamp?: Date; // Optional for MVP, can be added for display
}

// Expected structure from our getGptChatResponse Firebase function
export interface GptChatResponseData {
  message: string;
  model: string;
  request_id: string;
  finish_reason: string;
  tool_call?: {
    name: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arguments: any;
  };
  serviceRequestResult?: {
    success: boolean;
    serviceRequestId: string;
    message: string;
  };
}

// Expected structure for the data sent to our getGptChatResponse Firebase function
export interface GptChatRequestData {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]; // OpenAI expects system, user, assistant
  useFineTuned?: boolean;
  debugMode?: boolean;
}
