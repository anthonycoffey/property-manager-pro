# Plan: Initial Authentication Setup

This document outlines the steps for implementing basic user authentication and integrating Firebase into the React application. This assumes the React (Vite) project is already scaffolded and Firebase project setup is complete.

## Phase 1: Basic Authentication Implementation

1.  **Verify Dependencies:**
    *   Check `package.json` to ensure `firebase` and `react-router-dom` are listed as dependencies.
    *   If not present, install them: `npm install firebase react-router-dom`.

2.  **Firebase Configuration File:**
    *   Confirm or create `src/firebaseConfig.ts` (or a similar file, e.g., `src/firebase.ts`).
    *   Ensure it correctly initializes and exports the Firebase app instance using the project's Firebase configuration.
    *   Example structure:
        ```typescript
        // src/firebaseConfig.ts
        import { initializeApp } from "firebase/app";
        import { getAuth } from "firebase/auth";
        import { getFirestore } from "firebase/firestore";

        const firebaseConfig = {
          apiKey: "YOUR_API_KEY",
          authDomain: "YOUR_AUTH_DOMAIN",
          projectId: "YOUR_PROJECT_ID",
          storageBucket: "YOUR_STORAGE_BUCKET",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
          appId: "YOUR_APP_ID"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        export { app, auth, db };
        ```

3.  **Implement Firebase Authentication UI & Logic:**
    *   Create React components for:
        *   `SignupForm.tsx` (Email/Password)
        *   `LoginForm.tsx` (Email/Password)
        *   A `LogoutButton.tsx` component or integrate logout functionality into a user profile/menu.
    *   Use Material UI components for the forms and button.
    *   Implement Firebase SDK functions:
        *   `createUserWithEmailAndPassword` (in `SignupForm.tsx`)
        *   `signInWithEmailAndPassword` (in `LoginForm.tsx`)
        *   `signOut` (in `LogoutButton.tsx` or relevant component)

4.  **Set up Routing and Protected Routes:**
    *   Ensure `react-router-dom` is configured.
    *   Define routes in `App.tsx` or a dedicated routing configuration file (e.g., `src/routes.tsx`):
        *   Public routes: `/login`, `/signup`
        *   Protected route: `/dashboard` (and others later)
    *   Create an `AuthProvider.tsx` component using React Context:
        *   Manages authentication state (e.g., `currentUser`, `loading`).
        *   Uses `onAuthStateChanged` from Firebase to listen for authentication state changes and update the context.
    *   Create a `ProtectedRoute.tsx` higher-order component:
        *   Consumes the authentication context.
        *   If the user is not authenticated, redirects to `/login`.
        *   Otherwise, renders the protected component.
    *   Wrap the application with `AuthProvider` and the router in `main.tsx` or `App.tsx`.

5.  **Update Firestore Security Rules:**
    *   Implement basic Firestore security rules to allow authenticated users to read/write their own document in a `users` collection. This rule should be applied in the Firebase console under Firestore > Rules.
        ```
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            // Users can only read and write their own user document
            // This assumes user documents are stored with their UID as the document ID
            match /users/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
            // Add other rules for other collections as they are created
          }
        }
        ```
    *   (Optional but recommended) Create a `users` document in Firestore upon successful user registration, storing basic info like email and role (initially, role might be a default like 'resident').

6.  **Basic App Structure & Layout:**
    *   Ensure `App.tsx` is structured to use the router and `AuthProvider`.
    *   Create a placeholder `Dashboard.tsx` component that will be a protected route.
    *   Use Material UI for basic layout (e.g., `Container`, `AppBar`, `Box`) and styling of authentication forms.

## Diagram: Authentication and Routing Flow

```mermaid
graph TD
    subgraph Firebase Interaction
        F_Auth[Firebase Authentication]
        F_Store[Cloud Firestore]
    end

    subgraph React App
        User[User Interacts] --> App_Entry[App.tsx / main.tsx]
        App_Entry --> Router_Setup[Router (react-router-dom)]
        App_Entry --> Auth_Provider[AuthProvider Context]

        Router_Setup --> Route_Login[Login Page Component]
        Router_Setup --> Route_Signup[Signup Page Component]
        Router_Setup --> Route_Protected[ProtectedRoute HOC]
        Route_Protected --> Route_Dashboard[Dashboard Page Component]

        Route_Login -- User Credentials --> Auth_Logic_Login[Login Logic (Firebase SDK)]
        Route_Signup -- User Credentials --> Auth_Logic_Signup[Signup Logic (Firebase SDK)]
        Auth_Logic_Login --> F_Auth
        Auth_Logic_Signup --> F_Auth

        F_Auth -- Auth State Changes --> Auth_Provider
        Auth_Provider -- Auth Context (currentUser) --> Route_Protected
        Auth_Provider -- Auth Context (currentUser) --> Route_Dashboard

        Route_Dashboard -- Data Operations (e.g., user profile) --> F_Store
    end

    F_Store -- Firestore Security Rules enforce access based on --> F_Auth[request.auth object]
```

This plan provides a clear path for setting up the initial authentication layer.
