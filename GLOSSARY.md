# GLOSSARY

## Member (Anggota)
Seseorang yang berkewajiban membayar iuran kas setiap bulan. Tersimpan dalam daftar anggota terkelola (nama saja untuk MVP). Dapat diarsipkan/tidak aktif tanpa menghapus riwayat pembayaran.

## CashIn (Pemasukan Kas)
Transaksi pemasukan uang kas. Untuk MVP, seluruh CashIn diperlakukan sebagai pembayaran iuran member dan wajib terikat ke Member dan Period (YYYY-MM). Setiap entri dicatat sebagai ledger terpisah (bukan hanya saldo) untuk memungkinkan pencatatan cicilan per transaksi.

## CashOut (Pengeluaran Kas)
Transaksi pengeluaran uang kas. Mengurangi saldo kas saat ini, namun tidak mempengaruhi target iuran member per periode. Memerlukan catatan (keterangan) saat dicatat.

## Period (Periode/Bulan)
Periode pembayaran iuran dalam bentuk bulan kalender `YYYY-MM`. Menggunakan zona waktu Asia/Jakarta. Progress direset per awal bulan kalender; riwayat periode sebelumnya tetap dapat diakses.

## Payment (Transaksi Iuran)
Konsep transaksi terkait iuran member dalam suatu Period. CashIn yang terikat (Member, Period) merupakan pembayaran iuran yang terakumulasi untuk mencapai target Rp20.000/anggota/bulan.

## Status Pembayaran
Status pembayaran member untuk suatu Period: `belum bayar` (akumulasi 0 atau < target), `sebagian` (0 < akumulasi < target), `sudah bayar` (akumulasi >= target). Target tetap Rp20.000 per member per bulan. Progress bar dibatasi maksimal 100%. Jika akumulasi >= target, sisa ditampilkan Rp0; kelebihan dapat ditampilkan sebagai teks tambahan ("kelebihan RpX"). Surplus tetap berada dalam akumulasi periode tersebut (tidak ada rollover otomatis ke periode berikutnya).

## Saldo Kas (Current Cash Balance)
Saldo kas saat ini = total seluruh CashIn - total seluruh CashOut (seluruh waktu).

## Target Periode
Target iuran yang harus terkumpul dalam suatu Period. Untuk periode saat ini (current month), target dihitung berdasarkan jumlah member aktif saat ini. Untuk periode historis, target dihitung berdasarkan anggota yang memiliki aktivitas di periode tersebut atau yang tercatat ada pada periode tersebut (untuk menjaga akurasi riwayat). Untuk perhitungan status per member, digunakan target per member Rp20.000.

## Export/Import
Data dapat diekspor dalam bentuk JSON (snapshot lengkap: `{version, exportedAt, members[], cashIn[], cashOut[]}`) dan CSV terpisah (`members.csv`, `cashin.csv`, `cashout.csv`). Impor akan menggantikan seluruh data yang ada dengan konfirmasi di UI, serta memvalidasi skema dan versi.

## LocalStorage Schema
Data disimpan di `localStorage` dengan kunci versioned (mis. `kas:v1`) menggunakan struktur terpisah: `members`, `cashIn`, `cashOut`. ID menggunakan UUID v4. Nilai uang dalam Rupiah (integer). Seluruh jumlah > 0. Versi skema disertakan pada export.
