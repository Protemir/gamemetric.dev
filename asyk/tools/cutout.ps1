# Turns the Gemini art in E:\PS\asyk-art into game sprites in asyk/img:
# keys out the chroma-green background, splits group shots into single sprites, scales them down.
# Run: powershell -ExecutionPolicy Bypass -File asyk/tools/cutout.ps1
param(
  [string]$Src = "E:\PS\asyk-art",
  [string]$Out = (Join-Path $PSScriptRoot "..\img")
)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class Cut {
  // green = how much the pixel's green beats red and blue; lo..hi fades it out
  public static Bitmap Key(Bitmap src, int lo, int hi) {
    var b = new Bitmap(src.Width, src.Height, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(b)) g.DrawImage(src, 0, 0, src.Width, src.Height);
    var r = new Rectangle(0, 0, b.Width, b.Height);
    var d = b.LockBits(r, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    var px = new byte[d.Stride * b.Height];
    Marshal.Copy(d.Scan0, px, 0, px.Length);
    for (int i = 0; i < px.Length; i += 4) {
      int B = px[i], G = px[i + 1], R = px[i + 2];
      int m = Math.Max(R, B);
      int k = G - m;
      int a = k <= lo ? 255 : k >= hi ? 0 : 255 * (hi - k) / (hi - lo);
      if (G > m) px[i + 1] = (byte)m; // no green fringe
      px[i + 3] = (byte)a;
    }
    Marshal.Copy(px, 0, d.Scan0, px.Length);
    b.UnlockBits(d);
    return b;
  }

  static byte[] Alpha(Bitmap b, out int stride) {
    var d = b.LockBits(new Rectangle(0, 0, b.Width, b.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var px = new byte[d.Stride * b.Height];
    Marshal.Copy(d.Scan0, px, 0, px.Length);
    stride = d.Stride;
    b.UnlockBits(d);
    return px;
  }

  // runs of columns (axis 0) or rows (axis 1) inside [from,to) that hold enough solid pixels
  public static int[] Runs(Bitmap b, int axis, Rectangle area, int minGap, int minSize) {
    int stride; var px = Alpha(b, out stride);
    int n = axis == 0 ? area.Width : area.Height;
    var solid = new bool[n];
    for (int i = 0; i < n; i++) {
      int c = 0;
      int m = axis == 0 ? area.Height : area.Width;
      for (int j = 0; j < m; j++) {
        int x = axis == 0 ? area.X + i : area.X + j;
        int y = axis == 0 ? area.Y + j : area.Y + i;
        if (px[y * stride + x * 4 + 3] > 128) c++;
      }
      solid[i] = c > 3;
    }
    var res = new List<int>();
    int start = -1, gap = 0;
    for (int i = 0; i <= n; i++) {
      bool s = i < n && solid[i];
      if (s) { if (start < 0) start = i; gap = 0; }
      else if (start >= 0) {
        gap++;
        if (gap >= minGap || i == n) {
          int end = i - gap + 1;
          if (end - start >= minSize) { res.Add(start); res.Add(end); }
          start = -1; gap = 0;
        }
      }
    }
    return res.ToArray();
  }

  // solid pixels in every column of the area
  public static int[] Counts(Bitmap b, Rectangle area) {
    int stride; var px = Alpha(b, out stride);
    var c = new int[area.Width];
    for (int x = 0; x < area.Width; x++)
      for (int y = area.Y; y < area.Bottom; y++)
        if (px[y * stride + (area.X + x) * 4 + 3] > 128) c[x]++;
    return c;
  }

  public static Rectangle Bounds(Bitmap b, Rectangle area) {
    int stride; var px = Alpha(b, out stride);
    int x0 = int.MaxValue, y0 = int.MaxValue, x1 = -1, y1 = -1;
    for (int y = area.Y; y < area.Bottom; y++)
      for (int x = area.X; x < area.Right; x++)
        if (px[y * stride + x * 4 + 3] > 40) {
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
    if (x1 < 0) return Rectangle.Empty;
    return Rectangle.FromLTRB(x0, y0, x1 + 1, y1 + 1);
  }

  public static Bitmap Crop(Bitmap b, Rectangle r, int pad, double scale) {
    r = Rectangle.Intersect(new Rectangle(r.X - pad, r.Y - pad, r.Width + pad * 2, r.Height + pad * 2), new Rectangle(0, 0, b.Width, b.Height));
    int w = Math.Max(1, (int)Math.Round(r.Width * scale)), h = Math.Max(1, (int)Math.Round(r.Height * scale));
    var o = new Bitmap(w, h, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(o)) {
      g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
      g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
      g.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
      g.DrawImage(b, new Rectangle(0, 0, w, h), r, GraphicsUnit.Pixel);
    }
    return o;
  }
}
"@

New-Item -ItemType Directory -Force $Out | Out-Null
$Out = (Resolve-Path $Out).Path
function Load($name) { [System.Drawing.Bitmap]::FromFile((Join-Path $Src $name)) }
$meta = @{}

# yards: plain JPEG, 1920 wide
$enc = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 84L
foreach ($yn in "yard", "school", "winter") {
  if (-not (Test-Path (Join-Path $Src "$yn.jpg"))) { continue }
  $y = Load "$yn.jpg"
  $small = New-Object System.Drawing.Bitmap 1920, ([int](1920 * $y.Height / $y.Width))
  $g = [System.Drawing.Graphics]::FromImage($small)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($y, 0, 0, $small.Width, $small.Height)
  $small.Save((Join-Path $Out "$yn.jpg"), $enc, $ep)
  $g.Dispose(); $small.Dispose(); $y.Dispose()
  "$yn.jpg"
}

# hands: cropped to the hand, the crop's place in the 16:9 frame goes to sprites.json so both poses line up
foreach ($h in "hand-hold", "hand-open") {
  $b = Load "$h.jpg"
  $k = [Cut]::Key($b, 40, 100)
  $r = [Cut]::Bounds($k, (New-Object System.Drawing.Rectangle 0, 0, $k.Width, $k.Height))
  $s = 0.45
  $c = [Cut]::Crop($k, $r, 0, $s)
  $c.Save((Join-Path $Out "$h.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $meta[$h] = @{ x = [int]($r.X * $s); y = [int]($r.Y * $s); w = $c.Width; h = $c.Height; fw = [int]($k.Width * $s); fh = [int]($k.Height * $s) }
  "$h.png $($c.Width)x$($c.Height)"
  $c.Dispose(); $k.Dispose(); $b.Dispose()
}

# a row of figures on green (kids, an aga's poses, animals), cut by empty columns;
# figures that touch come out as one wide run: the widest is cut at its thinnest column
function SplitRow($file, $names, $scale) {
  if (-not (Test-Path (Join-Path $Src $file))) { "skip $file"; return }
  $count = $names.Count
  $b = Load $file
  $k = [Cut]::Key($b, 40, 100)
  $all = New-Object System.Drawing.Rectangle 0, 0, $k.Width, $k.Height
  $runs = [System.Collections.ArrayList]@([Cut]::Runs($k, 0, $all, 6, 120))
  while ($runs.Count / 2 -lt $count) {
    $wi = 0
    for ($i = 1; $i -lt $runs.Count / 2; $i++) { if (($runs[2 * $i + 1] - $runs[2 * $i]) -gt ($runs[2 * $wi + 1] - $runs[2 * $wi])) { $wi = $i } }
    $a = $runs[2 * $wi]; $z = $runs[2 * $wi + 1]
    $cnt = [Cut]::Counts($k, (New-Object System.Drawing.Rectangle $a, 0, ($z - $a), $k.Height))
    $best = [int](($z - $a) * 0.3); $lo = $best; $hi = [int](($z - $a) * 0.7)
    for ($x = $lo; $x -lt $hi; $x++) { if ($cnt[$x] -lt $cnt[$best]) { $best = $x } }
    $runs.Insert(2 * $wi + 1, $a + $best)
    $runs.Insert(2 * $wi + 2, $a + $best)
  }
  "$file : $($runs.Count / 2) runs"
  for ($i = 0; $i -lt [Math]::Min($count, $runs.Count / 2); $i++) {
    $col = New-Object System.Drawing.Rectangle $runs[2 * $i], 0, ($runs[2 * $i + 1] - $runs[2 * $i]), $k.Height
    $r = [Cut]::Bounds($k, $col)
    $c = [Cut]::Crop($k, $r, 4, $scale)
    $c.Save((Join-Path $Out "$($names[$i]).png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $script:meta[$names[$i]] = @{ w = $c.Width; h = $c.Height }
    $c.Dispose()
  }
  $k.Dispose(); $b.Dispose()
}

# kids: the same kid keeps the same number in every pose
foreach ($pose in "watch", "cheer", "sad") { SplitRow "kids-$pose.jpg" @(0..4 | ForEach-Object { "kid$_-$pose" }) 0.4 }
# the agas: four poses of one teenager
foreach ($pose in "watch", "cheer", "sad") { SplitRow "kidsw-$pose.jpg" @(0..4 | ForEach-Object { "kidw$_-$pose" }) 0.4 }
foreach ($a in "erlan", "dauren", "saken") { SplitRow "aga-$a.jpg" @("watch", "throw", "cheer", "sad" | ForEach-Object { "aga-$a-$_" }) 0.4 }
SplitRow "animals.jpg" @("hen-walk", "hen-peck", "rooster", "dog-trot", "dog-sit") 0.3

# knucklebones: two rows (pale, red) of four sides (alshy, taike, buk, shik)
$b = Load "asyks.jpg"
$k = [Cut]::Key($b, 40, 100)
$all = New-Object System.Drawing.Rectangle 0, 0, $k.Width, $k.Height
$rows = [Cut]::Runs($k, 1, $all, 8, 80)
"asyk rows: $($rows.Length / 2)"
$sides = "alshy", "taike", "buk", "shik"
$colors = "white", "red"
for ($ri = 0; $ri -lt [Math]::Min(2, $rows.Length / 2); $ri++) {
  $band = New-Object System.Drawing.Rectangle 0, $rows[2 * $ri], $k.Width, ($rows[2 * $ri + 1] - $rows[2 * $ri])
  $cols = [Cut]::Runs($k, 0, $band, 8, 80)
  "  row $ri : $($cols.Length / 2) bones"
  for ($ci = 0; $ci -lt [Math]::Min(4, $cols.Length / 2); $ci++) {
    $cell = New-Object System.Drawing.Rectangle $cols[2 * $ci], $band.Y, ($cols[2 * $ci + 1] - $cols[2 * $ci]), $band.Height
    $r = [Cut]::Bounds($k, $cell)
    $scale = 220.0 / [Math]::Max($r.Width, $r.Height)
    $c = [Cut]::Crop($k, $r, 2, $scale)
    $name = "asyk-$($colors[$ri])-$($sides[$ci])"
    $c.Save((Join-Path $Out "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $meta[$name] = @{ w = $c.Width; h = $c.Height }
    $c.Dispose()
  }
}
$k.Dispose(); $b.Dispose()

$meta | ConvertTo-Json -Depth 3 | Set-Content -Encoding utf8 (Join-Path $Out "sprites.json")
"done"
