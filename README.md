# Instagram İçerik Otomasyonu

**Haftada 3 gönderi** — Pazartesi, Çarşamba, Cuma, saat 19:00.
Şablona göre görsel üretir, açıklamasını yazar, **Telegram'dan senin onayını alır** ve onay gelirse Instagram'da yayınlar.

```
17:30  konu seç → metin üret (AI) → HTML şablon → PNG → Supabase'e yükle → Telegram'a onay kartı
19:00  onaylandıysa Instagram'da yayınla   (onay yoksa yayınlamaz, seni uyarır)
```

Telegram kartının altındaki dört buton: **Onayla · Yeniden üret · Metni düzelt · Atla**.
"Metni düzelt"e basınca bot ne değiştirmek istediğini sorar, notunu yazarsın, yeni versiyonu getirir.

Gün ve saati değiştirmek için `.env`:

```
PUBLISH_DAYS=1,3,5      # 0=Pazar ... 6=Cumartesi
PUBLISH_TIME=19:00
LEAD_MINUTES=90         # onay kartı yayından kaç dk önce gelsin
```

Haftada 4'e çıkarmak istersen tek yapman gereken `PUBLISH_DAYS=1,3,5,6` yazmak — rotasyon kendini buna göre ayarlar.

---

## Şablonlar ve rotasyon

Beş şablon var, hepsi 1080×1350 (4:5 — Instagram'ın en çok yer kaplayan oranı):

| Şablon  | Ne işe yarar                                   |
|---------|------------------------------------------------|
| `quote` | Kısa, çarpıcı bir söz / görüş                  |
| `tip`   | Uygulanabilir tek bir ipucu                    |
| `stat`  | Büyük bir rakam + ne anlama geldiği            |
| `case`  | Kısa vaka: önce ne kadar sürüyordu, şimdi ne   |
| `cta`   | Hizmet tanıtımı ve net bir çağrı               |

Haftada 3 gönderi ve 5 şablon olduğu için sıra her hafta kayar; aynı şablon aynı güne **5 haftada bir** denk gelir:

| Hafta | Pazartesi | Çarşamba | Cuma  |
|-------|-----------|----------|-------|
| 1     | tip       | quote    | stat  |
| 2     | case      | cta      | tip   |
| 3     | quote     | stat     | case  |
| 4     | cta       | tip      | quote |
| 5     | stat      | case     | cta   |

Sıradaki yayınları görmek için:

```bash
npm run takvim        # önümüzdeki 9 yayın
```

Telegram'dan `/takvim` yazarak da bakabilirsin.

Konu bankası `src/content/topics.json`. Her konu hangi şablonlara uyduğunu söyler; son 35 günde kullanılan konular tekrar seçilmez.

Şablon görünümünü değiştirmek için: `src/render/templates/base.css` (ortak çerçeve) ve `<şablon>.css`. API anahtarı olmadan denemek için:

```bash
npm run preview          # beş şablonu da out/ klasörüne basar (örnek çıktılar: ornekler/)
npm run preview stat     # sadece birini
```

---

## Kurulum

### 1. Gereksinimler

```bash
node -v      # 20 veya üstü
npm install
cp .env.example .env
```

### 2. Instagram tarafı (en uzun adım bu)

Bu iş Meta'nın **Instagram Content Publishing API**'si ile yapılır. Gerekenler:

1. Instagram hesabın **Business** veya **Creator** olmalı (Ayarlar → Hesap türü).
2. Hesap bir **Facebook Sayfası'na** bağlı olmalı.
3. [developers.facebook.com](https://developers.facebook.com) üzerinde bir uygulama aç, **Instagram** ürününü ekle.
4. Şu izinleri iste: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`.
5. Uzun ömürlü bir **Page access token** üret (kısa ömürlüyü uzun ömürlüye çevirme adımını atlama, yoksa token 1 saatte ölür).
6. `IG_USER_ID`'yi al: `GET /me/accounts` → sayfanın id'si → `GET /{page-id}?fields=instagram_business_account`.

Notlar:

- Görselin **herkese açık bir URL'de** olması şart; Meta sunucusu görseli o adresten indirir. Bu yüzden PNG önce Supabase Storage'a yükleniyor.
- Günlük yayın limiti 24 saatte 50 gönderi — sen haftada 3 kullanacaksın, sorun değil.
- Meta sürüm numaralarını yaklaşık iki yılda bir emekliye ayırıyor; `GRAPH_VERSION` env'den ayarlanabilir.

### 3. Supabase

`sql/schema.sql` dosyasını SQL Editor'de çalıştır. Sonra Storage'da `instagram` adında **public** bir bucket aç.

### 4. Telegram

1. [@BotFather](https://t.me/BotFather) ile bot oluştur → `TELEGRAM_BOT_TOKEN`.
2. Bota bir mesaj at, sonra `https://api.telegram.org/bot<TOKEN>/getUpdates` ile kendi `chat_id`'ni al.
3. Sunucuyu dışarıdan erişilebilir bir adrese koy (`PUBLIC_URL`), sonra:

```bash
npm run webhook
```

> Geliştirirken `ngrok http 8080` veya `cloudflared tunnel` ile geçici bir adres alabilirsin.

### 5. Çalıştır

```bash
npm start
```

Zamanlayıcı ayağa kalkar ve hangi günlerde çalışacağını terminale yazar. Telegram komutları:

```
/uret       → bugünün gönderisini şimdi üret ve onaya gönder
/yayinla    → onaylı gönderiyi hemen yayınla
/takvim     → önümüzdeki 4 yayının günü ve şablonu
```

Terminalden:

```bash
npm run gen                  # bugün için üret
npm run gen -- 2026-09-25    # belirli bir gün için üret
npm run pub                  # onaylı gönderiyi yayınla
```

---

## Dosya düzeni

```
src/
  config.js            ortam değişkenleri, gün + saat → cron çevirisi
  index.js             Express sunucu + Telegram webhook
  scheduler.js         yayın günlerinde 2 iş: üretim ve yayın
  pipeline.js          üretim ve yayın akışının tamamı
  db.js                Supabase tabloları
  storage.js           PNG yükleme → public URL
  content/
    plan.js            5'li şablon döngüsü, konu seçimi
    topics.json        konu bankası (burayı sen büyüteceksin)
    caption.js         AI ile görsel metni + açıklama + hashtag
  render/
    html.js            şablon doldurma (tarayıcı gerektirmez)
    renderer.js        HTML → 1080×1350 PNG (Puppeteer)
    templates/         _layout + 5 şablon (html + css)
  telegram/
    bot.js             onay kartı, butonlar
    handlers.js        buton ve mesaj işleme
  instagram/
    publish.js         Graph API: konteyner → bekle → yayınla
sql/schema.sql
scripts/               preview, takvim, webhook kurulumu, elle tetikleme
```

---

## Sonraki adımlar

- **Carousel ve Reels**: Graph API ikisini de destekliyor; `publish.js` şimdilik tek görsele odaklı.
- **Yayın sonrası metrik**: 24 saat sonra beğeni/erişim çekip hangi şablonun tuttuğunu ölçmek.
- **Görsel çeşitliliği**: `base.css`'teki arka plan ışığını konuya göre değiştirmek.
- **Onay geçmişi**: Reddettiğin içerikleri kaydedip üretim promptuna "böyle olmasın" örneği olarak vermek.
