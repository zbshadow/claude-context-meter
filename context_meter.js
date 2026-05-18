#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GRAY = '\x1b[38;5;245m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const GREEN_THRESHOLD = 70_000;
const YELLOW_THRESHOLD = 100_000;

const ANSI = { green: GREEN, yellow: YELLOW, red: RED };

const CURRENT_VERSION = '1.0.4';
const CACHE_FILE = path.join(os.homedir(), '.claude', 'plugins', 'context-meter', '.update-cache.json');
const NPM_URL = 'https://registry.npmjs.org/claude-context-meter/latest';

const KNOWN_PLATFORMS = {
  'github.com': 'GitHub',
  'bitbucket.org': 'Bitbucket',
  'gitlab.com': 'GitLab',
};

function formatTokens(count) {
  if (count >= 1_000_000) return `${Math.round(count / 1_000_000)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`;
  return String(count);
}

function classify(count) {
  if (count < GREEN_THRESHOLD) return 'green';
  if (count <= YELLOW_THRESHOLD) return 'yellow';
  return 'red';
}

function parseInput(data) {
  try {
    const payload = JSON.parse(data);
    const cw = payload.context_window || {};
    const tokens = parseInt(cw.total_input_tokens ?? 0, 10) || 0;
    const pct = parseFloat(cw.used_percentage ?? 0) || 0;
    const model = payload.model?.display_name || null;
    const sessionId = payload.session_id || null;
    return [tokens, pct, model, sessionId];
  } catch {
    return [0, 0, null, null];
  }
}

function isNewer(latest, current) {
  const parse = v => v.split('.').map(Number);
  const [la, lb, lc] = parse(latest);
  const [ca, cb, cc] = parse(current);
  return la > ca || (la === ca && lb > cb) || (la === ca && lb === cb && lc > cc);
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch { /* ignore write failures */ }
}

function spawnVersionCheck(sessionId) {
  const req = https.get(NPM_URL, res => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => {
      try {
        const { version } = JSON.parse(body);
        writeCache({ session_id: sessionId, latest_version: version });
      } catch { /* ignore parse failures */ }
    });
  });
  req.on('error', () => {});
}

function checkForUpdate(sessionId) {
  const cache = readCache();
  if (!cache || cache.session_id !== sessionId) {
    writeCache({ session_id: sessionId, latest_version: cache?.latest_version || null });
    spawnVersionCheck(sessionId);
  }
  return cache?.latest_version || null;
}

function parseRemoteUrl(url) {
  let host = null;
  let repo = null;

  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    host = sshMatch[1];
    repo = sshMatch[2].split('/').pop() || null;
  } else {
    try {
      const u = new URL(url);
      host = u.hostname || null;
      const segments = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
      repo = segments.pop() || null;
    } catch {
      // unparseable remote URL
    }
  }

  const platform = host ? (KNOWN_PLATFORMS[host] || host) : null;
  return { platform, repo };
}

function detectVcs(cwd = process.cwd(), exec = execSync) {
  const run = cmd => exec(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

  let branch;
  try {
    branch = run('git branch --show-current');
  } catch {
    return { type: 'none' };
  }

  let platform = null;
  let repo = null;
  try {
    ({ platform, repo } = parseRemoteUrl(run('git remote get-url origin')));
  } catch {
    // no remote configured
  }

  let dirty = false;
  try {
    dirty = run('git status --porcelain').length > 0;
  } catch {
    // default to clean if git status fails
  }

  if (!branch) {
    let hash = 'HEAD';
    try { hash = run('git rev-parse --short HEAD'); } catch { /* use fallback */ }
    return { type: 'detached', platform, repo, hash, dirty };
  }

  return { type: 'branch', platform, repo, branch, dirty };
}

function formatVcs(vcsState) {
  if (vcsState.type === 'none') {
    return `${GRAY} · [No version control]${RESET}`;
  }

  const { dirty } = vcsState;
  const color = dirty ? CYAN : GRAY;
  const star = dirty ? '*' : '';

  if (vcsState.type === 'detached') {
    const bracketParts = [vcsState.platform, vcsState.repo].filter(Boolean);
    const bracket = bracketParts.length ? `[${bracketParts.join('/')}] ` : '';
    const content = `${bracket}(HEAD detached at ${vcsState.hash})${star}`;
    return dirty
      ? `${GRAY} · ${RESET}${color}${content}${RESET}`
      : `${GRAY} · ${content}${RESET}`;
  }

  const parts = [vcsState.platform, vcsState.repo, vcsState.branch].filter(Boolean);
  const content = `[${parts.join('/')}${star}]`;
  return dirty
    ? `${GRAY} · ${RESET}${color}${content}${RESET}`
    : `${GRAY} · ${content}${RESET}`;
}

function render(tokens, pct, vcsState = { type: 'none' }, model = null) {
  const formatted = formatTokens(tokens);
  const pctInt = Math.round(pct);
  const category = classify(tokens);
  const zoneColor = ANSI[category];

  const prefix = model ? `${GRAY}${model} · Context: ${RESET}` : `${GRAY}Context: ${RESET}`;
  let line = `${prefix}${zoneColor}${formatted} (${pctInt}%)${RESET}`;

  if (category === 'red') {
    line += `${GRAY} · Consider /compact or /clear${RESET}`;
  }

  line += formatVcs(vcsState);

  return line;
}

if (require.main === module) {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => {
    const [tokens, pct, model, sessionId] = parseInput(data);
    const latestVersion = checkForUpdate(sessionId);
    const lines = [render(tokens, pct, detectVcs(), model)];
    if (latestVersion && isNewer(latestVersion, CURRENT_VERSION)) {
      lines.push(`${YELLOW}New version available. Run: npx claude-context-meter@latest install${RESET}`);
    }
    console.log(lines.join('\n'));
  });
}

module.exports = { formatTokens, classify, parseInput, detectVcs, formatVcs, render, isNewer, checkForUpdate };
