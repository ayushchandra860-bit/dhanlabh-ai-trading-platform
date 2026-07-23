# DhanLabh AI V2 - Architecture

This document outlines the high-level architecture of the DhanLabh AI V2 application.

## Project Layers

The application is designed with a multi-layered architecture to separate concerns and improve modularity.

1.  **Presentation Layer (Electron Shell)**: The native desktop container built with Electron. It is responsible for creating and managing the main application window, system tray integration, and handling native OS interactions.

2.  **Frontend Layer (React UI)**: The user interface, built as a Single Page Application (SPA) using React and Vite. This layer runs inside the Electron's BrowserWindow and is responsible for all user-facing views and interactions.

3.  **Backend Layer (FastAPI Server)**: A Python-based API server built with FastAPI. It handles business logic, data processing, AI model integration, and communication with the database.

4.  **Data Layer (SQLite)**: The persistence layer, using SQLite for local data storage. It is managed by the backend via SQLAlchemy.

## Folder Responsibilities

*   `/electron/`: Contains all source code for the Electron main and preload processes.
*   `/frontend/`: The root for the React application, including `index.html` and the `src` directory.
*   `/backend/`: Contains the FastAPI application, including API endpoints, database models, and business logic.
*   `/shared/`: Holds code and type definitions (e.g., TypeScript interfaces) that are shared between the frontend and Electron layers.
*   `/database/`: Contains database-specific files, such as migrations and base model definitions.
*   `/public/`: Static assets that are served directly by the Vite dev server or copied to the build output.
*   `/docs/`: Project documentation.
*   `/scripts/`: Utility scripts for automation, building, etc.
*   `/tests/`: Contains all tests (unit, integration, e2e).
*   `/models/`: For storing trained AI/ML models.

## Module Responsibilities

*   `electron/main.ts`: The entry point for the Electron application. Creates the browser window and handles system events.
*   `electron/preload.ts`: A script that runs in a privileged context to bridge the gap between the Electron main process and the frontend (renderer process).
*   `frontend/src/main.tsx`: The entry point for the React application.
*   `backend/app/main.py`: The entry point for the FastAPI application.

## Dependency Rules

*   **Frontend → Backend**: The frontend communicates with the backend exclusively through HTTP requests to the FastAPI server.
*   **Frontend → Electron**: The frontend can invoke functions exposed by the Electron main process via the `preload.ts` script and `ipcRenderer`.
*   **No Circular Dependencies**: A strict no-circular-dependency rule is enforced between layers and modules.
*   **Root Directory**: The root directory contains only configuration files, not source code.