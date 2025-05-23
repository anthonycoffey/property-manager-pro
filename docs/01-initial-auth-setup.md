# Plan: Initial Authentication Setup

This document outlines the steps for implementing basic user authentication and integrating Firebase into the React application. This assumes the React (Vite) project is already scaffolded and Firebase project setup is complete.

## Phase 1: Basic Authentication Implementation

1.  **Implement Firebase Authentication UI & Logic:**
    *   Create React components for:
        *   `SignupForm.tsx` (Email/Password)
        *   `LoginForm.tsx` (Email/Password)
        *   A `LogoutButton.tsx` component or integrate logout functionality into a user profile/menu.
    *   Use Material UI components for the forms and button.
    *   Implement Firebase SDK functions:
        *   `createUserWithEmailAndPassword` (in `SignupForm.tsx`)
        *   `signInWithEmailAndPassword` (in `LoginForm.tsx`)
        *   `signOut` (in `LogoutButton.tsx` or relevant component)

2.  **Set up Routing and Protected Routes:**
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

3.  **Update Firestore Security Rules:**
    *   Implement basic Firestore security rules to allow authenticated users to read/write their own document in a `users` collection. This rule should be applied in the Firebase console under Firestore > Rules.

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
