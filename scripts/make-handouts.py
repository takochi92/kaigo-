from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as RLFont
from reportlab.lib.colors import HexColor,white
from reportlab.lib.pagesizes import A4
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF,renderSVG
from PIL import Image,ImageDraw,ImageFont
import shutil
import argparse
parser=argparse.ArgumentParser(description='Rebuild Oyanote flyers, QR codes and OGP using a local Noto Sans JP variable font.')
parser.add_argument('--font',required=True,type=Path)
args=parser.parse_args()
r=Path(__file__).resolve().parents[1]
f=instantiateVariableFont(TTFont(str(args.font)),{'wght':500},inplace=False);f.save('/tmp/oyanote-static.ttf')
pdfmetrics.registerFont(RLFont('JP','/tmp/oyanote-static.ttf'))
def qr(url,size):
 q=QrCodeWidget(url,barLevel='M'); b=q.getBounds(); d=Drawing(size,size,transform=[size/(b[2]-b[0]),0,0,size/(b[3]-b[1]),0,0]);d.add(q);return d
for city,suffix in [(False,''),(True,'-hiroshima')]:
 url='https://oyanote-care.com/'+('area/34/34100.html' if city else '')
 renderSVG.drawToFile(qr(url,200),str(r/'sns/flyer'/('qr-hiroshima.svg' if city else 'qr.svg')))
 p=r/'assets/handouts'/('oyanote-flyer'+suffix+'.pdf'); c=canvas.Canvas(str(p),pagesize=A4);W,H=A4;c.setTitle('おやのて 紹介チラシ'+(' 広島市版' if city else ''))
 def text(x,y,s,size=15,color='#28392b'):
  c.setFillColor(HexColor(color));c.setFont('JP',size);c.drawString(x,y,s)
 c.setFillColor(HexColor('#a8d164'));c.rect(0,H-8,W,8,fill=1,stroke=0)
 text(40,H-70,'おやのて',44,'#4f8a1f');text(42,H-115,'親の介護、',24)
 text(42,H-150,'まず何から？',24)
 text(42,H-192,'家族のための介護情報サイト',13)
 text(42,H-217,'無料・登録不要',14,'#4f8a1f')
 if city:text(42,H-248,'広島市版',12,'#4f8a1f')
 c.drawImage(str(r/'assets/handouts/family-conversation.jpg'),310,H-270,width=245,height=163.34,mask='auto')
 c.setStrokeColor(HexColor('#d5dfcd'));c.line(40,H-286,W-40,H-286)
 y=H-321
 for head,line in [('制度と費用を知る','介護保険の申請、サービスの種類、自己負担の目安。'),('相談先を見つける','地域包括支援センターの探し方と、相談の準備。'),('介護事業所・病院を探す','国の公開データを使った、全国の住所・電話番号検索。'),('次にやることを整理する','まんが・読みもの・退院や施設見学のチェックリスト。')]:
  text(42,y,head,21,'#4f8a1f');text(42,y-27,line,13);y-=67
 renderPDF.draw(qr(url,145),c,38,92)
 text(200,215,'スマホのカメラで読み取ってください',14)
 text(200,181,'広島市の事業所一覧へ' if city else 'おやのて トップページへ',18)
 text(200,146,'oyanote-care.com',17)
 text(40,55,'運営：おやのて編集部  /  お問い合わせはサイト内のフォームへ',11)
 text(40,35,'制度・医療の個別判断は、自治体・専門職へご相談ください。',10)
 c.showPage()
 for x,y in [(30,H/2+12),(W/2+8,H/2+12),(30,25),(W/2+8,25)]:
  c.setStrokeColor(HexColor('#d5dfcd'));c.rect(x,y,250,380,stroke=1,fill=0)
  text(x+18,y+340,'おやのて',29,'#4f8a1f');text(x+18,y+310,'親の介護、まず何から？',15)
  c.drawImage(str(r/'assets/handouts/family-conversation.jpg'),x+50,y+198,width=150,height=100,mask='auto')
  for i,s in enumerate(['制度・費用・相談先を調べる','広島市の事業所・病院を探す' if city else '全国の事業所・病院を探す','まんがとチェックリストで整理']):text(x+18,y+177-i*21,s,11)
  renderPDF.draw(qr(url,105),c,x+72,y+28);text(x+26,y+17,'oyanote-care.com / 無料・登録不要',10)
 c.save()
 for dest in [r/'assets/handouts'/('kaigonavi-flyer'+suffix+'.pdf'),r/'sns/flyer'/('kaigonavi-flyer'+suffix+'.pdf')]:shutil.copyfile(p,dest)
im=Image.new('RGB',(1200,630),'#eef5e8');d=ImageDraw.Draw(im)
for pos,s,size,color in [((80,90),'おやのて',110,'#4f8a1f'),((85,265),'親の介護、まず何から？',59,'#28392b'),((85,380),'制度・費用・相談先を、家族のために。',38,'#28392b'),((85,510),'oyanote-care.com',32,'#4f8a1f')]:d.text(pos,s,font=ImageFont.truetype('/tmp/oyanote-static.ttf',size),fill=color)
im.save(r/'assets/ogp.jpg',quality=94)
print('2 PDFs, QR vectors and OGP created')
