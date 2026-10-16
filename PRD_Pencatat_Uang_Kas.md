# PRD: Aplikasi Pencatat Uang Kas Sederhana

## 1. Overview
Aplikasi pencatatan uang kas berbasis web (SPA) untuk mencatat uang kas masuk dan keluar. Uang kas dikumpulkan per bulan (iuran anggota). Tujuan utama: mempermudah pencatatan, melihat progress pembayaran iuran per anggota per bulan, dan menjaga saldo kas terkini.

## 2. Goals
- Mencatat uang kas masuk (iuran anggota) dengan dukungan cicilan per transaksi
- Mencatat uang kas keluar beserta keterangan
- Melihat progress pembayaran tiap anggota per periode (bulan kalender)
- Menampilkan saldo kas saat ini (total masuk - total keluar)
- Menyediakan riwayat per bulan yang dapat diakses kembali
- Mendukung backup via export/import (CSV/JSON)

## 3. Scope (MVP)
- Single-user, tanpa autentikasi
- Local-first: data tersimpan di localStorage (versioned)
- Mobile-first, desain clean & modern, tema terang untuk MVP
- SPA single view (tanpa routing)
- Mengelola daftar anggota (nama saja), bisa diarsipkan/nonaktif
- Pencatatan CashIn terikat ke anggota dan periode (YYYY-MM)
- Pencatatan CashOut dengan keterangan wajib
- Progress per anggota per bulan dengan status & progress bar
- Pemilihan bulan (month selector) berdasarkan aktivitas union bulan berjalan
- Export/import (JSON snapshot + CSV terpisah)
- Validasi dasar, konfirmasi untuk aksi destruktif (hapus, import replace)

## 4. Non-Goals
- Multi-user/roles
- Backend/DB server
- Upload lampiran/receipt
- Dark mode (bisa ditambahkan nanti)
- Rollover surplus antar periode
- Duplikasi deteksi otomatis (enforcement) untuk MVP
- Non-member income kategori terpisah (semua CashIn diperlakukan sebagai iuran anggota untuk MVP)

## 5. User Flows
### 5.1 Catat Uang Masuk (CashIn)
1. Tekan "Catat Uang Masuk"
2. Pilih anggota (hanya anggota aktif muncul untuk periode berjalan; untuk pencatatan, wajib pilih anggota)
3. Periode default ke bulan berjalan (YYYY-MM, Asia/Jakarta), dapat diedit
4. Masukkan nominal (Rp, integer > 0)
5. Opsional: catatan
6. Simpan -> transaksi tercatat sebagai ledger

### 5.2 Catat Uang Keluar (CashOut)
1. Tekan "Catat Uang Keluar"
2. Masukkan nominal (Rp, integer > 0)
3. Masukkan keterangan (wajib, trim)
4. Simpan -> saldo kas berkurang

### 5.3 Kelola Anggota
1. Akses manajemen anggota
2. Tambah/edit anggota (nama wajib, trim)
3. Arsipkan/nonaktifkan anggota (tidak muncul untuk transaksi baru & tidak dihitung di target bulan berjalan; tetap muncul di riwayat)
4. Anggota terarsip tetap terjaga riwayatnya

### 5.4 Lihat Progress Per Bulan
1. Default ke bulan berjalan
2. Ganti bulan via month selector (berisi bulan dengan aktivitas union bulan berjalan)
3. Lihat daftar anggota dengan status, progress bar, dibayar/target/sisa, opsi "kelebihan RpX"

### 5.5 Backup
1. Export: unduh JSON snapshot + CSV terpisah (members, cashin, cashout)
2. Import: pilih file (JSON/CSV sesuai format), konfirmasi replace, sistem validasi skema/versi

## 6. Data Model
Lihat juga GLOSSARY.md untuk definisi domain.

### 6.1 Members
- id: UUID v4
- name: string (non-empty, trimmed)
- active: boolean (default true)
- createdAt: ISO8601 (Asia/Jakarta context; disimpan sebagai ISO string)

### 6.2 CashIn (Pemasukan Kas / Ledger)
- id: UUID v4
- memberId: UUID v4 (required)
- period: string "YYYY-MM" (required, Asia/Jakarta)
- amount: number (integer Rupiah, > 0)
- note: string | undefined (opsional)
- createdAt: ISO8601 string

### 6.3 CashOut (Pengeluaran Kas)
- id: UUID v4
- amount: number (integer Rupiah, > 0)
- note: string (required, non-empty, trimmed)
- createdAt: ISO8601 string

Semua transaksi dicatat secara immutable-ledger (penghapusan/edit diperbolehkan untuk MVP dengan konfirmasi; penghapusan CashIn mempengaruhi akumulasi member-periode, penghapusan CashOut mempengaruhi saldo).

## 7. Business Rules
### 7.1 Periode
- Periode berbentuk bulan kalender `YYYY-MM`, zona waktu Asia/Jakarta
- Progress direset per awal bulan; riwayat periode sebelumnya tetap dapat diakses
- Month selector berisi bulan yang muncul di transaksi (CashIn/CashOut) union bulan berjalan; default ke bulan berjalan

### 7.2 Target & Status Pembayaran
- Target per anggota per bulan: Rp20.000
- Akumulasi per (member, period) = sum(CashIn.amount) untuk memberId+period
- Status:
  - `belum bayar`: akumulasi <= 0 atau < target (0 < akumulasi < 20000? "sebagian"; "belum bayar" umumnya akumulasi 0/<target; sesuai keputusan: status `belum bayar` (< target), `sebagian` (0 < sum < target), `sudah bayar` (sum >= target))
  - `sebagian`: 0 < sum < 20000
  - `sudah bayar`: sum >= 20000
- Progress bar: nilai 0-100% dari akumulasi/target, dibatasi maksimal 100% (capped at 100%)
- Remaining (sisa): jika sum < 20000 -> 20000 - sum; jika sum >= 20000 -> Rp0. Opsional tampilkan "kelebihan RpX" (X = sum - 20000) sebagai teks kecil
- Surplus tetap berada dalam akumulasi periode tersebut; tidak ada rollover otomatis

### 7.3 Target Periode (agregat)
- Bulan berjalan: target periode = Rp20.000 × jumlah member aktif saat ini
- Periode historis: target periode dihitung berdasarkan anggota yang memiliki aktivitas di periode tersebut atau yang tercatat ada pada periode tersebut (untuk menjaga akurasi riwayat)

### 7.4 Saldo Kas
- Current cash balance = total seluruh CashIn - total seluruh CashOut (seluruh waktu)

### 7.5 Keanggotaan & Arsip
- Anggota terkelola (nama saja). Bisa diarsipkan/nonaktif
- Anggota yang diarsipkan tidak muncul di dropdown pencatatan baru dan tidak dihitung dalam target bulan berjalan; tetap muncul dalam tampilan riwayat periode sebelumnya
- Onboarding: jika belum ada anggota, tampilkan ajakan/tombol tambah anggota pertama (tidak bisa mencatat CashIn tanpa anggota)

### 7.6 Validasi
- Member.name wajib, tidak boleh kosong (setelah trim)
- CashIn: memberId + period + amount > 0 wajib
- CashOut: note (trimmed non-empty) + amount > 0 wajib
- Jumlah dalam Rupiah (integer), > 0
- Tidak ada enforcement duplikasi untuk MVP

## 8. UI/UX
- Mobile-first. SPA single view
- Header card: menampilkan saldo kas saat ini (besar). Opsional chips "Terkumpul bulan ini" / "Target bulan ini"
- Dua tombol utama berdampingan: "Catat Uang Masuk" (primary, hijau/teal) dan "Catat Uang Keluar" (secondary/warning, merah) 
- Section "Progress Bulan Ini": judul + month selector (dropdown atau prev/next). Default bulan berjalan
- List progress per anggota: inisial/avatar opsional, nama, badge status (belum/sebagian/sudah), progress bar, info "dibayar RpX / target Rp20000", sisa RpY, opsional "kelebihan RpZ"
- Urutan: sebagian dan belum bayar terlebih dahulu, kemudian berdasarkan nama
- Opsional "Transaksi Terakhir" (5 transaksi terakhir)
- Tema terang untuk MVP
- Empty states: belum ada anggota (onboarding), bulan tanpa aktivitas/anggota, belum ada transaksi
- Konfirmasi untuk delete transaksi dan untuk import replace

## 9. Storage & Export/Import
- localStorage versioned, key contoh: `kas:v1`. Struktur:
  - members: Member[]
  - cashIn: CashIn[]
  - cashOut: CashOut[]
- Export JSON: `{ version: "1.0.0" (atau konsisten dengan schema), exportedAt: ISO8601, members: [], cashIn: [], cashOut: [] }`
- Export CSV terpisah: `members.csv`, `cashin.csv`, `cashout.csv` (kolom relevan, period dalam format YYYY-MM)
- Import: replace seluruh data dengan konfirmasi UI. Validasi skema & versi. Tolak file tidak valid/malformed
- Timestamps menggunakan ISO8601 (zona Asia/Jakarta untuk konteks periode; simpan sebagai string)

## 10. Assumptions
- Penggunaan pribadi (single-user)
- Mayoritas akses via HP (mobile-first)
- Data finansial sederhana, audit trail minimal cukup dengan ledger + timestamps
- Surplus tidak perlu dialihkan ke bulan berikutnya
- Semua pemasukan dicatat sebagai iuran member untuk MVP

## 11. Acceptance Criteria
- [ ] Dapat menambah/edit/arsip anggota (nama wajib)
- [ ] Tidak bisa mencatat CashIn tanpa memilih anggota; default periode = bulan berjalan
- [ ] CashIn/CashOut menyimpan data valid (amount integer > 0; CashOut note wajib)
- [ ] Saldo header = total CashIn - total CashOut (akurat)
- [ ] Progress menghitung akumulasi per (member,period), status sesuai aturan, progress bar <= 100%, remaining Rp0 saat >= target, menampilkan kelebihan jika ada
- [ ] Month selector menampilkan bulan dengan aktivitas union bulan berjalan; default bulan berjalan
- [ ] Arsip anggota tidak muncul di pencatatan baru & tidak dihitung target bulan berjalan; tetap terlihat di riwayat
- [ ] Export JSON + CSV terpisah berfungsi; Import replace dengan konfirmasi & validasi skema/versi
- [ ] Data bertahan di localStorage (versioned); bisa dimuat kembali
- [ ] UI mobile-first, 2 tombol utama, list progress terurut (sebagian/belum bayar dulu, lalu nama)

## 12. References
- Draft konsep: `pencatat_uang_kas.md`
- Domain terms: `GLOSSARY.md`
- ADR: `docs/adr/0001-local-first-with-export-import.md`
- Jawaban wawancara: `jawaban.md` (Q1–Q20)
