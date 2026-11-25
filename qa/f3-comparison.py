from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root = Path('.')
f0 = Image.open(root/'qa/f0/screenshots/compatible-1440.png').convert('RGB')
f3 = Image.open(root/'docs/F3/screenshots/01-front.png').convert('RGB')
W, H = f0.size
head = 74
out = Image.new('RGB', (W*2, H+head), '#071018')
out.paste(f0, (0, head)); out.paste(f3, (W, head))
d = ImageDraw.Draw(out)
font_path = r'C:\Windows\Fonts\segoeui.ttf'
small_path = r'C:\Windows\Fonts\segoeuil.ttf'
try:
    title = ImageFont.truetype(font_path, 26)
    small = ImageFont.truetype(small_path, 16)
except Exception:
    title = ImageFont.load_default(); small = ImageFont.load_default()
d.text((28, 18), 'F0 · BEFORE  (8.0m / 7 layers / 220 lights / gold star)', fill='#c9d5d2', font=title)
d.text((W+28, 18), 'F3 · AFTER  (9.5m / 9 layers / 360 lights / crystal heart / double helix)', fill='#ffd58a', font=title)
d.text((28, H+head-25), 'Real Edge screenshots · 1440×900 · compatible pipeline · F0 commit c9e3d02', fill='#7d9998', font=small)
d.text((W+28, H+head-25), 'Real Edge screenshots · 1440×900 · compatible pipeline · F3 tree reconstruction', fill='#7d9998', font=small)
# thin divider
d.line([(W, 0), (W, H+head)], fill='#5b4630', width=2)
out.save(root/'docs/F3/screenshots/00-f0-vs-f3.png', optimize=True)
print(out.size)
