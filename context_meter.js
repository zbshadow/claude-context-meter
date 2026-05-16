#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GRAY = '\x1b[38;5;245m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const GREEN_THRESHOLD = 70_000;
const YELLOW_THRESHOLD = 100_000;

const ANSI = { green: GREEN, yellow: YELLOW, red: RED };

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
    return [tokens, pct];
  } catch {
    return [0, 0];
  }
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

function render(tokens, pct, vcsState = { type: 'none' }) {
  const formatted = formatTokens(tokens);
  const pctInt = Math.round(pct);
  const category = classify(tokens);
  const zoneColor = ANSI[category];

  let line = `${GRAY}Context: ${RESET}${zoneColor}${formatted} (${pctInt}%)${RESET}`;

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
    const [tokens, pct] = parseInput(data);
    console.log(render(tokens, pct, detectVcs()));
  });
}

module.exports = { formatTokens, classify, parseInput, detectVcs, formatVcs, render };
