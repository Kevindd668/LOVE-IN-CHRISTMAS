# Cinematic Intro 鏈€缁堥獙鏀?
> 鐘舵€侊細**8 绉?Cinematic Intro 瀹炵幇銆佺湡瀹炴埅鍥俱€佸綍灞忋€佹€ц兘涓庡洖褰掑畬鎴愶紝绛夊緟鐢ㄦ埛楠屾敹銆?*  
> 鍙寘鍚湰娆?Intro锛?0 绉掔埍鎯呮晠浜嬫湭寮€鍙戙€? 
> 鏈€缁?standalone SHA-256锛歚A38E25DE18CFF6E966A9FF6006D55D22B0C4CB492D316B7FFB71BCC44C679928`

## 1. 闃舵闂ㄧ

| 妫€鏌ラ」 | 缁撴灉 |
| --- | --- |
| 浠?F4 `21de493` / `f4-accepted` 鏂板缓鍒嗘敮 | 閫氳繃 |
| 鏈慨鏀?main / baseline | 閫氳繃 |
| 鏈慨鏀?F2 瀹為獙 | 閫氳繃 |
| 鏈慨鏀?F4 鐖辨儏/璁板繂鍔熻兘 | 閫氳繃 |
| 鏈垱寤虹浜?Renderer/RAF | 閫氳繃 |
| 鏈垱寤轰复鏃跺湥璇炴爲 | 閫氳繃 |
| 鏈垱寤虹浜屽鐖卞績/鏄熺┖ | 閫氳繃 |
| 鏈彁鍓嶅埗浣?60 绉掓晠浜?| 閫氳繃 |

## 2. 浜斾釜闀滃ご

| 闀滃ご | 缁撴灉 | 璇佹嵁 |
| --- | --- | --- |
| 榛戞殫鑻忛啋 | 閫氳繃 | `screenshots/01-awakening.png` |
| 涓夊眰铻烘棆鏄熸渤 | 閫氳繃锛?0k 绮掑瓙 | `screenshots/02-spiral.png` |
| 3D 鐖卞績璇炵敓 | 閫氳繃锛涘績璺?鍐插嚮娉?| `screenshots/03-heart.png` |
| 鏍囬鎻檽 | 閫氳繃锛汥OM 娓呮櫚鏍囬 | `screenshots/04-title.png` |
| 姝ｅ紡鏍戠櫥鍦?| 閫氳繃锛涘悓涓€鏍戝璞?| `screenshots/05-tree.png`銆乣06-final.png` |

## 3. 鍏ュ彛涓庢帶鍒?
- `MERRY CHRISTMAS` 鍏ュ彛锛?- 銆屽紑鍚笓灞炲湥璇炴儕鍠溿€峱reflight锛氶煶棰戞鏌?+ Shader warmup + 8s锛?- 銆屽厛閫涢€涖€嶇洿鎺ユ寮忔爲锛?- 鏆傚仠/缁х画銆佽烦杩囥€侀噸鎾€侀€€鍑猴紱
- `?intro=0` 鍥炲綊缁曡繃锛?- 缁撴潫鍚庢帶鍒舵潯淇濈暀绾?6 绉掋€?
娴嬭瘯锛歚qa/f5-controls.mjs` 閫氳繃銆?
## 4. 绮掑瓙涓庢爣棰?
- 20,000 绮掑瓙锛屼笁灞傝灪鏃嬶細
  - 7,000 钃濓紱
  - 7,000 閲戯紱
  - 6,000 鐜懓锛?- 1 涓?Points + 1 涓?LineSegments 鎷栧熬 + 1 涓?Sprite锛?- 3D 鍘氬害銆佸€炬枩銆佸樊鍒嗘棆杞拰鐩告満绌胯秺锛?- 鐖卞績鐩爣鏉ヨ嚜姝ｅ紡 `HeartParticleSystem` 鐨?20k 鐩爣锛?- 鏍囬 DOM/CSS锛岄潪妯＄硦绮掑瓙鎷煎瓧锛?- 600 涓?2D 鏍囬绮掑瓙 + 閲戣壊鎵厜銆?
## 5. 鎬ц兘

| Case | FPS | P95 | Particles | Warmup |
| --- | ---: | ---: | ---: | ---: |
| 1440脳900 | 240.0 | 4.3ms | 20,000 | 341ms |
| 1920脳1080 | 240.0 | 4.3ms | 20,000 | 160ms |
| 3840脳2160 | 240.0 | 4.3ms | 20,000 | 165ms |
| 1440脳900 full Bloom | 240.0 | 4.3ms | 20,000 | 246ms |

- 240 FPS 鏄?240Hz 鏄剧ず涓婇檺闄勮繎閲囨牱锛?- 棰勭儹鍚庢渶澶у抚 4.4鈥?.1ms锛屾棤棣栧抚缂栬瘧灏栧嘲锛?- 0 context lost / 0 console/page error锛?- 璇﹁ `INTRO_PERFORMANCE.md`銆?
## 6. 鍥炲綊

| 娴嬭瘯 | 缁撴灉 |
| --- | --- |
| typecheck/build/build:single | 閫氳繃 |
| F5 smoke/phases/controls/performance/video | 閫氳繃 |
| F3/F4 smoke锛坄?intro=0`锛?| 閫氳繃 |
| qa2 / qa3 / raycast / mobile | 閫氳繃 |
| singlefile | 閫氳繃 |
| 45 绉掓紨绀?/ 娴极妯″紡 | 閫氳繃 |

## 7. 璧勪骇

```text
docs/F5/INTRO/
鈹溾攢鈹€ README.md
鈹溾攢鈹€ INTRO_BASELINE.md
鈹溾攢鈹€ INTRO_DESIGN.md
鈹溾攢鈹€ INTRO_SOURCE_REUSE.md
鈹溾攢鈹€ INTRO_PERFORMANCE.md
鈹溾攢鈹€ INTRO_REGRESSION.md
鈹溾攢鈹€ INTRO_ACCEPTANCE.md
鈹溾攢鈹€ final-video.webm
鈹斺攢鈹€ screenshots/
    鈹溾攢鈹€ 00-entry.png
    鈹溾攢鈹€ 01-awakening.png
    鈹溾攢鈹€ 02-spiral.png
    鈹溾攢鈹€ 03-heart.png
    鈹溾攢鈹€ 04-title.png
    鈹溾攢鈹€ 05-tree.png
    鈹斺攢鈹€ 06-final.png
```

8 绉掑綍灞忎娇鐢?Canvas2D 鍚堟垚鍣ㄦ妸 WebGL 鐢婚潰涓?DOM 鏍囬鍚屾椂鎹曡幏锛岄伩鍏嶄緷璧栨湰鏈虹己澶辩殑 ffmpeg銆?
## 8. 宸茬煡杈圭晫

- 浠?8 绉?Intro锛屼笉鍖呭惈 60 绉掓晠浜嬶紱
- 榛樿鍏ュ彛浼氭樉绀哄湪姝ｅ紡鏍戜箣鍓嶏紝F3/F4 鑷姩鍖栦娇鐢?`?intro=0`锛?- 4K/240 FPS 涓烘湰鏈烘樉绀轰笂闄愰噰鏍凤紱
- 鏍囬涓?DOM锛屽叆鍦鸿棰戦€氳繃鍚堟垚鍣ㄥ寘鍚爣棰橈紱
- 涓嶅寘鍚法璁惧绀肩墿鍖呯瓑 F4 鍚庣画鍙€夐」銆?
## 9. 缁撹

8 绉?Cinematic Intro 鐨勪簲涓暅澶淬€佸叆鍙ｃ€佹帶鍒躲€佺矑瀛?鐖卞績/鏍囬/鏍戜氦鎺ュ拰棰勭儹鎬ц兘鍧囧凡瀹屾垚锛涚瓑寰呯敤鎴烽獙鏀跺悗鍐嶅悎骞讹紝涓嶆彁鍓嶈繘鍏ュ悗缁?F5 宸ヤ綔銆?