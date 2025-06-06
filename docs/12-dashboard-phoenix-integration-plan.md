# 12. Dashboard Phoenix Integration Plan: Service Request Analytics

This document outlines the plan for Phase 1.C of the "Dashboard Data Visualizations & Statistics" feature, which focuses on integrating service request analytics data from the Phoenix API into the Admin, Organization Manager, and Property Manager dashboards.

## 1. Objective

To provide users with insights into service request volumes, types, and performance metrics by fetching and displaying data sourced from the Phoenix API. This will complement the existing non-Phoenix related statistics already implemented.

## 2. Prerequisites

- **Phoenix API Documentation:**
  - Detailed documentation for key Phoenix API endpoints (`/form-submissions/search/source-meta` and `/jobs/search/source-meta`) has been provided. These endpoints allow querying based on `sourceMeta` (including `applicationName`, `organizationId`, `propertyId`), `serviceType`, date ranges, and status.
  - **Authentication Note:** For initial development and testing, authentication on these Phoenix endpoints will be temporarily disabled. Authentication mechanisms will be revisited and implemented before production deployment.
- **Existing Dashboard Infrastructure:** The current dashboard panels (`AdminDashboardPanel`, `OrganizationManagerDashboardPanel`, `PropertyManagerDashboardPanel`) and chart wrapper components (`KpiCard`, `LineChart`, `BarChart`, etc.) will be leveraged.
- **Phoenix API Base URL:** `https://phoenix-staging-data-3d6054f8c3ef.herokuapp.com` (accessible via `process.env.PHOENIX_API_URL` in Firebase Functions).

## 3. Scope of Phoenix Integration for Dashboards

The following statistics are planned, leveraging the provided Phoenix API capabilities:

### 3.1. Admin Dashboard (Platform-Wide)

- **Service Request Volume Trends:** (Removed 6/4/2025 - To be tracked by other means)
- **Service Request Types Distribution:**
  - Metric: Breakdown of dispatched service requests by type.
  - Chart: Pie chart or Bar chart.
  - Data Source: Phoenix API (`/form-submissions/search/source-meta`).
  - Logic: Query with `applicationName=PropertyManagerPro`, `fromDate`, `toDate`, and `limit=1`. Use `analytics.serviceTypeDistribution` from the response.
- **Average Service Completion Time:**
  - Metric: Average time from job creation to job completion for dispatched services.
  - Chart: KPI Card or trend line.
  - Data Source: Phoenix API (`/jobs/search/source-meta`).
  - Logic: Query with `applicationName=PropertyManagerPro`, `status` IN (`completed`, `paid`, `invoiced`), and `completedAt` within `dateRange`. Calculate average of (`job.completedAt` - `job.createdAt`).

### 3.2. Organization Manager Dashboard (Scoped to Selected Organization)

- **Service Request Volume Trends:** (Removed 6/4/2025 - To be tracked by other means)
- **Service Request Types Distribution:**
  - As above (Admin Dashboard), additionally filtered by `organizationId`.
- **Average Completion Time:**
  - As above (Admin Dashboard), additionally filtered by `organizationId`.
- **(Optional) Top Properties by Service Request Volume:**
  - Metric: List or bar chart of properties with the highest dispatched request volumes.
  - Data Source: Phoenix API (`/form-submissions/search/source-meta`).
  - Logic: Query for each property within the organization, using `analytics.dispatched_count` (filtered by `propertyId`) or `meta.total` (filtered by `propertyId`) for each period.

### 3.3. Property Manager Dashboard (Scoped to Selected Property)

- **Service Request Volume Trends:** (Removed 6/4/2025 - To be tracked by other means)
- **Service Request Types Distribution:**
  - As above (Admin Dashboard), additionally filtered by `organizationId` and `propertyId`.
- **Open vs. Closed Requests:**
  - Metric: Count of currently open and closed dispatched service requests.
  - Chart: KPI Cards or a simple Bar chart.
  - Data Source: Phoenix API (`/jobs/search/source-meta`).
  - Logic:
    - Open: Query with `applicationName=PropertyManagerPro`, `organizationId`, `propertyId`, `status` IN (`pending`, `assigned`, `en-route`, `in-progress`), and `limit=1`. Use `meta.total`.
    - Closed: Query with `applicationName=PropertyManagerPro`, `organizationId`, `propertyId`, `status` IN (`completed`, `paid`, `invoiced`), and `limit=1`. Use `meta.total`. (Consider `dateRange` for "recently closed").

## 4. Technical Implementation Plan

### 4.1. Backend (New/Updated Cloud Functions)

New Firebase Cloud Functions (callable) will be created, or existing ones updated, to interact with the Phoenix API. These functions will be responsible for:

- Making requests to the appropriate Phoenix API endpoints (initially without authentication headers, as authentication is temporarily disabled on Phoenix side for these development endpoints; this will be reinstated before production).
- Applying necessary filters (`applicationName`, `organizationId`, `propertyId`, `serviceType`, `status`, date ranges) based on input parameters, as detailed in Section 3.
- Processing paginated responses if fetching lists of jobs (e.g., for average completion time).
- Extracting specific data points (e.g., `analytics.dispatched_count`, `meta.total`) or calculating aggregates (e.g., average completion time).
- Transforming the data received from Phoenix into a format suitable for the frontend charts.
- Handling errors gracefully.

- **`getAdminServiceRequestStats` (New or to be integrated into `getAdminDashboardStats`):**
  - Fetches platform-wide service request data from Phoenix as detailed in section 3.1. This includes average service completion time and type distribution.
- **`getOrgServiceRequestStats` (New or to be integrated into `getOrgManagerDashboardStats`):**
  - Inputs: `organizationId`, `dateRange?`
  - Fetches service request data for the specified `organizationId` from Phoenix as detailed in section 3.2. This includes average service completion time and type distribution.
- **`getPropertyManagerServiceRequestStats` (New or to be integrated into `getPropertyManagerDashboardStats`):**
  - Inputs: `organizationId`, `propertyId`, `dateRange?`
  - Fetches service request data for the specified `propertyId` from Phoenix as detailed in section 3.3. This includes open/closed requests and type distribution.

### 4.2. Frontend (Dashboard Panel Updates)

The existing dashboard panel components will be updated:

- **State Management:** Add new state variables to hold the Phoenix-sourced statistics and their loading/error states.
- **Data Fetching:** Modify `useEffect` hooks (or add new ones) to call the new/updated Cloud Functions when the respective dashboard tab is active and necessary filters (like `organizationId` or `propertyId`) are selected.
- **Chart Integration:** Use the existing chart wrapper components (`LineChart`, `PieChart`, `KpiCard`, etc.) to display the data fetched from Phoenix.
  - Construct Highcharts `options` objects based on the data returned by the Cloud Functions.
  - Pass these options to the chart components.
  - Handle loading and error states appropriately for these new charts.

## 5. Error Handling and Data Consistency

- Robust error handling for Phoenix API calls within Cloud Functions.
- Clear display of errors or "data unavailable" messages on the dashboard if Phoenix API is unreachable or returns errors.
- Consideration for caching Phoenix API responses in Cloud Functions if data doesn't change too frequently and API rate limits are a concern (e.g., using Firebase Cache service or a simple in-memory cache with TTL).

## 6. Implementation Next Steps

1.  **Develop Backend Cloud Functions:**
    *   Implement the logic for `getAdminServiceRequestStats`, `getOrgServiceRequestStats`, and `getPropertyManagerServiceRequestStats` (or integrate their logic into existing dashboard stats functions) focusing on the confirmed metrics (Average Completion Time for Admin/Org, Open/Closed Requests for PM).
    *   Ensure functions correctly call the Phoenix API endpoints (`/form-submissions/search/source-meta`, `/jobs/search/source-meta`) with appropriate filters as per the revised Section 3.
    *   Implement data transformation to prepare data for Highcharts.
    *   Include robust error handling and logging.
2.  **Implement Frontend Integration:**
    *   Update `AdminDashboardPanel.tsx`, `OrganizationManagerDashboardPanel.tsx`, and `PropertyManagerDashboardPanel.tsx` to reflect the current scope of Phoenix analytics.
    *   Remove UI elements for "Service Request Volume Trends."
    *   Reinstate UI elements for "Service Request Types Distribution."
    *   Ensure remaining Phoenix stats (Average Completion Time, Open/Closed Requests) are correctly fetched and displayed.
    *   Add state management for new Phoenix-sourced statistics.
    *   Implement `useEffect` hooks to call the Cloud Functions.
    *   Handle loading states and display error messages appropriately.
3.  **Thorough Testing:**
    *   Unit test Cloud Functions where possible.
    *   Perform integration testing of Cloud Functions calling the (temporarily unauthenticated) Phoenix API staging environment.
    *   Conduct end-to-end testing of dashboard views:
        *   Verify data accuracy for all metrics.
        *   Check chart rendering and interactivity.
        *   Test loading indicators and error state displays.
4.  **Security - Reinstate Authentication:**
    *   Once initial functionality is confirmed, coordinate with the Phoenix team to re-enable authentication on their endpoints.
    *   Update Cloud Functions to securely manage and send the required authentication tokens with API requests. This typically involves storing tokens as secrets (e.g., in Google Secret Manager) and accessing them at runtime.
5.  **Documentation Review:**
    *   Ensure this document (`12-dashboard-phoenix-integration-plan.md`) remains up-to-date as implementation progresses.
    *   Update any relevant Memory Bank files (`systemPatterns.md`, `activeContext.md`) with new patterns or decisions arising from this implementation.
