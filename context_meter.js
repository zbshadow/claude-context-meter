#!/usr/bin/env node
'use strict';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const GREEN_THRESHOLD = 70_000;
const YELLOW_THRESHOLD = 100_000;
const RED_ZONE_MSG = ' · Consider /compact or /clear';

const ANSI = { green: GREEN, yellow: YELLOW, red: RED };

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

function render(tokens, pct) {
  const formatted = formatTokens(tokens);
  const pctInt = Math.round(pct);
  const category = classify(tokens);
  let line = `Context: ${formatted} (${pctInt}%)`;
  if (category === 'red') line += RED_ZONE_MSG;
  return `${ANSI[category]}${line}${RESET}`;
}

if (require.main === module) {
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { data += chunk; });
  process.stdin.on('end', () => {
    const [tokens, pct] = parseInput(data);
    console.log(render(tokens, pct));
  });
}

module.exports = { formatTokens, classify, parseInput, render };
