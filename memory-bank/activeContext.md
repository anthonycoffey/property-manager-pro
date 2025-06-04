# Active Context: Multi-Tenant ERP-Style Web Application

## 1. Current Work Focus

- **Dashboard Data Visualizations & Statistics - Phase 1 (Non-Phoenix Data) (Completed 2025-06-03):**
    - Implemented initial dashboard statistics and visualizations for Admin, Organization Manager, and Property Manager roles.
    - Focus on non-Phoenix related data: platform counts, user/org growth, campaign performance, property-specific metrics (occupancy, resident counts).
    - Added new "Dashboard" tabs to relevant user panels.
    - Created backend Cloud Functions for data aggregation (`getAdminDashboardStats`, `getOrgManagerDashboardStats`, `getPropertyManagerDashboardStats`).
    - Developed reusable frontend chart components (`KpiCard`, `LineChart`, `BarChart`, `PieChart`, `GaugeChart`) using Highcharts.
    - Updated data models (`Property` type with `totalUnits`) and Firestore indexes.
    - Documented plan for Phoenix API integration for service stats in `docs/12-dashboard-phoenix-integration-plan.md`.
- **Login Page Accessibility (Completed 2025-06-03):** Updated `src/components/LoginForm.tsx` to redirect authenticated users to `/dashboard`.
- **Twilio "Request Call" Integration (Completed 2025-06-03):** Migrated "Live Agent" call request functionality.
- **Phoenix Integration - Service Request Form Submission (Completed 2025-06-02):** Initial phase complete.
- **Phoenix Integration - Remaining:** (Ongoing) Job querying by various roles, full service request dispatch lifecycle, services querying. This now also includes integration for dashboard service request analytics (pending API documentation).

## 2. Recent Changes & Activities (Newest First)

- **Resident Profile - Vehicle Information Update (Completed 2025-06-04):**
    - **Objective:** Refactor resident vehicle information from flat fields to an array of vehicle objects (max 2).
    - **Type Definitions Updated:**
        - Defined `Vehicle` interface (`make`, `model`, `year`, `color`, `plate`) in `src/types/index.ts` and `functions/src/types.ts`.
        - Updated `Resident` interface in both files to use `vehicles?: Vehicle[]` and removed old flat vehicle fields.
    - **Backend Cloud Function (`functions/src/callable/updateResidentProfile.ts`):**
        - Modified to accept and validate the `vehicles` array (max length 2, schema adherence).
        - Updated Firestore write logic for the `vehicles` array.
        - Added logic to delete old flat vehicle fields from Firestore upon update.
    - **Frontend Component (`src/components/Resident/ResidentProfileManagement.tsx`):**
        - Reworked UI to manage an array of up to 2 vehicles (add/remove forms, input fields for each vehicle detail).
        - Updated state management and submission logic to handle the `vehicles` array.
        - Ensured layout uses `Stack` or `Box` with flexbox instead of `Grid`.
        - **UI Refinements (based on feedback 2025-06-04):**
            - Changed default year for new vehicles to be empty (stored as 0).
            - Replaced remove icon with a trash icon (`DeleteOutlineIcon`).
            - Adjusted button layout: "Add Vehicle" button moved to header, "Save Profile" button centered at the bottom.
            - Removed inner `Paper` for individual vehicle forms, using `Box` with border and `Divider` for better visual separation.
    - **Memory Bank Updated:** `systemPatterns.md` updated to reflect new resident data model. `activeContext.md` updated with UI refinement details.

- **Dashboard Data Visualizations & Statistics - Phase 1 (Non-Phoenix Data) (Completed 2025-06-03):**
    - **Objective:** Implement initial dashboard statistics and visualizations.
    - **Data Model Enhancement:**
        - Added `totalUnits: number` to `Property` interface in `src/types/index.ts` and `PropertyData` in `functions/src/types.ts`.
        - Updated `CreatePropertyForm.tsx` and `EditPropertyModal.tsx` to include `totalUnits` field.
        - Updated `createProperty.ts` and `updateProperty.ts` Cloud Functions to handle `totalUnits`.
    - **Backend Aggregation Cloud Functions:**
        - Created `functions/src/callable/getAdminDashboardStats.ts`: Aggregates platform-wide counts, user/org growth trends, and campaign overview.
        - Created `functions/src/callable/getOrgManagerDashboardStats.ts`: Aggregates organization-specific counts and campaign performance.
        - Created `functions/src/callable/getPropertyManagerDashboardStats.ts`: Aggregates property-specific counts (residents, occupancy) and campaign performance.
        - All three functions updated to robustly handle `request.data` being null or undefined.
        - Exported new functions in `functions/src/index.ts`.
    - **Frontend Chart Components (`src/components/Dashboard/Charts/`):**
        - Created `KpiCard.tsx`, `LineChart.tsx`, `BarChart.tsx`, `PieChart.tsx`, `GaugeChart.tsx`.
        - Installed `highcharts` and `highcharts-react-official` dependencies.
    - **Dashboard Panel Integration:**
        - `AdminDashboardPanel.tsx`: Added "Dashboard" tab; integrated KPIs, Line charts, Pie chart via `getAdminDashboardStats`.
        - `OrganizationManagerDashboardPanel.tsx`: Added "Dashboard" tab; integrated KPIs, Bar chart via `getOrgManagerDashboardStats`.
        - `PropertyManagerDashboardPanel.tsx`: Added "Dashboard" tab; integrated KPIs, Bar chart via `getPropertyManagerDashboardStats`.
        - Ensured frontend calls to stats functions pass appropriate data objects.
    - **Firestore Indexes (`firestore.indexes.json`):**
        - Added collection group indexes for `properties`, `residents`.
        - Added collection group index for `campaigns` including `organizationId`.
        - Removed JSON comments.
    - **Documentation:**
        - Created `docs/12-dashboard-phoenix-integration-plan.md`.

- **Login Page Accessibility (Completed 2025-06-03):** (Details as previously listed)
- **Twilio "Request Call" Integration (Completed 2025-06-03):** (Details as previously listed)
- **Phoenix API Integration - Service Request Form Submission (Completed 2025-06-02):** (Details as previously listed)
- **Campaign Reactivation Feature (Completed 2025-05-29):** (Details as previously listed)
- **Campaign Table Actions & View Details Page (Frontend - 2025-05-30):** (Details as previously listed)
- **Public Campaign Link Flow Rearchitected & Fixed (Frontend URL - 2025-05-30):** (Details as previously listed)
- **Public Campaign Sign-up Flow Debugging & Fix (Completed 2025-05-30):** (Details as previously listed)
- **Custom GPTChat Model Integration (Completed 2025-05-31):** (Details as previously listed)

## 3. Next Steps

1.  **Dashboard Data Visualizations & Statistics - Phase 1.C (Phoenix API Integration):**
    *   Awaiting Phoenix API documentation for querying aggregated job/service data.
    *   Once available, implement Cloud Functions (`getAdminServiceRequestStats`, update `getOrgServiceRequestStats`, update `getPropertyManagerServiceRequestStats`) to fetch and process this data.
    *   Integrate new charts for service request analytics into the respective dashboard panels.
    *   Update `docs/12-dashboard-phoenix-integration-plan.md` as implementation proceeds.
2.  **Phoenix Integration - Remaining Core Tasks:**
    *   Implement job querying by Resident, Property, and Organization.
    *   Further develop service request dispatch lifecycle beyond initial submission (e.g., updates, status changes, webhooks).
    *   Implement services querying from Phoenix for display or management if needed.
3.  **Review and Refine Denormalization for Dashboard Stats:**
    *   Based on initial performance of direct aggregation in dashboard functions, identify and implement denormalized counters for high-cost or frequently accessed statistics to improve scalability and reduce read costs.

## 4. Active Decisions & Considerations

- **Dashboard Statistics Aggregation Strategy (New Decision 2025-06-03):**
    - Adopted a hybrid approach for dashboard statistics:
        - **Phase 1 (Initial):** Implement Cloud Functions to perform direct aggregation of data from Firestore for non-Phoenix related stats. This allows for rapid initial development.
        - **Iterative Denormalization:** Plan to introduce denormalized counters (updated by Firestore triggers) for frequently accessed or computationally expensive statistics to improve scalability and reduce read costs over time. The callable functions will be designed to preferentially read these counters if available, falling back to direct queries otherwise.
- **Dashboard Layout (New Decision 2025-06-03):**
    - Utilize MUI `Box` (with Flexbox via `sx` prop) and `Stack` for modern, responsive layouts in dashboard panels, as per user preference and to avoid potential issues with the deprecated `Grid` v1.
- **Charting Library (New Decision 2025-06-03):**
    - Using `Highcharts` with the `highcharts-react-official` wrapper for all dashboard visualizations.
- **Campaigns as a Unified Invitation Mechanism (Decision 2025-05-29):** (Details as previously listed)
- **Firebase Storage for CSVs with Scheduled Cleanup (Decision 2025-05-29):** (Details as previously listed)
- **Public Campaign URL Generation and Handling Rearchitected & Fixed (Decision 2025-05-30):** (Details as previously listed)
- **Error Handling in Cloud Functions (Reinforced 2025-06-03):**
    - Ensure robust handling of `request.data` in callable functions to prevent destructuring errors if `request.data` is null or undefined (e.g., `const data = request.data || {};`).
- **Phoenix API Integration Workflow (Decision 2025-06-02):** (Details as previously listed)

## 5. Important Patterns & Preferences

- **Generic Chart Wrapper Components (New Pattern 2025-06-03):**
    - Created reusable React components in `src/components/Dashboard/Charts/` (e.g., `KpiCard.tsx`, `LineChart.tsx`) to encapsulate Highcharts logic and promote consistency.
- **Modular Component Design:** (As previously listed)
- **Clear Code Over Comments:** (As previously listed)
- **Strict Typing:** (As previously listed)
- **Standard Dialog Styling:** (As previously listed)

## 6. Learnings & Project Insights

- **Firestore Indexing for Aggregation (New Insight 2025-06-03):**
    - Collection group queries for counts (`.count().get()`) and queries with filters (`.where()`) on collection groups require specific Firestore indexes to be defined in `firestore.indexes.json` for optimal performance and to avoid errors at scale. Added indexes for `properties`, `residents`, and `campaigns` (with `organizationId` field).
- **Robustness of Cloud Function Inputs (New Insight 2025-06-03):**
    - Callable Cloud Functions should always validate or safely handle the `request.data` payload, as it can be `null` or `undefined` if the client doesn't pass a data argument, leading to destructuring errors if not checked.
- **`replace_in_file` vs. `write_to_file` (New Insight 2025-06-03):**
    - For extensive modifications to larger files, or when `replace_in_file` fails multiple times due to subtle mismatches or complex diffs, `write_to_file` (providing the complete intended file content) is a more reliable fallback to ensure correctness, even if it requires re-reading the file first.
- **Refactoring Impact:** (As previously listed)
- **TypeScript Prop Validation:** (As previously listed)
