'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatTokens, classify, parseInput, detectVcs, formatVcs, render } = require('../context_meter.js');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GRAY = '\x1b[90m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

// ---------------------------------------------------------------------------
// Token Formatter
// ---------------------------------------------------------------------------
test('formatTokens: 0', () => assert.equal(formatTokens(0), '0'));
test('formatTokens: sub-thousand', () => assert.equal(formatTokens(999), '999'));
test('formatTokens: exactly 1000', () => assert.equal(formatTokens(1000), '1k'));
test('formatTokens: rounds down at 1499', () => assert.equal(formatTokens(1499), '1k'));
test('formatTokens: rounds up at 1500', () => assert.equal(formatTokens(1500), '2k'));
test('formatTokens: mid-thousands', () => assert.equal(formatTokens(24300), '24k'));
test('formatTokens: exactly 1M', () => assert.equal(formatTokens(1_000_000), '1M'));
test('formatTokens: mid-millions rounds down', () => assert.equal(formatTokens(1_200_000), '1M'));

// ---------------------------------------------------------------------------
// Threshold Classifier
// ---------------------------------------------------------------------------
test('classify: 0 is green', () => assert.equal(classify(0), 'green'));
test('classify: 69999 is green', () => assert.equal(classify(69_999), 'green'));
test('classify: 70000 is yellow', () => assert.equal(classify(70_000), 'yellow'));
test('classify: 100000 is yellow', () => assert.equal(classify(100_000), 'yellow'));
test('classify: 100001 is red', () => assert.equal(classify(100_001), 'red'));

// ---------------------------------------------------------------------------
// JSON Parser
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// VCS Detector
// ---------------------------------------------------------------------------
function makeExec(responses) {
  return cmd => {
    if (!(cmd in responses)) throw new Error(`Unexpected command: ${cmd}`);
    const val = responses[cmd];
    if (val instanceof Error) throw val;
    return val;
  };
}

test('detectVcs: GitHub HTTPS remote on named branch', () => {
  const exec = makeExec({
    'git branch --show-current': 'main\n',
    'git remote get-url origin': 'https://github.com/zbshadow/Raven.git\n',
  });
  const state = detectVcs('/fake', exec);
  assert.equal(state.type, 'branch');
  assert.equal(state.platform, 'GitHub');
  assert.equal(state.repo, 'Raven');
  assert.equal(state.branch, 'main');
});

test('detectVcs: Bitbucket SSH remote on named branch', () => {
  const exec = makeExec({
    'git branch --show-current': 'feature/x\n',
    'git remote get-url origin': 'git@bitbucket.org:org/Raven.git\n',
  });
  const state = detectVcs('/fake', exec);
  assert.equal(state.type, 'branch');
  assert.equal(state.platform, 'Bitbucket');
  assert.equal(state.repo, 'Raven');
  assert.equal(state.branch, 'feature/x');
});

test('detectVcs: no remote configured', () => {
  const exec = makeExec({
    'git branch --show-current': 'main\n',
    'git remote get-url origin': new Error('no remote'),
  });
  const state = detectVcs('/fake', exec);
  assert.equal(state.type, 'branch');
  assert.equal(state.platform, null);
  assert.equal(state.repo, null);
  assert.equal(state.branch, 'main');
});

test('detectVcs: unknown host uses host as platform', () => {
  const exec = makeExec({
    'git branch --show-current': 'main\n',
    'git remote get-url origin': 'https://mygit.corp.com/org/Raven.git\n',
  });
  const state = detectVcs('/fake', exec);
  assert.equal(state.type, 'branch');
  assert.equal(state.platform, 'mygit.corp.com');
  assert.equal(state.repo, 'Raven');
});

test('detectVcs: detached HEAD returns hash', () => {
  const exec = makeExec({
    'git branch --show-current': '\n',
    'git remote get-url origin': 'https://github.com/zbshadow/Raven.git\n',
    'git rev-parse --short HEAD': 'a3f9c12\n',
  });
  const state = detectVcs('/fake', exec);
  assert.equal(state.type, 'detached');
  assert.equal(state.platform, 'GitHub');
  assert.equal(state.repo, 'Raven');
  assert.equal(state.hash, 'a3f9c12');
});

test('detectVcs: no git repo returns none', () => {
  const exec = makeExec({
    'git branch --show-current': new Error('not a git repo'),
  });
  const state = detectVcs('/fake', exec);
  assert.equal(state.type, 'none');
});

test('detectVcs: GitLab SSH remote', () => {
  const exec = makeExec({
    'git branch --show-current': 'develop\n',
    'git remote get-url origin': 'git@gitlab.com:org/Raven.git\n',
  });
  const state = detectVcs('/fake', exec);
  assert.equal(state.platform, 'GitLab');
  assert.equal(state.repo, 'Raven');
});

// ---------------------------------------------------------------------------
// VCS Formatter
// ---------------------------------------------------------------------------
test('formatVcs: normal branch with full info is cyan', () => {
  const result = formatVcs({ type: 'branch', platform: 'GitHub', repo: 'Raven', branch: 'main' });
  assert.ok(result.includes(CYAN));
  assert.ok(result.includes('[GitHub/Raven/main]'));
  assert.ok(!result.includes('No version control'));
});

test('formatVcs: normal branch with no platform omits platform', () => {
  const result = formatVcs({ type: 'branch', platform: null, repo: 'Raven', branch: 'main' });
  assert.ok(result.includes('[Raven/main]'));
  assert.ok(!result.includes('null'));
});

test('formatVcs: normal branch with no remote shows branch only', () => {
  const result = formatVcs({ type: 'branch', platform: null, repo: null, branch: 'main' });
  assert.ok(result.includes('[main]'));
  assert.ok(!result.includes('/'));
});

test('formatVcs: detached HEAD with full info is gray', () => {
  const result = formatVcs({ type: 'detached', platform: 'GitHub', repo: 'Raven', hash: 'a3f9c12' });
  assert.ok(result.includes(GRAY));
  assert.ok(!result.includes(CYAN));
  assert.ok(result.includes('[GitHub/Raven/HEAD detached-a3f9c12]'));
});

test('formatVcs: detached HEAD with no remote', () => {
  const result = formatVcs({ type: 'detached', platform: null, repo: null, hash: 'a3f9c12' });
  assert.ok(result.includes('[HEAD detached-a3f9c12]'));
});

test('formatVcs: no git is gray with correct text', () => {
  const result = formatVcs({ type: 'none' });
  assert.ok(result.includes(GRAY));
  assert.ok(!result.includes(CYAN));
  assert.ok(result.includes('[No version control]'));
});

test('formatVcs: separator dot is always present', () => {
  for (const state of [
    { type: 'none' },
    { type: 'branch', platform: 'GitHub', repo: 'Raven', branch: 'main' },
    { type: 'detached', platform: null, repo: null, hash: 'abc1234' },
  ]) {
    assert.ok(formatVcs(state).includes('·'), `missing · for type=${state.type}`);
  }
});

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const NO_VCS = { type: 'none' };

test('render: Context label is gray in all zones', () => {
  for (const tokens of [0, 85_000, 112_000]) {
    const result = render(tokens, 10, NO_VCS);
    assert.ok(result.includes(`${GRAY}Context:`), `gray Context: missing for ${tokens}`);
  }
});

test('render: green zone numbers are green', () => {
  const result = render(24300, 18, NO_VCS);
  assert.ok(result.includes(`${GREEN}24k (18%)${RESET}`));
});

test('render: yellow zone numbers are yellow', () => {
  const result = render(85_000, 43, NO_VCS);
  assert.ok(result.includes(`${YELLOW}85k (43%)${RESET}`));
});

test('render: red zone numbers are red', () => {
  const result = render(112_000, 56, NO_VCS);
  assert.ok(result.includes(`${RED}112k (56%)${RESET}`));
});

test('render: red zone suggestion message is gray', () => {
  const result = render(112_000, 56, NO_VCS);
  assert.ok(result.includes(`${GRAY} · Consider /compact or /clear${RESET}`));
});

test('render: no suggestion in green', () => assert.ok(!render(24300, 18, NO_VCS).includes('Consider')));
test('render: no suggestion in yellow', () => assert.ok(!render(85_000, 43, NO_VCS).includes('Consider')));

test('render: percentage rounds', () => assert.ok(render(24300, 18.3, NO_VCS).includes('(18%)')));

test('render: ANSI reset always present', () => {
  for (const tokens of [0, 85_000, 112_000]) assert.ok(render(tokens, 10, NO_VCS).includes(RESET));
});

test('render: VCS segment appended after numbers in green zone', () => {
  const vcs = { type: 'branch', platform: 'GitHub', repo: 'Raven', branch: 'main' };
  const result = render(24300, 18, vcs);
  assert.ok(result.includes('[GitHub/Raven/main]'));
  const numIdx = result.indexOf('24k');
  const vcsIdx = result.indexOf('[GitHub/Raven/main]');
  assert.ok(vcsIdx > numIdx);
});

test('render: VCS segment appended after suggestion in red zone', () => {
  const vcs = { type: 'branch', platform: 'GitHub', repo: 'Raven', branch: 'main' };
  const result = render(112_000, 56, vcs);
  assert.ok(result.includes('Consider /compact or /clear'));
  assert.ok(result.includes('[GitHub/Raven/main]'));
  const msgIdx = result.indexOf('Consider');
  const vcsIdx = result.indexOf('[GitHub/Raven/main]');
  assert.ok(vcsIdx > msgIdx);
});

test('render: no VCS argument defaults to no version control', () => {
  const result = render(24300, 18);
  assert.ok(result.includes('[No version control]'));
});

test('render: detached HEAD in output', () => {
  const vcs = { type: 'detached', platform: 'GitHub', repo: 'Raven', hash: 'a3f9c12' };
  const result = render(24300, 18, vcs);
  assert.ok(result.includes('HEAD detached-a3f9c12'));
  assert.ok(!result.includes(CYAN));
});
