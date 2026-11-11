@echo off
title TaskFlow - Menjalankan aplikasi
cd /d "%~dp0"

echo ============================================
echo    TaskFlow - Aplikasi Full Stack
echo    React + Flask + PostgreSQL/SQLite
echo ============================================
echo.

REM ---------- Cek Python & Node.js ----------
where python >nul 2>nul
if errorlevel 1 (
  echo [X] Python belum terpasang. Install dari https://www.python.org
  echo     Saat install, centang "Add Python to PATH".
  pause & exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js belum terpasang. Install dari https://nodejs.org
  pause & exit /b 1
)

REM ---------- Backend ----------
echo [1/4] Menyiapkan backend (Python)...
if not exist "backend\venv\Scripts\python.exe" (
  python -m venv backend\venv
  if errorlevel 1 ( echo [X] Gagal membuat virtual environment. & pause & exit /b 1 )
)
backend\venv\Scripts\python.exe -m pip install -q --disable-pip-version-check -r backend\requirements.txt
if errorlevel 1 ( echo [X] Gagal install library backend. Cek koneksi internet. & pause & exit /b 1 )

REM ---------- Frontend ----------
echo [2/4] Menyiapkan frontend (React)... pertama kali bisa 1-2 menit
pushd frontend
REM Hapus sisa instalasi lama (Vite 8) agar tidak bentrok
if exist "node_modules\vite\package.json" (
  node -e "process.exit(require('./node_modules/vite/package.json').version.startsWith('6.')?0:1)"
  if errorlevel 1 (
    echo     Membersihkan instalasi lama...
    rmdir /s /q node_modules
  )
)
if not exist "node_modules\vite" (
  call npm install --no-audit --no-fund
  if errorlevel 1 ( popd & echo [X] Gagal install library frontend. Cek koneksi internet. & pause & exit /b 1 )
)
popd

REM ---------- Jalankan ----------
echo [3/4] Menyalakan backend di http://localhost:5000 ...
start "TaskFlow Backend (jangan ditutup)" /D "%~dp0backend" cmd /k venv\Scripts\python.exe wsgi.py

echo [4/4] Menyalakan frontend di http://localhost:5173 ...
start "TaskFlow Frontend (jangan ditutup)" /D "%~dp0frontend" cmd /k npm run dev

echo.
echo Menunggu server siap...
timeout /t 6 /nobreak >nul
start "" http://localhost:5173

echo.
echo ============================================
echo  TaskFlow berjalan!  Buka: http://localhost:5173
echo.
echo  Login ADMIN : admin@taskflow.id / admin123
echo  Login USER  : klik "Daftar sekarang" untuk membuat akun
echo.
echo  Dua jendela hitam (Backend dan Frontend) harus
echo  tetap terbuka selama aplikasi dipakai.
echo  Untuk mematikan: tutup kedua jendela tersebut.
echo ============================================
echo.
pause
