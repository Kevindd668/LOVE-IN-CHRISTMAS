from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path('.')
a=Image.open(root/'docs/F3/f2-integration-screenshots/04-giant-heart.png').convert('RGB')
b=Image.open(root/'docs/F3/heart-look/after-heart-close.png').convert('RGB')
w,h=a.size; head=50
out=Image.new('RGB',(w*2,h+head),'#071018'); out.paste(a,(0,head)); out.paste(b,(w,head))
d=ImageDraw.Draw(out); font=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf',20)
d.text((16,14),'BEFORE · accepted F3 flat heart',fill='#c9d5d2',font=font)
d.text((w+16,14),'AFTER · 2.58-unit-deep volume',fill='#ffd58a',font=font)
d.line([(w,0),(w,h+head)],fill='#5b4630',width=2)
out.save(root/'docs/F3/heart-look/compare-heart-volume.png',optimize=True)
print('ok')
