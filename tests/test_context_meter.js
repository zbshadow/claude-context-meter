'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatTokens, classify, parseInput, render } = require('../context_meter.js');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

// Token Formatter
test('formatTokens: 0', () => assert.equal(formatTokens(0), '0'));
test('formatTokens: sub-thousand', () => assert.equal(formatTokens(999), '999'));
test('formatTokens: exactly 1000', () => assert.equal(formatTokens(1000), '1k'));
test('formatTokens: rounds down at 1499', () => assert.equal(formatTokens(1499), '1k'));
test('formatTokens: rounds up at 1500', () => assert.equal(formatTokens(1500), '2k'));
test('formatTokens: mid-thousands', () => assert.equal(formatTokens(24300), '24k'));
test('formatTokens: exactly 1M', () => assert.equal(formatTokens(1_000_000), '1M'));
test('formatTokens: mid-millions rounds down', () => assert.equal(formatTokens(1_200_000), '1M'));

// Threshold Classifier
test('classify: 0 is green', () => assert.equal(classify(0), 'green'));
test('classify: 69999 is green', () => assert.equal(classify(69_999), 'green'));
test('classify: 70000 is yellow', () => assert.equal(classify(70_000), 'yellow'));
test('classify: 100000 is yellow', () => assert.equal(classify(100_000), 'yellow'));
test('classify: 100001 is red', () => assert.equal(classify(100_001), 'red'));

// JSON Parser
test('parseInput: well-formed payload', () => {
  const data = JSON.stringify({ context_window: { total_input_tokens: 24300, used_percentage: 18.3 } });
  const [tokens, pct] = parseInput(data);
  assert.equal(tokens, 24300);
  assert.ok(Math.abs(pct - 18.3) < 0.001);
});
test('parseInput: missing total_input_tokens defaults to 0', () => {
  const data = JSON.stringify({ context_window: { used_percentage: 10.0 } });
  const [tokens] = parseInput(data);
  assert.equal(tokens, 0);
});
test('parseInput: missing used_percentage defaults to 0', () => {
  const data = JSON.stringify({ context_window: { total_input_tokens: 5000 } });
  const [, pct] = parseInput(data);
  assert.equal(pct, 0);
});
test('parseInput: empty JSON defaults both to 0', () => {
  const [tokens, pct] = parseInput('{}');
  assert.equal(tokens, 0);
  assert.equal(pct, 0);
});
test('parseInput: malformed JSON defaults both to 0', () => {
  const [tokens, pct] = parseInput('not json at all');
  assert.equal(tokens, 0);
  assert.equal(pct, 0);
});

// Renderer
test('render: initial state is green', () => {
  const result = render(0, 0);
  assert.ok(result.includes('Context: 0 (0%)'));
  assert.ok(result.startsWith(GREEN));
  assert.ok(result.endsWith(RESET));
});
test('render: green mid-range', () => {
  const result = render(24300, 18);
  assert.ok(result.includes('Context: 24k (18%)'));
  assert.ok(result.startsWith(GREEN));
  assert.ok(result.endsWith(RESET));
});
test('render: yellow', () => {
  const result = render(85_000, 43);
  assert.ok(result.includes('Context: 85k (43%)'));
  assert.ok(result.startsWith(YELLOW));
  assert.ok(result.endsWith(RESET));
  assert.ok(!result.includes('Consider'));
});
test('render: red with suggestion', () => {
  const result = render(112_000, 56);
  assert.ok(result.includes('Context: 112k (56%)'));
  assert.ok(result.includes('· Consider /compact or /clear'));
  assert.ok(result.startsWith(RED));
  assert.ok(result.endsWith(RESET));
});
test('render: no suggestion in green', () => assert.ok(!render(24300, 18).includes('Consider')));
test('render: no suggestion in yellow', () => assert.ok(!render(85_000, 43).includes('Consider')));
test('render: percentage rounds', () => assert.ok(render(24300, 18.3).includes('(18%)')));
test('render: ANSI reset always present', () => {
  for (const tokens of [0, 85_000, 112_000]) assert.ok(render(tokens, 10).includes(RESET));
});
