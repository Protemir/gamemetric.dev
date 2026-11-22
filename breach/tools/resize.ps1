# Resizes a picture into a JPEG of the given size (texture prep, Windows only):
#   powershell -File breach/tools/resize.ps1 <in> <out.jpg> <width> <height> [quality] [cropTopFraction]
# cropTopFraction keeps only the top part of the source (e.g. 0.5 = the upper half of a sky panorama).
param([string]$In, [string]$Out, [int]$W, [int]$H, [int]$Q = 85, [double]$Crop = 1.0)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$dst = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$srcRect = New-Object System.Drawing.Rectangle 0, 0, $src.Width, ([int]($src.Height * $Crop))
$dstRect = New-Object System.Drawing.Rectangle 0, 0, $W, $H
$g.DrawImage($src, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$Q)
$dst.Save($Out, $codec, $ep)
$g.Dispose(); $dst.Dispose(); $src.Dispose()
Write-Output "$Out ${W}x${H}"
