# Apps Pekerja — Mama Lion & Lion King

**Link:** https://alamhayyat20-collab.github.io/Mama-lion-hub/pekerja/

Apps untuk telefon peribadi pekerja: kehadiran dengan selfie bercap masa + GPS, permohonan advance / claim / OT, duty roster dan rekod sendiri.

## Fungsi pekerja
| Tab | Kegunaan |
|---|---|
| Kehadiran | PUNCH IN / PUNCH OUT dengan kamera depan. Gambar dicap masa, ID, nama & GPS. Masa direkod ikut **masa server** (tak boleh diubah dengan jam telefon). Gambar dari galeri ditolak. Jarak dari kedai disemak. |
| Mohon | Advance (amaun + sebab), Claim (amaun + gambar resit), OT (tarikh + jam). Status: Menunggu / Lulus / Ditolak |
| Roster | Syif 14 hari akan datang & rakan sesyif |
| Rekod | Hari hadir, jam kerja, lewat, OT/advance/claim diluluskan ikut bulan |

## Pengurusan
- **Lion Safari V2 → tab Pekerja** (Admin, Manager, Supervisor): kehadiran harian dengan gambar & GPS, luluskan/tolak permohonan, susun roster.
- **Akaun → Pekerja** (pemilik): sama seperti di atas + **Tetapan Pekerja** (lokasi kedai, radius GPS, syif). Advance, claim & OT yang diluluskan masuk terus ke **Gaji Bulanan** (OT = jam × kadar OT pekerja).

## Persediaan (sekali sahaja)
1. Firebase Console → Authentication → Users → **Add user**: email `pekerja@mamalion.app` + kata laluan. Akaun ini hanya boleh rekod kehadiran & permohonan — tidak boleh baca data kaunter atau akaun.
2. Publish `firestore-rules.txt` yang dikemas kini.
3. Akaun → Pekerja → **Tetapan Pekerja** (pilih cawangan): tekan "Guna lokasi saya sekarang" **semasa berada di kedai**, semak syif, Simpan. Ulang untuk Lion King.
4. Susun roster (Akaun atau V2 → Pekerja → Roster).
5. Pada telefon setiap pekerja: buka link → masukkan kata laluan akaun `pekerja@mamalion.app` (oleh pengurus) → PASANG → pekerja log masuk dengan ID + PIN.

## Data
`kakitangan/{cawangan}/kehadiran`, `kehadiran_gambar`, `permohonan`, `roster/{YYYY-MM-DD}`, `tetapan/umum`. Fungsi kongsi: `../pekerja-lib.js`.
