# Lion Safari V2 — Mama Lion Premium Carwash

Sistem kaunter carwash (versi baru, menggantikan Lion Safari V1.7).
**Link:** https://alamhayyat20-collab.github.io/Mama-lion-hub/lionsafari/

## Dua cawangan, satu apps
- Setiap telefon/tablet kaunter pilih cawangan **sekali sahaja** (logo Mama Lion / Lion King) selepas log masuk peranti.
- Data diasingkan ikut cawangan: `lionsafari/mama-lion/...` dan `lionsafari/lion-king/...` (order, queue, stok, petty cash, staf & PIN, harga).
- Jualan & petty cash masuk ke Akaun cawangan masing-masing: `akaun/mama-lion/entri` dan `akaun/lion-king/entri`.
- Tukar cawangan peranti: butang **🏪 Tukar cawangan** di skrin PIN, atau **Tetapan → Peranti ini**.
- Staf & PIN tidak dikongsi antara cawangan — daftar dalam Akaun dengan logo cawangan yang betul.

## Fungsi
| Tab | Kegunaan |
|---|---|
| Ringkasan | Jualan hari ini, queue, petty cash, stok rendah, **menu pakej & servis bergambar** (tekan pakej → terus buat order) |
| Order Baru | Plat, jenis kenderaan, pakej (bergambar), add-on, bay |
| Queue | Menunggu → Cuci → Kering → QC → Siap, tukar bay, cari plat |
| Bayaran | Tunai (kira baki), QR/eWallet, Kad, Transfer + rujukan & gambar bukti, diskaun, resit 58mm |
| Petty Cash | Belanja & top-up, baki automatik |
| Stok | Terima / guna stok, amaran stok rendah, log pergerakan |
| Pekerja | Admin/Manager/Supervisor: kehadiran harian (selfie + GPS dari Apps Pekerja), lulus/tolak advance, claim & OT, susun duty roster |
| Laporan | Harian & Bulanan, CSV Excel, PDF |
| Tetapan | **Admin sahaja**: pakej, servis tambahan & jenis kenderaan (nama, harga, gambar, keterangan, anggaran masa, aktif, susunan), maklumat kedai/resit, bay, kategori petty cash, had kelulusan |

## Peranan
| Peranan | Akses |
|---|---|
| Admin | Semua tab termasuk **Tetapan**; kelulusan |
| Manager | Semua kecuali Tetapan; urus item stok; kelulusan |
| Supervisor | Kaunter + Laporan; boleh luluskan batal, diskaun & petty cash |
| Cashier | Order, queue, bayaran, petty cash, stok (masuk/guna) |
| Pekerja | Queue & stok sahaja (staf bay) |

**ID staf, peranan & PIN diberi oleh pemilik dalam apps Akaun → tab Pekerja.** Staf log masuk kaunter dengan ID (cth `ML001` Mama Lion, `LK001` Lion King) + PIN. Staf versi lama: Pengurus → Admin, Juruwang → Cashier (automatik).
**Kelulusan PIN Supervisor / Manager / Admin** diperlukan untuk: batal order, diskaun melebihi had, top-up petty cash, belanja petty cash melebihi had, padam petty cash, laras stok.

Gambar pakej/servis disimpan di `lionsafari/{cawangan}/gambar/{id}` (dikecilkan automatik).

## Sambungan ke apps Akaun (automatik)
- Setiap bayaran / pembatalan mengemas kini rekod jualan harian `akaun/mama-lion/entri/ls-YYYY-MM-DD` (Tunai, QR, Kad; Transfer masuk "Lain-lain").
- Setiap rekod petty cash disalin ke `akaun/mama-lion/entri/lsp-{id}`.
- **Tidak perlu** tekan "Tarik dari LionSafari" lagi dalam Akaun. Rekod auto ini dilindungi daripada ditimpa oleh data LionSafari lama.

## Cara mula guna
1. Upload folder `lionsafari/` (6 fail) ke repo `Mama-lion-hub`, dan gantikan `akaun/index.html` dengan versi yang dikemas kini.
2. Tambah Firestore Rules di bawah → **Publish**.
3. Buka link di telefon kaunter → log masuk peranti dengan akaun Firebase (sekali sahaja).
4. Daftar staf (sekurang-kurangnya seorang Admin) dalam apps Akaun → Pekerja. Kemudian log masuk kaunter dengan ID + PIN, isi pakej, harga & gambar dalam **Tetapan**, dan item dalam **Stok**.
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
