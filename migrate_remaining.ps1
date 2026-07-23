# migrate_remaining.ps1

# Set the script to stop on any error
$ErrorActionPreference = "Stop"

# Get the directory where the script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "Starting remaining file migration for DhanLabh AI V2..."
Write-Host "Script directory: $scriptDir"

# Define file movements for remaining files
# Key = Source Path (relative to scriptDir)
# Value = Destination Path (relative to scriptDir)
$fileMoves = @{
    "BottomPanel.tsx" = "frontend/src/components/BottomPanel.tsx";
    "RightPanel.tsx" = "frontend/src/components/RightPanel.tsx";
    "Sidebar.tsx" = "frontend/src/components/Sidebar.tsx";
    "StatusBar.tsx" = "frontend/src/components/StatusBar.tsx";
    "TopBar.tsx" = "frontend/src/components/TopBar.tsx";
    "LiveAI.tsx" = "frontend/src/pages/LiveAI.tsx";
    "Settings.tsx" = "frontend/src/pages/Settings.tsx";
    "TradeJournal.tsx" = "frontend/src/pages/TradeJournal.tsx";
    # Note: main.tsx and index.ts are handled with skip logic to prevent overwriting
    # if they were already moved or if a destination file already exists.
    "main.tsx" = "frontend/src/main.tsx";
    "index.ts" = "shared/types/index.ts";
}

Write-Host "`nMoving remaining files..."
foreach ($sourceRelativePath in $fileMoves.Keys) {
    $sourcePath = Join-Path $scriptDir $sourceRelativePath
    $destinationRelativePath = $fileMoves[$sourceRelativePath]
    $destinationPath = Join-Path $scriptDir $destinationRelativePath

    # Ensure the destination directory exists before attempting to move
    $destinationDir = Split-Path -Parent $destinationPath
    if (-not (Test-Path $destinationDir)) {
        New-Item -ItemType Directory -Path $destinationDir | Out-Null
        Write-Host "Created missing destination directory: $destinationDir"
    }

    if (-not (Test-Path $sourcePath)) {
        Write-Warning "Source file not found: '$sourceRelativePath' (Skipping move)"
        continue
    }

    if (Test-Path $destinationPath) {
        Write-Host "Destination file already exists: '$destinationRelativePath' (Skipping move to prevent overwrite)"
        continue
    }

    Write-Host "Moving '$sourceRelativePath' to '$destinationRelativePath'"
    Move-Item -Path $sourcePath -Destination $destinationPath -Force:$false # Force:$false prevents overwriting
}

Write-Host "`nMigration complete. Printing final directory tree..."
Set-Location $scriptDir
cmd /c "tree /F"
Write-Host "`nMigration script finished."