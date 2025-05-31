# Design: Frontend Chat Components for GPT Integration (MVP)

**Date:** 2025-05-31

## 1. Goal

To design the frontend React components for a lean MVP chat feature within the `property-manager-pro` application. This interface will connect to the `getGptChatResponse` Firebase Callable Function and will be integrated as a tab in all user dashboards (Admin, Organization Manager, Property Manager, Resident). The design prioritizes a clean, intuitive Material UI implementation, drawing conceptual inspiration from `rescuelink` components but focusing on core functionality.

## 2. Component Structure and Location

*   **Base Directory:** `src/components/Shared/ChatFeature/`
*   **Core Components:**
    *   `types.ts`: Defines shared TypeScript interfaces for chat messages and backend responses.
    *   `ChatView.tsx`: The main container and orchestrator for the chat session.
    *   `MessageList.tsx`: Displays the scrollable list of chat messages.
    *   `ChatMessageItem.tsx`: Renders an individual message bubble.
    *   `ChatInput.tsx`: Provides the text input field and send button.

## 3. Detailed Component Design

### A. `types.ts` (within `ChatFeature` directory)

```typescript
// src/components/Shared/ChatFeature/types.ts
export interface ChatMessage {
  id?: string; // Optional unique ID for React keys, can be generated client-side
  role: 'user' | 'assistant' | 'system_notification'; // 'system_notification' for errors/info
  content: string;
  timestamp?: Date; // Optional for MVP, can be added for display
}

export interface GptChatResponseData { // Expected structure from getGptChatResponse
  message: string;
  model: string;
  request_id: string;
  finish_reason: string;
}
```

### B. `ChatView.tsx` (Main Container)

*   **Purpose:** Manages the overall chat session state, handles communication with the Firebase backend, and composes the UI from sub-components.
*   **State (using `useState`):**
    *   `messages: ChatMessage[]`: Stores the conversation history.
    *   `inputValue: string`: Current text in the user's input field.
    *   `isLoading: boolean`: True while waiting for a response from the Firebase function (for UI feedback).
    *   `error: string | null`: Stores user-friendly error messages.
*   **Initial State:**
    *   `messages` initialized with a welcome message from "RescueBot" using `useEffect` on mount. Example: `{ id: 'greeting', role: 'assistant', content: "Hi! I'm RescueBot...", timestamp: new Date() }`.
*   **Firebase Callable Function Reference:**
    *   Initialized using `getFunctions()` and `httpsCallable()` from `firebase/functions`.
    *   `const callGetGptChatResponse = httpsCallable<RequestData, GptChatResponseData>(functions, 'getGptChatResponse');`
*   **`handleSendMessage(inputText: string)` Function:**
    1.  If `isLoading` is true or `inputText.trim()` is empty, return.
    2.  Create `userMessage: ChatMessage` object. Add to `messages` state.
    3.  Set `isLoading = true`; `setError(null)`.
    4.  Prepare `messagesForBackend`: Map the current `messages` (including the new user message) to the `{ role: string, content: string }[]` format expected by the backend.
    5.  Call `callGetGptChatResponse({ messages: messagesForBackend, useFineTuned: true })`.
    6.  **On Success (Promise resolves):**
        *   Receive `result.data` (conforming to `GptChatResponseData`).
        *   Create `assistantMessage: ChatMessage` using `result.data.message`. Add to `messages` state.
    7.  **On Error (Promise rejects):**
        *   Log the full error.
        *   Extract a user-friendly message (e.g., from `error.message` or a generic fallback).
        *   Set `error` state with this message.
        *   (Optional: Add a `system_notification` message to the `messages` array to display the error inline).
    8.  Set `isLoading = false`.
    9.  Programmatically re-focus the chat input field.
*   **Rendering (using Material UI):**
    *   Main container: MUI `Box` with `display: 'flex', flexDirection: 'column'`. Height should be configured to fill the available space within the dashboard tab (e.g., `height: '100%'` if parent tab panel has fixed height, or `height: 'calc(100vh - Xpx)'` if needing to subtract app/tab bars).
    *   Renders `<MessageList messages={messages} isLoading={isLoading} />`.
    *   If `error` is set, renders an MUI `Alert` component (e.g., `severity="error"`, with a dismiss action).
    *   Renders `<ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />`.

### C. `MessageList.tsx`

*   **Purpose:** Displays the scrollable list of messages.
*   **Props:**
    *   `messages: ChatMessage[]`
    *   `isLoading: boolean`
*   **Rendering (using Material UI):**
    *   MUI `Box` with `sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}`.
    *   Maps `messages` array to `<ChatMessageItem key={message.id || index} message={message} />`.
    *   Includes a `div` with `ref={messagesEndRef}` at the bottom for auto-scrolling.
    *   **Auto-Scroll:** `useEffect` hook that calls `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` when the `messages` array length changes.
    *   **Loading Indicator:** If `isLoading` is true, displays a subtle "RescueBot is typing..." `Typography` or a minimalist dot animation (e.g., using styled MUI `Box`es or `CircularProgress` with `variant="determinate"` and small size) at the bottom, aligned to the assistant's side (left).

### D. `ChatMessageItem.tsx`

*   **Purpose:** Renders a single message bubble with appropriate styling.
*   **Props:**
    *   `message: ChatMessage`
*   **Rendering (using Material UI):**
    *   MUI `ListItem` (or `Box`) with `sx` for `display: 'flex'`, `justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'`, `mb: 1`.
    *   Outer `Box` to manage avatar and bubble alignment, `maxWidth: '80%'`.
    *   (Optional MVP+) MUI `Avatar` (e.g., `PersonIcon` for user, `SmartToyIcon` for assistant) placed before assistant messages and after user messages.
    *   MUI `Paper` for the message bubble (`elevation={1}` or `variant="outlined"`):
        *   `sx` prop for dynamic styling based on `message.role`:
            *   **User:** `bgcolor: 'primary.light'` (or `primary.main` if contrast is good), `color: 'primary.contrastText'`, `borderRadius: '10px 10px 0 10px'`.
            *   **Assistant:** `bgcolor: 'background.paper'` (or `grey[200]` for light theme, `grey[700]` for dark), `color: 'text.primary'`, `borderRadius: '10px 10px 10px 0'`.
            *   **System Notification:** `bgcolor: 'warning.light'` or `error.light`, `color: 'warning.contrastText'`, distinct `borderRadius`.
        *   Padding `sx={{ p: 1.5 }}`.
    *   MUI `Typography` with `variant="body1"` and `sx={{ whiteSpace: 'pre-wrap' }}` for `message.content`.
    *   (Optional MVP+) If `message.timestamp`, display formatted time using `Typography` with `variant="caption"`, `display="block"`, `textAlign="right"`, `mt: 0.5`, `opacity: 0.7`.

### E. `ChatInput.tsx`

*   **Purpose:** Provides the text input field and send button.
*   **Props:**
    *   `onSendMessage: (message: string) => void`
    *   `isLoading: boolean`
*   **State (using `useState`):**
    *   `inputValue: string`
*   **Event Handlers:**
    *   `handleInputChange(event: React.ChangeEvent<HTMLInputElement>)`
    *   `handleSubmit(event: React.FormEvent)`: Prevents default, calls `props.onSendMessage(inputValue.trim())` if valid and not `isLoading`, then `setInputValue('')`.
*   **Rendering (using Material UI):**
    *   MUI `Box` component as a `form` with `onSubmit={handleSubmit}`, `sx={{ p: 2, display: 'flex', alignItems: 'center', borderTop: '1px solid', borderColor: 'divider' }}`.
    *   MUI `TextField`:
        *   `fullWidth`, `variant="outlined"` (or `filled`), `size="small"`.
        *   `placeholder={isLoading ? "RescueBot is replying..." : "Type your message..."}`.
        *   `value={inputValue}`, `onChange={handleInputChange}`.
        *   `disabled={isLoading}`.
        *   `onKeyPress` handler to submit on "Enter" (if not Shift+Enter for multiline).
        *   `inputRef` for programmatic focus.
    *   MUI `IconButton`:
        *   `type="submit"`, `color="primary"`.
        *   `disabled={isLoading || !inputValue.trim()}`.
        *   `aria-label="Send message"`.
        *   Contains `<SendIcon />`.
        *   `sx={{ ml: 1 }}`.

## 4. Integration into Dashboards

*   The `ChatView.tsx` component will be imported into each of the four main dashboard panel components:
    *   `src/components/Dashboard/AdminDashboardPanel.tsx`
    *   `src/components/Dashboard/OrganizationManagerDashboardPanel.tsx`
    *   `src/components/Dashboard/PropertyManagerDashboardPanel.tsx`
    *   `src/components/Resident/ResidentDashboard.tsx` (or its refactored panel equivalent)
*   Within each dashboard panel, an MUI `Tab` (e.g., inside an MUI `Tabs` component) will be added, labeled "AI Assistant" or "Chat".
*   The corresponding MUI `TabPanel` for this new tab will render an instance of `<ChatView />`.

## 5. Styling and UX Principles

*   Utilize the existing Material UI theme of `property-manager-pro` for consistency.
*   Ensure the interface is responsive.
*   Prioritize clean, intuitive layout and component choices, avoiding unnecessary labels (as per user feedback).
*   Provide clear visual feedback for loading states and errors.
