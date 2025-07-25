# AmeniLink Web

AmeniLink is a multi-tenant ERP-style web application designed to streamline property management operations for Administrators, Property Managers, and Residents. It provides a centralized platform for managing properties, users, service requests, and communications.

## Core Features

*   **Multi-Tenancy:** Supports distinct data, configurations, and user bases for multiple property management entities.
*   **Role-Based Access Control (RBAC):** Secure access to features and data based on user roles (Admin, Property Manager, Resident).
*   **Organization Management:** Admins can create and manage property management organizations.
*   **Property Manager Management:** Admins can invite, view, and manage Property Managers within organizations.
*   **Property Management:** Property Managers can list, add, edit, and manage details of their assigned properties, including address autocompletion via Google Places API.
*   **Resident Management:** Property Managers can invite and manage residents for their properties.
*   **Invitation System:** Secure, token-based system for inviting Property Managers and Residents via email. Supports sign-up with email/password or social providers (Google, Microsoft).
*   **Service Request Management:** (Planned) Residents can submit service requests, which can be tracked and managed.
*   **User Profile Management:** Users can manage their own profiles.

## Tech Stack

### Frontend
*   **React 19:** Utilizing Client Components for interactivity and Server Components for performance optimization.
*   **Material UI (MUI):** Comprehensive UI component library for a consistent Material Design.
*   **Material Icons:** Vector icons.
*   **Highcharts:** For charting and data visualization in dashboards and reports.
*   **Google Places API:** For address autocompletion in property forms.
*   **Fetch API:** For client-side data fetching.
*   **React Context API:** For global state management (e.g., authentication, theme).

### Backend
*   **Firebase:**
    *   **Firebase Authentication:** User sign-up, login, session management, and RBAC via custom claims.
    *   **Cloud Firestore:** Scalable NoSQL database for all application data, with real-time capabilities and robust security rules.
    *   **Firebase Cloud Functions:** Server-side logic for API endpoints, business rule enforcement, and integrations.
    *   **Firebase Hosting:** Hosting for the React application.
    *   **`firestore-send-email` Extension:** For sending templated emails (invitations, notifications).

### Build Tools & Environment
*   **Vite:** Fast frontend build tool.
*   **TypeScript:** For static typing and improved code quality.
*   **Node.js & npm:** JavaScript runtime and package manager.
*   **ESLint & Prettier:** For code linting and formatting.

## Getting Started

### Prerequisites

*   **Node.js:** (LTS version recommended)
*   **npm:** (Comes with Node.js) or **yarn**.
*   **Firebase CLI:** Install globally: `npm install -g firebase-tools`
*   **Google Maps API Key:** You will need a Google Maps JavaScript API key with the "Places API" enabled.

### Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd property-manager-pro
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    (For functions, navigate to the `functions` directory and run `npm install` there as well)
    ```bash
    cd functions
    npm install
    cd ..
    ```

3.  **Set up Firebase Project:**
    *   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
    *   Add a Web app to your Firebase project to get your Firebase configuration.
    *   Enable Firebase Authentication (Email/Password, Google, Microsoft providers).
    *   Enable Cloud Firestore.
    *   Enable Firebase Hosting.
    *   Set up the `firestore-send-email` extension if you intend to send emails.
    *   Configure Cloud Functions.

4.  **Configure Environment Variables:**
    *   Create a `.env` file in the root directory of the project.
    *   Add your Firebase configuration and Google Maps API key:
        ```env
        VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
        VITE_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
        VITE_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
        VITE_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
        VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
        VITE_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
        VITE_FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID" # Optional
        VITE_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
        ```
    *   Replace `YOUR_...` placeholders with your actual Firebase project configuration values and Google Maps API key.

5.  **Firebase Login & Project Initialization (CLI):**
    *   Login to Firebase: `firebase login`
    *   Initialize Firebase in your project directory (if not already configured, or to link to your project): `firebase use --add` and select your project.

## Running the Project

### Development Mode

To run this application locally for development, you'll need to run the following commands, typically each in a separate terminal window:

1.  **Start Firebase Emulators:**
    ```bash
    firebase emulators:start
    ```
    This command starts the local Firebase emulators for services like Authentication, Firestore, and Functions.

2.  **Run the Vite Development Server:**
    ```bash
    npm run dev
    ```
    This starts the frontend application. It will typically be available at `http://localhost:5173`.

3.  **Seed Email Templates (if needed):**
    ```bash
    npm run seed:templates:local
    ```
    This command seeds necessary email templates into the local Firestore emulator. This might only be needed once or when templates change.

4.  **Build and Watch Cloud Functions:**
    ```bash
    cd functions && npm run build:watch
    ```
    This command navigates into the `functions` directory, then builds the Cloud Functions and watches for changes, rebuilding them automatically. This is crucial for local development of backend logic.

The application (frontend) will usually be available at `http://localhost:5173` (or another port if 5173 is busy). Ensure your Firebase emulators are running and configured correctly in your `firebase.json` for a smooth local development experience.

### Building for Production

```bash
npm run build
```
This will create a `dist` folder with the production-ready assets.

### Deploying to Firebase Hosting

```bash
firebase deploy --only hosting
```
(Ensure your `firebase.json` is configured for hosting and `apphosting.yaml` for App Hosting if using Server Components that require it.)

## Key Architectural Concepts

*   **Multi-Tenancy:** Data is isolated per organization, primarily through Firestore subcollections and security rules.
*   **Role-Based Access Control (RBAC):** Implemented using Firebase Authentication custom claims and enforced via Firestore security rules and frontend logic.
*   **Hybrid Rendering (React 19):** Combines Client Components for dynamic UI and Server Components for optimized initial loads and data fetching.
*   **Modular Firebase Functions:** Backend logic is organized into individual, callable Cloud Functions for specific tasks.

---

This README provides a basic overview. For more detailed information on system patterns, product context, and ongoing progress, please refer to the documents in the `memory-bank/` directory.
