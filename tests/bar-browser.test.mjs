import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { BROWSER } from '../mods/omarchy-bar/browser.js';

const execute = promisify(execFile);

test('the bar Browser button opens terminal-browser in a Ghostty window', async () => {
  const root = await mkdtemp(`${tmpdir()}/herdr-bar-browser-`);
  try {
    await writeFile(`${root}/ghostty`, `#!/bin/sh\necho "$@" > ${root}/args\n`);
    await chmod(`${root}/ghostty`, 0o755);
    const [cmd, ...args] = BROWSER;
    await execute(cmd, args, { env: { HOME: root, SHELL: 'sh', PATH: `${root}:${process.env.PATH}` } });
    let got = '';
    for (let i = 0; i < 50 && !got; i++) {
      got = await readFile(`${root}/args`, 'utf8').catch(() => '');
      if (!got) await new Promise((r) => setTimeout(r, 20));
    }
    assert.equal(got.trim(), '-e terminal-browser https://duckduckgo.com');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
