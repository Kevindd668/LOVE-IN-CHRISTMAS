from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path('.')
heart=Image.open(root/'docs/F3/final-screenshots/01-overall.png').convert('RGB')
heart.crop((860,100,1240,500)).save(root/'docs/F3/final-screenshots/08-heart.png', optimize=True)
a=Image.open(root/'qa/f0/screenshots/compatible-1440.png').convert('RGB')
b=Image.open(root/'docs/F3/final-screenshots/01-overall.png').convert('RGB')
w,h=a.size; head=50
out=Image.new('RGB',(w*2,h+head),'#071018'); out.paste(a,(0,head)); out.paste(b,(w,head))
d=ImageDraw.Draw(out); font=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf',20)
d.text((16,14),'BEFORE · F0 baseline',fill='#c9d5d2',font=font); d.text((w+16,14),'AFTER · F3 WP1-WP6',fill='#ffd58a',font=font); d.line([(w,0),(w,h+head)],fill='#5b4630',width=2)
out.save(root/'docs/F3/final-screenshots/11-before-after.png',optimize=True); print('ok')
