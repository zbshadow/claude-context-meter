#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const INSTALL_DIR = path.join(os.homedir(), '.claude', 'plugins', 'context-meter');
const SCRIPT_DEST = path.join(INSTALL_DIR, 'context_meter.js');
const SETTINGS_FILE = path.join(os.homedir(), '.claude', 'settings.json');
const SETTINGS_BACKUP = SETTINGS_FILE + '.bak';

function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}

function writeSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n');
}

function backupSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    fs.copyFileSync(SETTINGS_FILE, SETTINGS_BACKUP);
  }
}

function removeBackup() {
  if (fs.existsSync(SETTINGS_BACKUP)) {
    fs.unlinkSync(SETTINGS_BACKUP);
  }
}

function install() {
  fs.mkdirSync(INSTALL_DIR, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'context_meter.js'), SCRIPT_DEST);

  const settings = readSettings();
  if (settings.statusLine) {
    console.log('Existing statusLine found — backing up settings.json before overwriting.');
  }
  backupSettings();

  settings.statusLine = {
    type: 'command',
    command: `node "${SCRIPT_DEST}"`
  };
  writeSettings(settings);

  const written = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  if (written.statusLine && written.statusLine.command === `node "${SCRIPT_DEST}"`) {
    removeBackup();
    console.log('Installed to ' + SCRIPT_DEST);
    console.log('Updated ~/.claude/settings.json');
    console.log('\nOpen a new Claude Code session to see the context meter.');
  } else {
    console.error('Verification failed — backup preserved at ' + SETTINGS_BACKUP);
    process.exit(1);
  }
}

function uninstall() {
  const settings = readSettings();
  if (!settings.statusLine) {
    console.log('No statusLine entry found in settings.json — nothing to remove.');
  } else {
    backupSettings();
    delete settings.statusLine;
    writeSettings(settings);

    const written = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    if (!written.statusLine) {
      removeBackup();
      console.log('Removed statusLine from ~/.claude/settings.json');
    } else {
      console.error('Verification failed — backup preserved at ' + SETTINGS_BACKUP);
      process.exit(1);
    }
  }

  if (fs.existsSync(INSTALL_DIR)) {
    fs.rmSync(INSTALL_DIR, { recursive: true });
    console.log('Removed ' + INSTALL_DIR);
  }

  console.log('\nOpen a new Claude Code session to complete the uninstall.');
}

const command = process.argv[2];
if (command === 'install') {
  install();
} else if (command === 'uninstall') {
  uninstall();
} else {
  console.error('Usage: npx claude-context-meter <install|uninstall>');
  process.exit(1);
}
