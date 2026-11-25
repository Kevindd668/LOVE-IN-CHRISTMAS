from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path('.')
pairs=[('01-front','01-front'),('07-heart-ornaments-close','07-hearts-close'),('08-crystal-heart-close','08-crystal-close'),('10-pure-tree','10-pure-tree')]
font_path=r'C:\Windows\Fonts\segoeui.ttf'
try: font=ImageFont.truetype(font_path,22)
except Exception: font=ImageFont.load_default()
for before,after in pairs:
    a=Image.open(root/'docs/F3/screenshots'/f'{before}.png').convert('RGB')
    b=Image.open(root/'docs/F3/reuse-screenshots'/f'after-{after}.png').convert('RGB')
    w,h=a.size; head=52
    out=Image.new('RGB',(w*2,h+head),'#071018')
    out.paste(a,(0,head)); out.paste(b,(w,head))
    d=ImageDraw.Draw(out)
    d.text((18,14),'BEFORE · F3 baseline d9954c3',fill='#c9d5d2',font=font)
    d.text((w+18,14),'AFTER · WP1 Heart-Star geometry A/B',fill='#ffd58a',font=font)
    d.line([(w,0),(w,h+head)],fill='#5b4630',width=2)
    out.save(root/'docs/F3/reuse-screenshots'/f'compare-{before}.png',optimize=True)
    print('compare-'+before)
