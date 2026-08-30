param(
  [Parameter(Mandatory = $true)][string]$PluginSource,
  [Parameter(Mandatory = $true)][string]$GameModeOnSource,
  [Parameter(Mandatory = $true)][string]$GameModeOffSource,
  [Parameter(Mandatory = $true)][string]$GameBarOnSource,
  [Parameter(Mandatory = $true)][string]$GameBarOffSource,
  [Parameter(Mandatory = $true)][string]$SocialSource
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$pluginRoot = Join-Path $repositoryRoot "com.miguelangelstream.windows-xbox-settings.sdPlugin"
$webAssets = Join-Path $repositoryRoot "docs\assets"

function Save-ResizedPng {
  param(
    [string]$Source,
    [string]$Destination,
    [int]$Width,
    [int]$Height = $Width
  )

  $sourceImage = [System.Drawing.Image]::FromFile($Source)
  try {
    $canvas = [System.Drawing.Bitmap]::new($Width, $Height)
    try {
      $canvas.SetResolution(96, 96)
      $graphics = [System.Drawing.Graphics]::FromImage($canvas)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($sourceImage, 0, 0, $Width, $Height)
      }
      finally {
        $graphics.Dispose()
      }
      $directory = Split-Path -Parent $Destination
      [System.IO.Directory]::CreateDirectory($directory) | Out-Null
      $canvas.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $canvas.Dispose()
    }
  }
  finally {
    $sourceImage.Dispose()
  }
}

Save-ResizedPng $PluginSource (Join-Path $pluginRoot "imgs\plugin\marketplace-generated.png") 144
Save-ResizedPng $PluginSource (Join-Path $pluginRoot "imgs\plugin\marketplace-generated@2x.png") 288
Save-ResizedPng $PluginSource (Join-Path $pluginRoot "imgs\plugin\category-generated.png") 144
Save-ResizedPng $PluginSource (Join-Path $pluginRoot "imgs\plugin\category-generated@2x.png") 288

Save-ResizedPng $GameModeOnSource (Join-Path $pluginRoot "imgs\actions\game-mode\on-generated.png") 144
Save-ResizedPng $GameModeOnSource (Join-Path $pluginRoot "imgs\actions\game-mode\on-generated@2x.png") 288
Save-ResizedPng $GameModeOffSource (Join-Path $pluginRoot "imgs\actions\game-mode\off-generated.png") 144
Save-ResizedPng $GameModeOffSource (Join-Path $pluginRoot "imgs\actions\game-mode\off-generated@2x.png") 288
Save-ResizedPng $GameModeOnSource (Join-Path $pluginRoot "imgs\actions\game-mode\action-generated.png") 144
Save-ResizedPng $GameModeOnSource (Join-Path $pluginRoot "imgs\actions\game-mode\action-generated@2x.png") 288
Save-ResizedPng $GameBarOnSource (Join-Path $pluginRoot "imgs\actions\controller-game-bar\on-generated.png") 144
Save-ResizedPng $GameBarOnSource (Join-Path $pluginRoot "imgs\actions\controller-game-bar\on-generated@2x.png") 288
Save-ResizedPng $GameBarOffSource (Join-Path $pluginRoot "imgs\actions\controller-game-bar\off-generated.png") 144
Save-ResizedPng $GameBarOffSource (Join-Path $pluginRoot "imgs\actions\controller-game-bar\off-generated@2x.png") 288
Save-ResizedPng $GameBarOnSource (Join-Path $pluginRoot "imgs\actions\controller-game-bar\action-generated.png") 144
Save-ResizedPng $GameBarOnSource (Join-Path $pluginRoot "imgs\actions\controller-game-bar\action-generated@2x.png") 288

Save-ResizedPng $PluginSource (Join-Path $webAssets "plugin-icon.png") 512
Save-ResizedPng $PluginSource (Join-Path $webAssets "favicon.png") 64
Save-ResizedPng $GameModeOnSource (Join-Path $webAssets "game-mode-on.png") 512
Save-ResizedPng $GameModeOffSource (Join-Path $webAssets "game-mode-off.png") 512
Save-ResizedPng $GameBarOnSource (Join-Path $webAssets "game-bar-on.png") 512
Save-ResizedPng $GameBarOffSource (Join-Path $webAssets "game-bar-off.png") 512
Save-ResizedPng $SocialSource (Join-Path $webAssets "og.png") 1200 630
Save-ResizedPng $SocialSource (Join-Path $webAssets "hero-product.png") 1400 730

Write-Output "Recursos ImageGen preparados para Stream Deck y GitHub Pages."
