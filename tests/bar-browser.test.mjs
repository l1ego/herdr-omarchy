import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { BROWSER_TAB } from '../mods/omarchy-bar/browser.js';

const execute = promisify(execFile);

test('the bar Browser button starts w3m through the login shell', async () => {
  const root = await mkdtemp(`${tmpdir()}/herdr-bar-browser-`);
  try {
    await writeFile(`${root}/w3m`, '#!/bin/sh\necho "w3m $# $1"\n');
    await chmod(`${root}/w3m`, 0o755);
    const [cmd, ...args] = BROWSER_TAB.argv;
    const { stdout } = await execute(cmd, args, { env: { HOME: root, SHELL: 'sh', PATH: `${root}:${process.env.PATH}` } });
    assert.equal(BROWSER_TAB.name, 'Browser');
    assert.equal(stdout.trim().split('\n').pop(), 'w3m 1 https://duckduckgo.com');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
