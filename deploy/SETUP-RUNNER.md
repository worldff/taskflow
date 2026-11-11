# Menyiapkan Komputer Kelompok sebagai Server CD (Self-hosted Runner)

Tahap **CD** di pipeline men-deploy TaskFlow ke komputer Windows yang menjalankan
Docker Desktop. Komputer itu dihubungkan ke GitHub sebagai *self-hosted runner*.

## Langkah (sekali saja)
1. Pastikan **Docker Desktop** terbuka dan statusnya *Engine running*.
2. Di GitHub buka repo → **Settings → Actions → Runners → New self-hosted runner**.
3. Pilih **Windows**, arsitektur **x64**.
4. Buka **PowerShell**, lalu jalankan perintah yang ditampilkan GitHub secara berurutan:
   - bagian **Download** (membuat folder `actions-runner` dan mengunduh runner),
   - bagian **Configure** (`./config.cmd --url ... --token ...`). Tekan **Enter** untuk
     semua pertanyaan (nama, label, folder kerja) agar memakai nilai bawaan.
     Jika ditanya *"run as service?"*, jawab **N**.
5. Jalankan runner:
   ```
   ./run.cmd
   ```
   Jika muncul `Listening for Jobs`, runner sudah aktif. **Biarkan jendela ini terbuka**
   selama ingin menerima deploy.

## Cara kerja
Push ke branch `main` → CI (test, build, uji E2E di GitHub) → job **deploy** dijalankan
oleh runner di komputer ini:
`docker compose -p taskflow pull` → `docker compose -p taskflow up -d --wait` → cek `/api/health`.
Aplikasi versi terbaru langsung tersedia di http://localhost:8080 dan badge **API sha-xxxxxxx**
di pojok kanan atas menunjukkan commit yang sedang berjalan.

## Catatan keamanan
Runner menjalankan perintah dari repositori di komputer ini. Hidupkan runner hanya saat
diperlukan (tutup jendela `run.cmd` untuk mematikan), dan jangan menerima pull request
dari orang yang tidak dikenal.
