# Google Reviews Integration Plan

## 1. Feature Goal

To provide Property Managers (`property_manager`) the ability to connect their Google account, link their Google Business Profiles to properties they manage within the application, and import Google Reviews for those properties.

## 2. Scope

- **Target User Role:** This feature will be exclusively available to users with the `property_manager` role.
- **Core Functionality:**
    - Securely authenticate with a Google account using OAuth 2.0.
    - Fetch a list of Google Business Profiles associated with the authenticated account.
    - Provide an interface to link/map a Google Business Profile to a specific property in the application.
    - Import reviews for a linked property.
    - Periodically sync new reviews automatically.
    - Display imported reviews within the property's dashboard.

## 3. High-Level User Flow

1.  **Initiate Connection:** A `property_manager` navigates to a new "Reputation" section in their dashboard.
2.  **Authenticate with Google:** They click "Connect to Google," which redirects them to Google's OAuth consent screen to grant permissions.
3.  **Link Business Profiles:** After authentication, the app fetches a list of their Google Business Profiles. The manager can then map each profile to a corresponding property they manage.
4.  **Import & Display Reviews:** Once linked, an initial import of reviews is triggered. New reviews are fetched periodically. Reviews are displayed on the relevant property's dashboard.

## 4. Architecture & Technical Implementation

### A. Backend (Firebase Cloud Functions)

- **`generateGoogleAuthUrl` (Callable):**
    - **Role Guard:** `property_manager` only.
    - **Action:** Generates the Google OAuth 2.0 URL with the required scopes for the Google My Business API.
- **`handleGoogleAuthCallback` (Callable):**
    - **Role Guard:** `property_manager` only.
    - **Action:** Exchanges the authorization code from Google for an `access_token` and `refresh_token`. Stores these tokens securely (encrypted) in Firestore.
- **`fetchGoogleBusinessProfiles` (Callable):**
    - **Role Guard:** `property_manager` only.
    - **Action:** Uses the stored `access_token` to fetch a list of Google Business Profiles (locations) from the Google My Business API.
- **`importGoogleReviews` (Callable):**
    - **Role Guard:** `property_manager` only.
    - **Action:** Fetches reviews for a specified Google Business Profile ID and saves them to the appropriate property's sub-collection in Firestore.
- **`scheduledReviewSync` (Scheduled):**
    - **Action:** Runs on a daily schedule. Iterates through all linked businesses and syncs new reviews.

### B. Firestore Data Model

- **`googleAuthTokens/{userId}`:**
    - Stores encrypted OAuth tokens for a `property_manager`.
    - `accessToken` (encrypted), `refreshToken` (encrypted), `expiryDate`, `scopes`.
- **`properties/{propertyId}/linkedBusinesses/{googleBusinessProfileId}`:**
    - Maps a Google Business Profile to a property.
    - `businessName`, `businessAddress`, `linkedBy` (userId), `linkedAt`.
- **`properties/{propertyId}/reviews/{reviewId}`:**
    - Stores individual reviews.
    - `source: 'google'`, `rating`, `comment`, `reviewerName`, `reviewerPhotoUrl`, `reviewDate`, `reply`.

### C. Frontend (React & Material UI)

- **Navigation:** A new "Reputation" link in `src/config/navigationConfig.ts`, visible only to the `property_manager` role.
- **View (`ReputationManagementPage.tsx`):** A new page for managing the Google connection, linking profiles to properties, and viewing import status.
- **Component:** Adapt or create a generic `ReviewSlider` component to display the imported Google reviews, building on the existing `ResidentReviewSlider.tsx`.

## 5. Implementation Steps

1.  **Google Cloud Project Setup:**
    - Enable the "Google My Business API".
    - Configure the OAuth 2.0 consent screen.
    - Create and securely store OAuth 2.0 web application credentials.
2.  **Backend Development:**
    - Implement the five Cloud Functions with role guards and token encryption.
3.  **Frontend Development:**
    - Implement the new navigation link and the `ReputationManagementPage.tsx`.
    - Develop the review display component.
4.  **Testing:**
    - Conduct end-to-end testing of the OAuth flow, profile linking, and review import/display.

## 6. Relevant Documentation

- **Google OAuth 2.0 for Web Server Applications:** `https://developers.google.com/identity/protocols/oauth2/web-server`
- **Google My Business API - List Locations:** `https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list`
- **Google My Business API - List Reviews:** `https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations.reviews/list`
