# LPKP MENTARI Online Course

Platform kursus Microsoft Office berbasis Next.js 16 dan Supabase. MVP mencakup website publik, autentikasi, enrollment manual, materi video, upload ujian, penilaian pengajar, penerbitan PDF, dan validasi sertifikat publik.

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Script `dev`, `build`, dan `start` memuat `.env.local` melalui dotenvx.

## Supabase

Project terhubung: `zzfkzlvjqskyffmmierh` (`MentariOnlineCourse`).

```bash
supabase link --project-ref zzfkzlvjqskyffmmierh
supabase db push
supabase db advisors
```

Migration awal ada di `supabase/migrations/` dan mencakup RLS, Storage, serta seed Office Dasar dan Office Lanjutan.

## Role

- `participant`: melihat enrollment aktif, materi, upload ujian, dan sertifikat milik sendiri.
- `instructor`: mengelola materi dan menilai upload peserta.
- `admin`: mengelola peserta, pembayaran, akses, kursus, materi, role, dan sertifikat.

Akun baru selalu dibuat sebagai `participant`. Admin pertama perlu dipromosikan sekali melalui SQL atau dashboard Supabase sebelum pengelolaan role dapat dilakukan dari aplikasi.
