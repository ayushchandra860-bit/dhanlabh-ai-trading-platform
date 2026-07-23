# Known Issues

Last Updated: 2026-07-14

## Placeholder Data in UI

- **ID:** UI-001
- **Description:** Several UI components currently display static, hardcoded data instead of real-time information. This was done to facilitate UI development without requiring backend or Electron IPC integration during initial phases.
- **Affected Components:**
    - `TopBar`: Status indicators for "Backend", "Electron", and "Database" are hardcoded to "ok".
    - `RightPanel`: "CPU Usage" and "Memory Usage" display static values.
- **Resolution Strategy:** These placeholders will be replaced with live data in subsequent development phases dedicated to backend and Electron integration. The "Olymp Trade" status is now live as of Phase 2A.

## Third-Party Dependencies Pending Native Replacement

### `active-win`

- **ID:** DEP-001
- **Description:** The `active-win` package is used in the Electron main process to detect if the Olymp Trade application window is open. This is necessary because Electron's native APIs cannot enumerate or inspect windows belonging to other desktop applications.
- **Reason for Temporary Status:** While functional, relying on a third-party native module introduces potential cross-platform inconsistencies, performance overhead, and an additional dependency to maintain. The `active-win` package can only get information about the *currently active* window, which limits tracking capabilities.
- **Replacement Phase:** Post-Phase 2. The replacement is contingent on the availability of a native Electron API for window enumeration and will be scheduled as a dedicated technical debt task when feasible.
- **Migration Plan:**
    1.  When a suitable native Electron API becomes available, a new branch will be created to prototype the replacement.
    2.  The `WindowTrackingService` in `electron/main/services/WindowTrackingService.ts` will be refactored to use the new API, removing the dependency on `active-win`. The service's public-facing API is designed to be implementation-independent, so no frontend changes will be required.
    3.  The new implementation will be tested across all target platforms (Windows, macOS, Linux).
    4.  Once verified, the `active-win` dependency will be removed from `package.json`.
- **Known Limitations:**
    - The current implementation relies on a `setInterval` poll every 2 seconds, which is not event-driven and consumes minor but constant resources.
    - The window matching logic (`w.owner.name.includes('Olymp Trade') || w.title.includes('Olymp Trade')`) might be brittle if Olymp Trade changes its process or window title.
    - The service can only track detailed state (position, size) when the target window is *active and in the foreground*. It cannot track properties like `isMinimized`, `isMaximized`, or its position/size when it is not the active window. This is a fundamental limitation of the `active-win` package.
- **Rollback Strategy:** If the native API replacement proves unstable or does not meet requirements, the changes can be reverted by checking out the last commit before the migration and reapplying the `active-win` dependency.