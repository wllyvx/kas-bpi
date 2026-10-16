# Konsep pencatat uang kas
Note: SEMUA yang saya tulis di sini merupakan ide dan konsep kasar, kamu bisa challange jika ada opsi yang menurut kamu lebih baik

## Overview
saya ingin membuat aplikasi pencatatan uang kas sederhana berbasis web, fungsi utamanya adalah mencatat uang kas masuk dan keluar. uang kas dikumpulkan setiap bulan. selain itu saya ingin bisa melihat siapa saja member yang sudah atau belum membayar uang kas per bulannya. jumlah uang kas yang harus dibayar setiap bulannya adalah Rp.20.000 per orang (tidak harus sekaligus, bisa dicicil, yang penting dalam 1 bulan harus terkumpul 20.000)

## Alur kerja
contoh alur kerja:
- saya input uang kas masuk -> memilih uang masuk dari siapa (member) -> input nominal -> uang kas tercatat masuk

- input uang kas keluar -> beri catatan untuk apa -> uang kas tercatat

## UI
gunakan metode mobile first karena saya mostly akan pakai hp. untuk desainnya gunakan desain aplikasi keuangan yang modern, slick, clean.

pada header, saya ingin menampilkan total nominal uang kas saat ini, mungkin bisa berupa card. di bawah header ada 2 tombol fungsi utama: catat uang masuk dan catat uang keluar. lalu di section berikutnya saya ingin menampilkan list progress setiap member, mungkin bisa pakai atribut status (belum bayar, sebagian(?), sudah bayar) atau pakai progress bar. contoh: "agung sudah bayar bulan september". progress direset setiap bulannya namun history bulan sebelumnya harus tetap bisa diakses