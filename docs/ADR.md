# Architectural Decision Records

This document records key architectural decisions for the DhanLabh AI V2 project.

## ADR-001: Centralized Window Tracking Service

**Date:** 2026-07-14

**Status:** Accepted

### Context

Phase 2B requires tracking the state of an external application window (e.g., Olymp Trade), including its position, size, and focus state. This information needs to be available to various UI components in the frontend (React) layer without duplicating logic or creating multiple polling mechanisms, which would be inefficient and hard to maintain.

### Decision

We will implement a dedicated, singleton service within the Electron main process, named `WindowTrackingService`.

- **Responsibilities:** This service is solely responsible for polling the system for the target window's state using the `active-win` library. It maintains the last known state and compares it against the current state to detect changes.
- **Communication:** Upon detecting a change, the service triggers a callback provided during its instantiation. This callback, located in `main.ts`, sends an IPC message (`window-tracking:state-update`) to the renderer process (frontend).
- **Frontend API:** The service's functionality is exposed to the frontend via the `preload.ts` script under `window.electronAPI.windowTracking`. This API provides methods to get the current state and subscribe to updates.
- **State Consumption (React):** A React Context (`WindowTrackingContext`) is used to subscribe to the IPC events once at a high level in the component tree. This makes the window state available to any child component via a custom hook (`useWindowTracking`) without creating redundant IPC listeners.

### Reason

1.  **Single Source of Truth:** Centralizing the tracking logic in one service ensures that there is only one polling timer (`setInterval`) and one source for the window's state, preventing inconsistencies.
2.  **Separation of Concerns:** This approach strictly adheres to the project's architecture rules. Detection logic is isolated in an Electron service, UI logic remains in React, and the two are decoupled via IPC. React components are consumers of data, not producers of system state.
3.  **Performance:** By polling only in one place and pushing updates only on change, we minimize CPU usage and IPC traffic.
4.  **Maintainability & Migration:** Encapsulating the `active-win` logic within this service creates an abstraction layer. When a native Electron API for window enumeration becomes available, we only need to modify the internal implementation of `WindowTrackingService`. The rest of the application will remain unchanged.

### Alternatives

1.  **Polling in React:** Each component that needs window information could poll via an IPC call.
    - **Rejected Because:** This would lead to multiple, uncoordinated timers, causing significant performance degradation and violating the "No duplicate polling" rule.
2.  **Polling in `MainLayout.tsx`:** The top-level React component could house the `setInterval`.
    - **Rejected Because:** This places system-level detection logic inside the UI layer (React), violating the architectural rule that "React must never contain detection logic."

### Risk Analysis

- **Dependency Limitation:** The chosen implementation relies on `active-win`, which can only report information about the *currently active* window. This means we cannot track the state (e.g., minimized, position) of the target window when it is in the background. This is a known and accepted limitation.
- **Performance:** The polling mechanism, while efficient in this design, is not as performant as a true event-driven system. The resource usage is constant but minimal.

### Future Migration

The service is designed as a "black box." To migrate away from `active-win`, only the private `poll` method within `WindowTrackingService.ts` needs to be rewritten to use a new native API. No other files will need to be changed.