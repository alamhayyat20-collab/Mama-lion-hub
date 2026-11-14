# Akaun Mama Lion

Apps perakaunan untuk Mama Lion (Management sahaja). Guna login & projek Firebase `lion-safari` yang sama seperti LionSafari.

**Link:** https://alamhayyat20-collab.github.io/Mama-lion-hub/akaun/

## Fungsi
- **Ringkasan** – jualan hari ini & bulan ini, perbelanjaan, untung bersih, baki petty cash, hutang pembekal, carta jualan harian
- **Jualan** – rekod jualan harian ikut kaedah bayaran (Tunai, QR/DuitNow, Kad, e-Wallet, Lain-lain) + bilangan kenderaan
- **Pembelian** – stok & bekalan (pembekal, kategori, invois, cara bayar). Pembelian "Kredit (Hutang)" masuk senarai hutang sehingga ditanda lunas
- **Belanja** – belanja operasi (gaji, sewa, elektrik, air, internet, dll.)
- **Petty Cash** – top-up & belanja kecil, baki dikira automatik. Pembelian/belanja yang dibayar guna "Petty Cash" juga menolak baki
- **Pekerja** (pemilik sahaja) – daftar pekerja ikut cawangan: **ID staf, peranan kaunter (Admin / Manager / Supervisor / Cashier / Pekerja) & PIN** untuk log masuk Lion Safari V2, serta maklumat peribadi (IC, telefon, bank, kenalan kecemasan, tarikh mula). Rekod **advance, overtime (jam × kadar), elaun, komisen/bonus, potongan, hari bekerja** (gaji harian). **Gaji Bulanan**: ringkasan setiap pekerja (Asas + OT + Elaun + Komisen − Potongan − Advance = Bersih), CSV, cetak, dan butang "Rekod ke Belanja" (kategori Gaji & Upah)
- **Cawangan** – pilih logo Mama Lion / Lion King; semua data diasingkan ikut cawangan
- **Laporan** – Penyata Untung Rugi bulanan, ringkasan harian, muat turun CSV (buka dalam Excel), cetak / simpan PDF
- **Tarik dari LionSafari** – (tab Jualan) kira jualan harian dari order berbayar LionSafari (Cash → Tunai, QR → QR). Hari yang sudah ditarik tidak diulang; jika ada order baru, ia ditanda "Berubah" untuk dikemas kini. (Tab Petty Cash) salin rekod petty cash LionSafari, setiap rekod hanya sekali.
  ⚠ Tarik jualan **sebelum** tekan "Reset Data" di LionSafari — Reset memadam semua order.
- **Import Excel** – (tab Laporan) muat turun templat, isi, kemudian pilih fail .xlsx / .csv. Apps tunjuk pratonton, tandakan baris bermasalah, dan langkau rekod yang sudah wujud sebelum import.

## Cara pasang (dari telefon)
1. Dalam repo GitHub `Mama-lion-hub`, cipta folder `akaun` dan upload 3 fail: `index.html`, `manifest.json`, `README.md`.
   (Taip `akaun/index.html` pada nama fail semasa "Create new file" untuk buat folder.)
2. Kemas kini Firestore Rules (di bawah) → **Publish**.
3. Buka link di atas, log masuk dengan akaun Management.

## Firestore Rules
Firebase Console → Firestore Database → **Rules**. Tambah blok ini **di dalam** `match /databases/{database}/documents { ... }`, sebelum `}` terakhir:

```
    match /akaun/{cawangan}/entri/{id} {
      allow read, write: if request.auth != null
        && get(/databases/$(database)/documents/staff/$(request.auth.token.email.lower())).data.role == 'Management';
    }
```

Peraturan ini menganggap ID dokumen dalam koleksi `staff` = email huruf kecil (cth `alamhayyat20@gmail.com`).
Jika ID dokumen staff bukan email, guna versi ringkas ini (apps tetap menyekat bukan-Management):

```
    match /akaun/{cawangan}/entri/{id} {
      allow read, write: if request.auth != null;
    }
```

Nota: jika Rules sedia ada ada `match /{document=**} { allow read, write: if request.auth != null; }`, mana-mana staff yang log masuk boleh baca data akaun dari luar apps. Untuk kawalan ketat, gantikan blok `{document=**}` itu dengan blok khusus bagi `staff` dan `branches`.

Apps Akaun juga **membaca** dokumen `branches/mama-lion` (data LionSafari) untuk fungsi Tarik. Peraturan sedia ada LionSafari biasanya sudah membenarkan staff yang log masuk membacanya.

## Struktur data
Semua rekod disimpan di `akaun/mama-lion/entri/{id}` dengan medan `jenis` = `jualan` | `pembelian` | `belanja` | `petty`.
Kategori boleh diubah di bahagian atas skrip dalam `index.html` (`KAT_PEMBELIAN`, `KAT_BELANJA`, `KAT_PETTY`).
