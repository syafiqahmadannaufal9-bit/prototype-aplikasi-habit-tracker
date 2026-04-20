# Konfigurasi Forgot Password - Supabase

## 📋 Status
✅ Fitur Forgot Password dan Reset Password sudah diimplementasikan

## 📁 File yang Dibuat/Diubah

### 1. **forgot_password.html** (BARU)
   - Halaman untuk pengguna meminta link reset password
   - Input email
   - Mengirim email reset via Supabase
   - Menampilkan pesan sukses/error

### 2. **reset_password.html** (BARU)
   - Halaman untuk mengatur password baru (diakses dari link email)
   - Input password baru dan konfirmasi
   - Validasi password match
   - Pengecekan session validity
   - Redirect ke login setelah sukses

### 3. **login.html** (DIPERBARUI)
   - Link "Forgot Password?" sekarang mengarah ke `forgot_password.html`

### 4. **profile.html** (DIPERBARUI)
   - Fungsi `resetPassword()` sekarang menggunakan Supabase
   - Mengirim email reset ke email pengguna yang login

## ⚙️ Konfigurasi Supabase

### URL Redirect untuk Password Reset

Anda HARUS mengonfigurasi URL redirect di Supabase untuk memastikan link reset password bekerja dengan baik.

**Langkah-langkah:**

1. Buka [Supabase Dashboard](https://supabase.com)
2. Pilih project Anda: `loovtbdzjgpqamhssnue`
3. Pergi ke **Authentication > Email Templates**
4. Tambahkan redirect URL di bagian **Allowed Redirect URLs**
   - Jika localhost: `http://localhost:3000/views/reset_password.html`
   - Jika production: `https://yourdomain.com/views/reset_password.html`

Atau lewat **Settings > Auth > Email Templates:**
- Tambahkan default URL redirect untuk password recovery

## 🔐 Alur Kerja

### Lupa Password:
1. User klik "Forgot Password?" di login.html
2. User masukkan email dan klik "Send Reset Link"
3. Supabase mengirim email dengan link reset
4. Link berisi token session untuk reset password
5. User klik link → dibawa ke reset_password.html
6. User masukkan password baru
7. Password ter-update dan user diarahkan ke login

### Reset dari Profile:
1. User di profile.html klik "Reset Password"
2. Sistem mengirim email reset ke email user
3. User ikuti proses yang sama seperti "Lupa Password"

## 🧪 Testing

### Test Locally:
```bash
# Pastikan supabase auth sudah dikonfigurasi dengan:
# - Email provider enabled
# - SMTP email service terkoneksi
```

### Cek Email Supabase:
- Buka Supabase Dashboard → Auth → Users
- Lihat email yang terkirim
- Atau buka email real jika sudah setup SMTP provider

## 📝 Catatan

- Password minimum: 6 karakter
- Link reset password berlaku untuk waktu tertentu (default: 1 jam)
- Reset password hanya bekerja jika user sudah verified (jika email verification enabled)
- Pastikan Supabase email configuration sudah diaktifkan

## 🚀 Features

✅ Forgot Password Flow
✅ Reset Password dengan validasi
✅ Session checking (jika link expired)
✅ Error handling & user feedback
✅ Theme support (green/blue)
✅ Responsive design
✅ Professional UI dengan icons & animations

