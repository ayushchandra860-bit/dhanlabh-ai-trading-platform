# migrate.ps1

# Set the script to stop on any error
$ErrorActionPreference = "Stop"

# Get the directory where the script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "Starting DhanLabh AI V2 folder structure migration..."
Write-Host "Script directory: $scriptDir"

# Define the target folder structure
$targetFolders = @(
    "backend/app",
    "backend/api",
    "backend/core",
    "backend/services",
    "backend/ai",
    "backend/vision",
    "backend/database",
    "backend/models",
    "backend/utils",
    "frontend/src/pages",
    "frontend/src/components",
    "frontend/src/layouts",
    "frontend/src/hooks",
    "frontend/src/services",
    "frontend/src/styles",
    "frontend/src/assets",
    "overlay/src/components",
    "overlay/src/services",
    "overlay/src/hooks",
    "overlay/src/styles",
    "electron/main",
    "electron/preload",
    "electron/ipc",
    "electron/utils",
    "shared/types",
    "shared/interfaces",
    "shared/constants",
    "shared/utils",
    "database/migrations",
    "docs",
    "scripts",
    "tests",
    "models",
    "public"
)

Write-Host "`nCreating target folders..."
foreach ($folder in $targetFolders) {
    $fullPath = Join-Path $scriptDir $folder
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath | Out-Null
        Write-Host "Created folder: $folder"
    } else {
        Write-Host "Folder already exists: $folder (Skipping creation)"
    }
}

# Define file movements
# Key = Source Path (relative to scriptDir)
# Value = Destination Path (relative to scriptDir)
$fileMoves = @{
    # Docs
    "MASTER_RULES.md" = "docs/MASTER_RULES.md";
    "ARCHITECTURE.md" = "docs/ARCHITECTURE.md";
    "FEATURES.md" = "docs/FEATURES.md";

    # Backend
    "config.py" = "backend/app/config.py";
    "main.py" = "backend/app/main.py";
    "startup.py" = "backend/app/startup.py";
    "base.py" = "backend/database/base.py";

    # Frontend
    "index.html" = "frontend/index.html";
    "App.css" = "frontend/src/styles/App.css";
    "App.tsx" = "frontend/src/pages/App.tsx"; # Assuming App.tsx is a main page component
    "index.css" = "frontend/src/styles/index.css";
    "frontend/src/main.tsx" = "frontend/src/main.tsx"; # This file is already in frontend/src, so it should stay there.

    # Electron
    "main.ts" = "electron/main/main.ts";
    "preload.ts" = "electron/preload/preload.ts";

    # Shared
    "shared/index.ts" = "shared/types/index.ts"; # Assuming index.ts contains types
}

Write-Host "`nMoving files..."
foreach ($sourceRelativePath in $fileMoves.Keys) {
    $sourcePath = Join-Path $scriptDir $sourceRelativePath
    $destinationRelativePath = $fileMoves[$sourceRelativePath]
    $destinationPath = Join-Path $scriptDir $destinationRelativePath

    if (-not (Test-Path $sourcePath)) {
        Write-Warning "Source file not found: $sourceRelativePath (Skipping move)"
        continue
    }

    if (Test-Path $destinationPath) {
        Write-Host "Destination file already exists: $destinationRelativePath (Skipping move)"
        continue
    }

    Write-Host "Moving '$sourceRelativePath' to '$destinationRelativePath'"
    Move-Item -Path $sourcePath -Destination $destinationPath -Force:$false # Force:$false prevents overwriting
}

Write-Host "`nMigration complete. Printing final directory tree..."

# Change directory to the script's root to run tree /F correctly
Set-Location $scriptDir

# Print the directory tree
cmd /c "tree /F"

Write-Host "`nMigration script finished."