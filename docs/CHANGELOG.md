# Changelog

All notable changes to this project will be documented in this file.

## [1.5.0] - 2026-07-14

### Added
- **Phase 4**: Implemented the Vision Foundation. This includes a `VisionManager` service that orchestrates screen capture of the target window and performs OCR to extract text. A centralized `LoggerService` has also been introduced.
- **Technical Debt Fixes**: Corrected architectural file locations, refactored `WindowTrackingService` to use a pub/sub model and central config, and replaced inefficient comparison logic.

## [1.4.0] - 2026-07-14

### Added
- **Phase 3**: Implemented the Overlay Foundation. A new transparent, always-on-top overlay window is now managed by a dedicated `OverlayManager` service. The overlay automatically follows and resizes with the target Olymp Trade window.
- **Architectural Improvements**: Refactored `WindowTrackingService` to use a pub/sub model for consumers. Replaced hardcoded configs with a central `config.ts` file. Replaced inefficient object comparison with a type-safe function.

## [1.3.0] - 2026-07-14

### Added
- **Phase 2 Complete**: Finalized the Olymp Trade integration layer. Replaced the initial detection logic with a robust, centralized `WindowTrackingService`. This service now tracks window position, size, and focus state, providing a single source of truth to the UI via a clean API and React Context.
- **Architectural Fixes**: Corrected file locations for `WindowTrackingService` and `WindowTrackingContext` to align with the documented folder structure. Removed duplicate polling mechanisms from the Electron main process.

## [1.2.0] - 2026-07-14

### Added
- **Phase 2B**: Implemented a centralized `WindowTrackingService` in Electron to monitor the target application's state (position, size, focus). Exposed a clean, implementation-agnostic API to the frontend. State is provided to React components via a new `WindowTrackingContext`, eliminating duplicate listeners and polling from the UI layer.

## [1.1.1] - 2026-07-14

### Fixed
- **Phase 2A Patch**: Centralized IPC listeners to a single source of truth in `MainLayout.tsx`. Replaced placeholder `StatusBar` with a functional component. Documented `active-win` as a temporary dependency. Removed duplicate state management from `TopBar` and `BottomBar`.

## [1.1.0] - 2026-07-14

### Added
- **Phase 2A**: Implemented live window detection for the Olymp Trade application via Electron IPC. Status is now reflected in the TopBar and BottomBar.

## [1.0.1] - 2026-07-14

### Added
- Implemented collapsible right-side information panel to improve responsive desktop layout (`RightPanel.tsx`).

## [1.0.0] - 2026-07-14

### Added
- **Phase 1A**: Initial implementation of the premium desktop shell, including core layout components, basic routing, a collapsible sidebar, and a functional theme system.