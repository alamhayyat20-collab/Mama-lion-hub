# Lion Safari V2 — Mama Lion Premium Carwash

Sistem kaunter carwash (versi baru, menggantikan Lion Safari V1.7).
**Link:** https://alamhayyat20-collab.github.io/Mama-lion-hub/lionsafari/

## Fungsi
| Tab | Siapa | Kegunaan |
|---|---|---|
| Ringkasan | Pengurus, Juruwang | Jualan hari ini, queue, petty cash, stok rendah |
| Order Baru | Pengurus, Juruwang | Plat, jenis kenderaan, pakej, add-on, bay |
| Queue | Semua | Menunggu → Cuci → Kering → QC → Siap, tukar bay, cari plat |
| Bayaran | Pengurus, Juruwang | Tunai (kira baki), QR/eWallet, Kad, Transfer + rujukan & gambar bukti, diskaun, resit 58mm |
| Petty Cash | Pengurus, Juruwang | Belanja & top-up, baki automatik |
| Stok | Semua | Terima / guna stok, amaran stok rendah, log pergerakan |
| Laporan | Pengurus | Harian (cara bayar, pakej, add-on, juruwang, semakan tunai laci, order batal) & Bulanan (ikut hari, CSV Excel, PDF) |
| Staf | Pengurus | Tambah staf, peranan, PIN, nyahaktif |
| Tetapan | Pengurus | Nama kedai, harga pakej/kenderaan/add-on, bay, float, had kelulusan |

**Kelulusan PIN Pengurus** diperlukan untuk: batal order, diskaun melebihi had, top-up petty cash, belanja petty cash melebihi had, padam petty cash, laras stok.

## Sambungan ke apps Akaun (automatik)
- Setiap bayaran / pembatalan mengemas kini rekod jualan harian `akaun/mama-lion/entri/ls-YYYY-MM-DD` (Tunai, QR, Kad; Transfer masuk "Lain-lain").
- Setiap rekod petty cash disalin ke `akaun/mama-lion/entri/lsp-{id}`.
- **Tidak perlu** tekan "Tarik dari LionSafari" lagi dalam Akaun. Rekod auto ini dilindungi daripada ditimpa oleh data LionSafari lama.

## Cara mula guna
1. Upload folder `lionsafari/` (6 fail) ke repo `Mama-lion-hub`, dan gantikan `akaun/index.html` dengan versi yang dikemas kini.
2. Tambah Firestore Rules di bawah → **Publish**.
3. Buka link di telefon kaunter → log masuk peranti dengan akaun Firebase (sekali sahaja).
4. Kali pertama: daftar Pengurus (nama + PIN). Kemudian tambah staf lain dalam tab **Staf**, isi harga dalam **Tetapan**, dan item dalam **Stok**.
5. Tekan **PASANG SEKARANG** untuk letak ikon di skrin utama; **KONGSI LINK KEPADA STAF** untuk hantar ke telefon lain.

## Firestore Rules
Tambah di dalam `match /databases/{database}/documents { ... }`:

```
    // Lion Safari V2 — peranti kaunter yang log masuk
    match /lionsafari/{cawangan}/{document=**} {
      allow read, write: if request.auth != null;
    }
    // Lion Safari V2 menghantar jualan & petty cash terus ke Akaun
    match /akaun/{cawangan}/entri/{id} {
      allow create, update: if request.auth != null
        && (id.matches('ls-.*') || id.matches('lsp-.*'))
        && request.resource.data.sumber == 'lionsafari';
      allow delete: if request.auth != null && (id.matches('ls-.*') || id.matches('lsp-.*'));
    }
```
Peraturan Akaun sedia ada (pemilik / pengurusan) kekal; blok kedua hanya membenarkan peranti kaunter menulis rekod `ls-` dan `lsp-`.

## Nota
- PIN staf disimpan sebagai hash (SHA-256), bukan nombor asal.
- Tanpa internet: order & bayaran tetap boleh dibuat dan dihantar automatik bila online semula.
- Gunakan **satu sistem kaunter sahaja** (V2). Jika V1/V1.7 lama masih digunakan serentak, jualan boleh dikira dua kali.
