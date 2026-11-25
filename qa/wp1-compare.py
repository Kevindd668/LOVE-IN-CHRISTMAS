from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path('.')
pairs=[('01-overall','05-complete','wp1-compare-overall'),('02-stars-nebula','04-meteor-sky','wp1-compare-sky')]
font=ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf',20)
for before,after,name in pairs:
 a=Image.open(root/'docs/F3/f2-integration-screenshots'/f'{before}.png').convert('RGB')
 b=Image.open(root/'docs/F3/wp1'/f'{after}.png').convert('RGB')
 w,h=a.size; head=50
 out=Image.new('RGB',(w*2,h+head),'#071018'); out.paste(a,(0,head)); out.paste(b,(w,head))
 d=ImageDraw.Draw(out); d.text((16,14),'BEFORE · F3 baseline',fill='#c9d5d2',font=font); d.text((w+16,14),'AFTER · WP1 sky',fill='#ffd58a',font=font); d.line([(w,0),(w,h+head)],fill='#5b4630',width=2)
 out.save(root/'docs/F3/wp1'/f'{name}.png',optimize=True)
 print(name)
