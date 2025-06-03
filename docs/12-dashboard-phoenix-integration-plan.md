# 12. Dashboard Phoenix Integration Plan: Service Request Analytics

This document outlines the plan for Phase 1.C of the "Dashboard Data Visualizations & Statistics" feature, which focuses on integrating service request analytics data from the Phoenix API into the Admin, Organization Manager, and Property Manager dashboards.

## 1. Objective

To provide users with insights into service request volumes, types, and performance metrics by fetching and displaying data sourced from the Phoenix API. This will complement the existing non-Phoenix related statistics already implemented.

## 2. Prerequisites

*   **Phoenix API Documentation:** Availability of detailed documentation for Phoenix API endpoints that allow querying of aggregated and/or raw service job data. This includes:
    *   Endpoints for fetching job counts (by type, status, date range).
    *   Endpoints for fetching data related to job timings (e.g., creation, assignment, completion times) to calculate average durations.
    *   Filtering capabilities based on metadata sent from this application (e.g., `clientOrganizationId`, `clientPropertyId`, `requestSourceIdentifier`).
    *   Authentication methods and rate limits for these API endpoints.
*   **Existing Dashboard Infrastructure:** The current dashboard panels (`AdminDashboardPanel`, `OrganizationManagerDashboardPanel`, `PropertyManagerDashboardPanel`) and chart wrapper components (`KpiCard`, `LineChart`, `BarChart`, etc.) will be leveraged.

## 3. Scope of Phoenix Integration for Dashboards

The following statistics are planned, contingent on Phoenix API capabilities:

### 3.1. Admin Dashboard

*   **Service Request Volume Trends (Platform-Wide):**
    *   Metric: Total service requests over time (e.g., daily, weekly, monthly).
    *   Chart: Line chart.
    *   Data Source: Phoenix API.
*   **Service Request Types Distribution (Platform-Wide):**
    *   Metric: Breakdown of service requests by type (e.g., "tire_change", "jump_start").
    *   Chart: Pie chart or Bar chart.
    *   Data Source: Phoenix API.
*   **Average Service Completion Time (Platform-Wide):**
    *   Metric: Average time from request creation/dispatch to completion.
    *   Chart: KPI Card or trend line.
    *   Data Source: Phoenix API (requires start/end timestamps per job).

### 3.2. Organization Manager Dashboard (Scoped to Selected Organization)

*   **Service Request Volume (Per Organization):**
    *   Metric: Total service requests over time for the selected organization.
    *   Chart: Line chart.
    *   Data Source: Phoenix API, filtered by `clientOrganizationId`.
*   **Service Request Types (Per Organization):**
    *   Metric: Breakdown by type for the selected organization.
    *   Chart: Pie or Bar chart.
    *   Data Source: Phoenix API, filtered by `clientOrganizationId`.
*   **Average Completion Time (Per Organization):**
    *   Metric: Average time for the selected organization.
    *   Chart: KPI Card or trend line.
    *   Data Source: Phoenix API, filtered by `clientOrganizationId`.
*   **(Optional) Top Properties by Service Request Volume:**
    *   Metric: List or bar chart of properties with the highest request volumes within the organization.
    *   Data Source: Phoenix API, aggregated by `clientPropertyId` within the `clientOrganizationId`.

### 3.3. Property Manager Dashboard (Scoped to Selected Property)

*   **Service Request Volume (Per Property):**
    *   Metric: Total service requests over time for the selected property.
    *   Chart: Line chart.
    *   Data Source: Phoenix API, filtered by `clientPropertyId` (and `clientOrganizationId`).
*   **Service Request Types (Per Property):**
    *   Metric: Breakdown by type for the selected property.
    *   Chart: Pie or Bar chart.
    *   Data Source: Phoenix API, filtered by `clientPropertyId`.
*   **Open vs. Closed Requests (Per Property):**
    *   Metric: Count of currently open and recently closed service requests.
    *   Chart: KPI Cards or a simple Bar chart.
    *   Data Source: Phoenix API, filtered by `clientPropertyId` and status.

## 4. Technical Implementation Plan

### 4.1. Backend (New/Updated Cloud Functions)

New Firebase Cloud Functions (callable) will be created, or existing ones updated, to interact with the Phoenix API. These functions will be responsible for:
*   Authenticating with the Phoenix API.
*   Making requests to the appropriate Phoenix API endpoints.
*   Transforming the data received from Phoenix into a format suitable for the frontend charts.
*   Handling errors gracefully.

*   **`getAdminServiceRequestStats` (New or Expanded `getAdminDashboardStats`):**
    *   Fetches platform-wide service request data from Phoenix.
*   **`getOrgServiceRequestStats` (New or Expanded `getOrgManagerDashboardStats`):**
    *   Inputs: `organizationId`, `dateRange?`
    *   Fetches service request data for the specified `organizationId` from Phoenix.
*   **`getPropertyManagerServiceRequestStats` (Expanded):**
    *   Inputs: `organizationId`, `propertyId`, `dateRange?`
    *   Fetches service request data for the specified `propertyId` from Phoenix.

### 4.2. Frontend (Dashboard Panel Updates)

The existing dashboard panel components will be updated:
*   **State Management:** Add new state variables to hold the Phoenix-sourced statistics and their loading/error states.
*   **Data Fetching:** Modify `useEffect` hooks (or add new ones) to call the new/updated Cloud Functions when the respective dashboard tab is active and necessary filters (like `organizationId` or `propertyId`) are selected.
*   **Chart Integration:** Use the existing chart wrapper components (`LineChart`, `PieChart`, `KpiCard`, etc.) to display the data fetched from Phoenix.
    *   Construct Highcharts `options` objects based on the data returned by the Cloud Functions.
    *   Pass these options to the chart components.
    *   Handle loading and error states appropriately for these new charts.

## 5. Error Handling and Data Consistency

*   Robust error handling for Phoenix API calls within Cloud Functions.
*   Clear display of errors or "data unavailable" messages on the dashboard if Phoenix API is unreachable or returns errors.
*   Consideration for caching Phoenix API responses in Cloud Functions if data doesn't change too frequently and API rate limits are a concern (e.g., using Firebase Cache service or a simple in-memory cache with TTL).

## 6. Next Steps (Once Phoenix API Docs are Available)

1.  **Review Phoenix API Documentation:** Understand available endpoints, request/response formats, authentication, and rate limits.
2.  **Refine Scope:** Adjust the planned statistics based on what data is realistically available and performant to query from Phoenix.
3.  **Implement Backend Functions:** Develop and test the Cloud Functions that interface with Phoenix.
4.  **Implement Frontend Integration:** Update dashboard panels to call these functions and display the new charts.
5.  **Thorough Testing:** Test data accuracy, chart rendering, loading states, and error handling across all relevant dashboard views.
