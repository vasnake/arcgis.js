@rem -*- mode: bat; coding: utf-8 -*-

@REM ~ http://jashkenas.github.io/coffee-script/

@echo off
chcp 1251 > nul
set wd=%~dp0
pushd "%wd%"

coffee -w -c -o c:\Inetpub\wwwroot\mapedit\javascript\vs\obj\ c:\Inetpub\wwwroot\mapedit\javascript\vs\
