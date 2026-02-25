# OpenChat Configuration Module
# 配置模块

$script:AppName = 'OpenChat'
$script:AppVersion = '1.0.0'
$script:AppHome = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$script:ConfigFile = Join-Path $script:AppHome 'etc\config.json'
$script:PidFile = Join-Path $script:AppHome 'var\run\openchat.pid'
$script:LogDir = Join-Path $script:AppHome 'var\logs'
$script:DataDir = Join-Path $script:AppHome 'var\data'
$script:ErrorLog = Join-Path $script:AppHome 'error.log'
