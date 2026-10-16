# ADR 0001: Local-first (localStorage) dengan Export/Import untuk pencatat uang kas

## Status
Accepted

## Context
Aplikasi pencatat uang kas sederhana untuk mencatat uang masuk (iuran member per periode) dan keluar. Dibutuhkan untuk penggunaan pribadi (single-user), mobile-first, dan menjaga kemudahan setup tanpa backend. Data bersifat finansial sehingga perlu mekanisme backup.

## Decision
- Local-first: data disimpan di localStorage browser (tanpa autentikasi/backend untuk MVP)
- Skema versioned (`kas:v1`) dengan entitas terpisah: members, cashIn, cashOut
- Export: JSON snapshot lengkap (`{version, exportedAt, members[], cashIn[], cashOut[]}`) dan CSV terpisah (`members.csv`, cashin.csv, cashout.csv)
- Import: menggantikan data dengan konfirmasi UI, validasi skema & versi
- Ledger-based untuk CashIn (transaksi per (member, period)) untuk mendukung cicilan; saldo dihitung = total in - total out

## Consequences
- Mudah digunakan, tidak perlu deploy backend
- Perlu edukasi backup via export/import
- Data hanya tersedia di browser/perangkat tempat data disimpan
- Bisa migrasi ke backend nanti tanpa mengubah model domain (ledger + saldo)

## Alternatives Considered
- Backend + database: lebih aman untuk multi-device tapi menambah kompleksitas auth/deploy untuk MVP
- Hanya saldo per member: tidak cukup untuk audit trail cicilan per transaksi
