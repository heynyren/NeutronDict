@echo off
setlocal enabledelayedexpansion
title NeutronDict - Cap nhat extension

REM ================================================================
REM  Cap nhat NeutronDict tu GitHub (keo code moi nhat ve may).
REM  Bam doi chuot vao file nay moi khi muon cap nhat.
REM
REM  Vi sao KHONG dung "git pull" nua:
REM    git pull = tai ve + nhap vao. Sau buoc tai ve, git thinh
REM    thoang tu don kho va tren Windows hay ket o cau hoi
REM    "Deletion of directory ... failed. Should I try again? (y/n)"
REM    (thuong do Windows Defender dang quet, hoac dang mo thu muc
REM    trong Explorer). Ket o do thi buoc NHAP VAO khong bao gio
REM    chay -> ban tuong da cap nhat xong, ma code van la ban cu.
REM
REM  Nay: tat don kho (gc.auto=0), tai ve roi ep khop chinh xac voi
REM  ban tren GitHub, va IN RA ma commit de ban tu doi chieu.
REM  LUU Y: moi sua doi code cuc bo trong thu muc nay se bi ghi de.
REM
REM  Thu muc "extension" giu nguyen duong dan -> extension giu nguyen
REM  ID va so tay da luu KHONG mat. Xong nho bam Reload.
REM ================================================================

set "BRANCH="

cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] Chua cai Git. Tai tai: https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo.
  echo [LOI] Thu muc nay khong phai ban sao git ^(git clone^) cua repo.
  echo.
  pause
  exit /b 1
)

if not defined BRANCH (
  for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
)

echo.
echo === NeutronDict: dang cap nhat nhanh "!BRANCH!"... ===
echo.

git -c gc.auto=0 fetch origin "!BRANCH!" --prune
if errorlevel 1 goto fail

git -c gc.auto=0 reset --hard "origin/!BRANCH!"
if errorlevel 1 goto fail

REM Co y KHONG chay "git clean": thu muc android co node_modules va
REM phan Capacitor tu sinh, deu khong nam trong git — don di la phai
REM cai lai tu dau.

set "REV="
for /f "delims=" %%v in ('git rev-parse --short HEAD') do set "REV=%%v"

echo.
echo ================================================================
echo  ^>^> Cap nhat xong.  ^(commit !REV!^)
echo.
echo  Buoc cuoi: mo   chrome://extensions
echo  tim "NeutronDict" roi bam Reload ^(vong tron mui ten^)
echo  va kiem tra so phien ban.
echo ================================================================
echo.
pause
exit /b 0

:fail
echo.
echo [LOI] Cap nhat that bai. Thuong do 1 file/thu muc dang bi khoa.
echo   - Dong File Explorer / VS Code dang mo thu muc nay.
echo   - Roi chay lai file update.bat nay.
echo.
pause
exit /b 1
