@echo off
REM ================================================================
REM  Cap nhat NeutronDict tu GitHub (keo code moi nhat ve may).
REM  Bam doi chuot vao file nay moi khi muon cap nhat.
REM  Sau do vao chrome://extensions bam nut "Update" (hoac nut reload
REM  vong tron mui ten tren the NeutronDict) la ban moi chay ngay.
REM ================================================================
cd /d "%~dp0"
echo.
echo Dang keo ban moi nhat tu GitHub...
echo.
git pull
echo.
echo ================================================================
echo  XONG. Bay gio:
echo   1) Mo chrome://extensions
echo   2) Bam nut "Update" o goc tren phai (che do Developer)
echo      hoac nut reload tren the NeutronDict.
echo ================================================================
echo.
pause
