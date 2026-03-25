param(
  [switch]$SkipFetch,
  [string]$BaseUrl,
  [Alias("Host")]
  [string]$Domain = "127.0.0.1",
  [int]$Port = 3000,
  [string]$Scheme = "http",
  [string]$SchemaUrl,
  [string]$ApiPrefix = "/admin/im/v3"
)

$ErrorActionPreference = "Stop"
$workspaceDir = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "..\..")).Path
$forwardedArgs = @{
  Languages = @("typescript")
  SkipFetch = $SkipFetch
  Domain = $Domain
  Port = $Port
  Scheme = $Scheme
  ApiPrefix = $ApiPrefix
}
if ($PSBoundParameters.ContainsKey("BaseUrl")) {
  $forwardedArgs["BaseUrl"] = $BaseUrl
}
if ($PSBoundParameters.ContainsKey("SchemaUrl")) {
  $forwardedArgs["SchemaUrl"] = $SchemaUrl
}
& (Join-Path $workspaceDir "bin\generate-sdk.ps1") @forwardedArgs
exit $LASTEXITCODE
