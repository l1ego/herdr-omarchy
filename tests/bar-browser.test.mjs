import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { BROWSER_TAB } from '../mods/omarchy-bar/browser.js';

const execute = promisify(execFile);

test('the bar Browser button starts terminal-browser through the login shell', async () => {
  const root = await mkdtemp(`${tmpdir()}/herdr-bar-browser-`);
  try {
    await writeFile(`${root}/terminal-browser`, '#!/bin/sh\necho "terminal-browser $# $1"\n');
    await chmod(`${root}/terminal-browser`, 0o755);
    const [cmd, ...args] = BROWSER_TAB.argv;
    const { stdout } = await execute(cmd, args, { env: { HOME: root, SHELL: 'sh', PATH: `${root}:${process.env.PATH}` } });
    assert.equal(BROWSER_TAB.name, 'Browser');
    assert.equal(stdout.trim().split('\n').pop(), 'terminal-browser 1 https://duckduckgo.com');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
