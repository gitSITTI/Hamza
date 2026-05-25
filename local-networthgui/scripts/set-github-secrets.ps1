param(
  [string]$Repository = "gitSITTI/Hamza"
)

$ErrorActionPreference = "Stop"

$secretNames = @(
  "BEA_API_KEY",
  "CONGRESS_GOV_API_KEY",
  "FEC_API_KEY",
  "HUDUSER_API_KEY",
  "REGULATIONS_GOV_API_KEY",
  "GOVINFO_API_KEY",
  "CENSUS_API_KEY",
  "PACER_ACCOUNT"
)

foreach ($name in $secretNames) {
  $value = [Environment]::GetEnvironmentVariable($name, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "Skipping $name because it is not set in this shell."
    continue
  }

  $value | gh secret set $name --repo $Repository --body-file -
  Write-Host "Set GitHub secret $name on $Repository."
}
