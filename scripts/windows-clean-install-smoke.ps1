param(
    [Parameter(Mandatory = $true)]
    [string]$InstallerPath,

    [string]$InstallDir = "$env:TEMP\FlexiKit-CleanMachine-Smoke",

    [int]$ExpectedToolCount = 44,

    [string]$ExpectedVersion = '0.1.0',

    [int]$UiTimeoutSeconds = 30
)

$ErrorActionPreference = 'Stop'
$installer = (Resolve-Path $InstallerPath).Path
$appDataRoot = Join-Path $env:LOCALAPPDATA 'com.flexikit.desktop'
$appDataExistedBefore = Test-Path $appDataRoot
$logPath = Join-Path $appDataRoot 'logs\flexikit.log'
$exePath = Join-Path $InstallDir 'flexikit-desktop.exe'
$uninstallPath = Join-Path $InstallDir 'uninstall.exe'
$process = $null
$passed = $false

function Get-FlexiKitUninstallEntries {
    $roots = @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    foreach ($root in $roots) {
        Get-ItemProperty $root -ErrorAction SilentlyContinue |
            Where-Object { $_.DisplayName -eq 'FlexiKit' }
    }
}

function Wait-ForToolCount {
    param(
        [int]$ProcessId,
        [int]$Expected,
        [int]$TimeoutSeconds
    )

    Add-Type -AssemblyName UIAutomationClient
    Add-Type -AssemblyName UIAutomationTypes

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    $expectedLabel = "$Expected 个工具"
    $expectedFilter = "全部 $Expected"

    while ([DateTime]::UtcNow -lt $deadline) {
        $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if (-not $proc) {
            throw 'FlexiKit exited before the main UI became ready.'
        }

        $processCondition = New-Object System.Windows.Automation.PropertyCondition(
            [System.Windows.Automation.AutomationElement]::ProcessIdProperty,
            $ProcessId
        )
        $roots = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
            [System.Windows.Automation.TreeScope]::Children,
            $processCondition
        )

        $main = $null
        for ($i = 0; $i -lt $roots.Count; $i++) {
            if ($roots.Item($i).Current.Name -eq 'FlexiKit') {
                $main = $roots.Item($i)
                break
            }
        }

        if ($main) {
            $descendants = $main.FindAll(
                [System.Windows.Automation.TreeScope]::Descendants,
                [System.Windows.Automation.Condition]::TrueCondition
            )
            $hasCount = $false
            $hasFilter = $false
            for ($i = 0; $i -lt $descendants.Count; $i++) {
                $name = $descendants.Item($i).Current.Name
                if ($name -eq $expectedLabel) { $hasCount = $true }
                if ($name -eq $expectedFilter) { $hasFilter = $true }
                if ($hasCount -and $hasFilter) { return $true }
            }
        }

        Start-Sleep -Milliseconds 500
    }

    return $false
}

function Wait-ForDiagnosticsLog {
    param([int]$TimeoutSeconds)

    $deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        if (Test-Path $logPath) {
            $text = Get-Content $logPath -Raw -ErrorAction SilentlyContinue
            if ($text -match '\tstartup\t' -and $text -match '\tsetup_complete\t') {
                return $true
            }
        }
        Start-Sleep -Milliseconds 300
    }
    return $false
}

try {
    if (Get-FlexiKitUninstallEntries) {
        throw 'A FlexiKit installation already exists. Run this smoke test only on a clean test machine or VM.'
    }

    if ($appDataExistedBefore) {
        throw "Existing FlexiKit user data found at $appDataRoot. Refusing clean-machine smoke test to protect user data."
    }

    if (Test-Path $InstallDir) {
        throw "Smoke install directory already exists: $InstallDir"
    }

    Write-Host "[1/6] Installing $installer"
    $install = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$InstallDir") -Wait -PassThru
    if ($install.ExitCode -ne 0) {
        throw "Installer exited with code $($install.ExitCode)."
    }
    if (-not (Test-Path $exePath) -or -not (Test-Path $uninstallPath)) {
        throw 'Installed executable or uninstaller is missing.'
    }

    Write-Host '[2/6] Verifying uninstall registration'
    $entry = Get-FlexiKitUninstallEntries | Select-Object -First 1
    if (-not $entry) {
        throw 'FlexiKit uninstall registration was not created.'
    }
    if ($entry.DisplayVersion -ne $ExpectedVersion) {
        throw "Unexpected installed version: $($entry.DisplayVersion); expected $ExpectedVersion"
    }

    Write-Host '[3/6] Starting installed application'
    $process = Start-Process -FilePath $exePath -PassThru
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) {
        throw "FlexiKit exited immediately with code $($process.ExitCode)."
    }

    Write-Host "[4/6] Waiting for $ExpectedToolCount tools in the real UI"
    if (-not (Wait-ForToolCount -ProcessId $process.Id -Expected $ExpectedToolCount -TimeoutSeconds $UiTimeoutSeconds)) {
        throw "UI did not expose $ExpectedToolCount tools within $UiTimeoutSeconds seconds."
    }

    Write-Host '[5/6] Verifying local diagnostics log'
    if (-not (Wait-ForDiagnosticsLog -TimeoutSeconds 10)) {
        throw "Diagnostics log did not contain startup/setup_complete: $logPath"
    }

    $passed = $true
    Write-Host 'CLEAN_MACHINE_SMOKE=PASS'
}
finally {
    Write-Host '[6/6] Cleaning up smoke installation'

    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }

    if (Test-Path $uninstallPath) {
        $uninstall = Start-Process -FilePath $uninstallPath -ArgumentList '/S' -Wait -PassThru
        if ($uninstall.ExitCode -ne 0) {
            Write-Warning "Uninstaller exited with code $($uninstall.ExitCode)."
            $passed = $false
        }
    }

    Start-Sleep -Milliseconds 700

    if (Test-Path $InstallDir) {
        Write-Warning "Install directory still exists after uninstall: $InstallDir"
        $passed = $false
    }
    if (Get-FlexiKitUninstallEntries) {
        Write-Warning 'FlexiKit uninstall registration still exists after uninstall.'
        $passed = $false
    }

    if (-not $appDataExistedBefore -and (Test-Path $appDataRoot)) {
        Remove-Item $appDataRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    if (-not $passed) {
        Write-Host 'CLEAN_MACHINE_SMOKE=FAIL'
        exit 1
    }
}
