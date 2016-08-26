@rem -*- mode: bat; coding: utf-8 -*-

@REM ~ read http://jashkenas.github.io/coffee-script/
@REM ~ install http://nodejs.org/dist/v0.10.24/node-v0.10.24-x86.msi from http://nodejs.org/
@REM ~ run nodejs
@REM ~ > node
@REM ~ install coffee-script:
@REM ~ > npm install -g coffee-script

@echo off
chcp 1251 > nul
set wd=%~dp0
pushd "%wd%"

title coffee compiler

@REM ~ w/o source map
@REM ~ coffee -w -c -o c:\Inetpub\wwwroot\mapedit\javascript\vs\obj\ c:\Inetpub\wwwroot\mapedit\javascript\vs\

@REM ~ with source map
coffee -m -w -c -o c:\Inetpub\wwwroot\mapedit\javascript\vs\obj\ c:\Inetpub\wwwroot\mapedit\javascript\vs\
