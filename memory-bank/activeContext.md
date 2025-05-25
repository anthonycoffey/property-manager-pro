# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

The current focus is on refactoring UI components for better maintainability and readability, starting with the main Dashboard.

## 2. Recent Changes & Activities

- **Google Places API Autocomplete Refactor (2025-05-25):**
  - Refactored address autocompletion in property forms to use the recommended `google.maps.places.PlaceAutocompleteElement` (Web Component) instead of the legacy `google.maps.places.Autocomplete`.
  - The `@react-google-maps/api` library is still used for `LoadScript` to load the Google Maps API.
  - Modified `src/components/PropertyManager/CreatePropertyForm.tsx` and `src/components/PropertyManager/EditPropertyModal.tsx`:
    - Implemented `useEffect` hooks to dynamically create, append, and manage the `PlaceAutocompleteElement`.
    - Styled the web component's input field to better match MUI's `TextField` appearance.
    - Attached `gmp-select` event listeners to the `PlaceAutocompleteElement` to retrieve selected place details.
    - Parsed `place.addressComponents` to populate form state for street, city, state (short code), and zip.
  - Ensured the `VITE_GOOGLE_MAPS_API_KEY` environment variable is used and its importance documented.
  - Addressed TypeScript errors related to the new API and potential null values.
- **Create Property Form Simplification (2025-05-25):**
  - Modified `src/components/PropertyManager/CreatePropertyForm.tsx`:
    - Removed City, State, and Zip Code fields from the form.
    - Renamed the "Street Address" label to "Address".
    - The `PropertyAddress` interface and state now only manage the `street` field.
    - The Google Places Autocomplete (`PlaceAutocompleteElement`) is still used for address input, but the form now only captures and sends the full street address.
  - Updated `functions/src/callable/createProperty.ts`:
    - The Cloud Function now expects an `address` object containing only `{ street: string }`.
    - Validation updated to reflect this.
    - The property document in Firestore will now store `address: { street: "..." }`, simplifying the stored address structure for new properties. This is a change to the previously defined data model in `systemPatterns.md`.
  - Updated `memory-bank/systemPatterns.md` to reflect the change in the property's `address` object structure in Firestore.
- **Google Places Autocomplete Styling and UX (2025-05-25):**
  - Improved the input styling of the `PlaceAutocompleteElement` in `src/components/PropertyManager/CreatePropertyForm.tsx` and `src/components/PropertyManager/EditPropertyModal.tsx` to more closely match standard MUI `TextField` components, using `theme` variables for consistency.
  - Addressed the z-index issue of the autocomplete suggestions dropdown (`.pac-container`) by adding a global style in `src/index.css` to ensure it appears above MUI modals.
- **Organization Management Panel UI Enhancement (2025-05-25):**
  - Updated `src/components/Admin/OrganizationManagementPanel.tsx` to display the organization status using MUI `Chip` components for better visual distinction. Chip colors vary based on status (e.g., active, inactive, suspended). The chip label is now correctly Capitalized (Title Case, e.g., "Active").
  - Further updated `src/components/Admin/OrganizationManagementPanel.tsx` to display the `createdAt` field with both date and time (`toLocaleString()`) and center-aligned the "Created At" column header and cell content for improved readability.
- **Dashboard Component Refactor (2025-05-25):**
  - **Objective:** Improve maintainability and readability of `src/components/Dashboard.tsx` by extracting role-specific UI and logic into separate components. Also, remove all code comments from the affected files.
  - **New Components Created:**
    - `src/components/Dashboard/AdminDashboardPanel.tsx`: Encapsulates all UI and logic specific to the Admin role. This includes the admin tabs, organization selector, property manager management, organization management, and the "Add Organization" modal and associated snackbar feedback.
    - `src/components/Dashboard/PropertyManagerDashboardPanel.tsx`: Encapsulates all UI and logic specific to the Property Manager role. This includes the PM tabs, property lists, resident invitation forms, property creation/editing modals, and organization name fetching.
  - **`src/components/Dashboard.tsx` Refactored:**
    - Simplified to primarily handle role-based conditional rendering of the new panel components (`AdminDashboardPanel`, `PropertyManagerDashboardPanel`) and the existing `ResidentDashboard`.
    - Retains general structure like displaying the logged-in user's email and the welcome message for users without specific roles.
    - All comments removed from `Dashboard.tsx`, `AdminDashboardPanel.tsx`, and `PropertyManagerDashboardPanel.tsx`.
  - **TypeScript Error Resolution:** Addressed a type mismatch for the `organizationId` prop passed to `PropertyManagerDashboardPanel` by using `organizationId ?? null`.
- **Firestore Rules Update (2025-05-25):**
  - Modified `firestore.rules` to allow residents to read the specific property document they belong to.
  - Added `allow read: if isResident() && isPropertyResident(organizationId, propertyId);` to the `match /organizations/{organizationId}/properties/{propertyId}` rule block.

## 3. Next Steps

- **Continue UI Refinements:** Identify other large components or sections that could benefit from similar refactoring to enhance modularity.
- **Invitation System (Phase 3 - Refinement & Testing):**
  - Thoroughly test all invitation flows: Admin invites PM, PM creates Property, PM invites Resident (including the new dynamic property selection), invitee accepts and signs up (email/password and social).
  - Verify email content and links.
  - Manually add email templates from `docs/` to Firestore `templates` collection if not already done (can use the enhanced `seedTemplates.js` script for this).
- **Admin Dashboard - Properties Management:**
  - Begin implementation of property CRUD operations for Admins as per project roadmap.
- **Continue with Project Roadmap:** Proceed with other features outlined in `projectRoadmap.md`.

## 4. Active Decisions & Considerations

- **Property Address Data Model Change (New Decision 2025-05-25):**
  - The `CreatePropertyForm.tsx` has been simplified to only capture the street address.
  - Consequently, the `createProperty.ts` Cloud Function now only expects and stores the `street` in the `address` object for new properties in Firestore (`address: { street: "..." }`).
  - This simplifies the address data for properties but means city, state, and zip are no longer stored for newly created properties. This change has been documented in `systemPatterns.md`.
- **Google Places Autocomplete Styling (New Decision 2025-05-25):**
  - The input field for the `PlaceAutocompleteElement` in property forms will be styled using `theme` variables to align its appearance (font, padding, colors, borders) with standard MUI `TextFields`.
  - The suggestions dropdown (`.pac-container`) will have its `z-index` globally increased via `src/index.css` to ensure it displays correctly over modal dialogs.
- **UI Consistency (New Decision 2025-05-25):** Status indicators in tables (like in `OrganizationManagementPanel.tsx`) should use MUI `Chip` components for better visual feedback and consistency across different management panels.
- **Component Granularity (New Decision 2025-05-25):** Large, multi-functional components like the original `Dashboard.tsx` should be broken down into smaller, role-specific or feature-specific panels to improve maintainability, testability, and readability. This was applied to `Dashboard.tsx`.
- **Comment Removal (User Request 2025-05-25):** All code comments are to be removed from refactored components to rely on clear code structure for understanding.

## 5. ImportantPatterns & Preferences

- **Modular Component Design:** Favor breaking down large components into smaller, more focused ones.
- **Clear Code Over Comments:** Strive for self-documenting code, reducing the need for explanatory comments, especially for straightforward UI logic.

## 6. Learnings & Project Insights

- **Refactoring Impact:** Breaking down large components significantly improves the clarity of the main component and makes individual role-based functionalities easier to manage and understand.
- **Prop Drilling vs. Context:** While refactoring, it's important to consider if props are being passed down too many levels. For the current Dashboard refactor, direct prop passing was manageable. For more deeply nested structures, React Context or state management libraries might be considered.
- **TypeScript Prop Validation:** Strict prop type checking (like the one caught for `organizationId`) helps maintain component contracts and prevent runtime errors.
