param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $RemainingArgs
)

$ErrorActionPreference = "Stop"
$workspaceDir = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\..")).Path
& node (Join-Path $workspaceDir "bin\assemble-sdk.mjs") --language typescript @RemainingArgs
exit $LASTEXITCODE
