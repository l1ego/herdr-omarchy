import { exec, home, appHome, readTextFile, writeTextFile, shared, setShared, notify, window } from "herdr";

// The bar keeps the layout up to date with this repo's main: it checks, the person applies it from
// Mod Manager. Its own clone, apart from any checkout the person works in.
// This fork's main is upstream's (shafiqimtiaz/herdr-omarchy) plus our own changes, so an update
// keeps them; upstream's news reach it through .github/workflows/sync-upstream.yml.
export const REPO = "https://github.com/l1ego/herdr-omarchy.git";
export const RECORD = "omarchy-bar.update"; // { sha, layout }: what was applied last
export const AVAILABLE = "omarchy-bar.update-available"; // { sha, mods } while main is ahead of RECORD
const clone = () => `${home()}/.cache/herdr-omarchy`;
const short = (sha) => sha.slice(0, 7);

const git = async (args) => {
  const r = await exec("git", args, { timeout: 120000 }).catch(() => null);
  return r?.code === 0 ? r.stdout.trim() : null;
};

// Windows has no sh, rm, find or cp. Git for Windows, which the clone needs anyway, ships them in
// usr\bin beside its cmd\git.exe: run them from there. Without it, null: no update on Windows.
const windows = () => window()?.platform === "windows";
let unixBin = null;
async function tool(cmd) {
  if (!windows()) return cmd;
  unixBin ??= exec("where", ["git"]).then((r) => {
    const git = r?.code === 0 ? r.stdout.split(/\r?\n/).map((l) => l.trim()).find((l) => /\\cmd\\git\.exe$/i.test(l)) : null;
    return git ? git.replace(/\\cmd\\git\.exe$/i, "\\usr\\bin") : null;
  }, () => null);
  const bin = await unixBin;
  return bin ? `${bin}\\${cmd}.exe` : null;
}

// Fetches main into the clone and says whether it is ahead: the sidebar's Mods row shows a dot,
// and Mod Manager marks the layout's mods. Checks and updates take turns: both use the one clone.
let queue = Promise.resolve();
const inTurn = (job) => (queue = queue.catch(() => {}).then(job));

export const checkUpdate = () => inTurn(check);

async function check() {
  if (!(await tool("sh"))) return;
  const sha = await fetchMain();
  if (!sha) return;
  const ahead = sha !== shared(RECORD)?.sha;
  const mods = ahead ? (await git(["-C", clone(), "ls-tree", "--name-only", "HEAD", "mods/"]))?.split("\n").map((m) => m.slice(5)) : null;
  const next = ahead && mods ? { sha, mods } : null;
  if (JSON.stringify(next) !== JSON.stringify(shared(AVAILABLE) ?? null)) setShared(AVAILABLE, next);
}

// The clone keeps the repo's bytes: Git for Windows turns LF into CRLF by default, which made
// every file differ from the installed one. A clone made that way is made again.
async function fetchMain() {
  const dir = clone();
  const lf = (await git(["-C", dir, "config", "--get", "core.autocrlf"])) === "false";
  if (lf && (await git(["-C", dir, "rev-parse", "--git-dir"]))) {
    if ((await git(["-C", dir, "fetch", "-q", "--depth", "1", REPO, "main"])) === null) return null;
    if ((await git(["-C", dir, "reset", "-q", "--hard", "FETCH_HEAD"])) === null) return null;
  } else {
    await exec(await tool("rm"), ["-rf", dir]).catch(() => null);
    if ((await git(["clone", "-q", "-c", "core.autocrlf=false", "--depth", "1", "--branch", "main", REPO, dir])) === null) return null;
  }
  return git(["-C", dir, "rev-parse", "HEAD"]);
}

const parse = (text) => {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

// New keys are added; a key the person already has stays theirs.
async function mergeKeys(dir) {
  const ours = parse(await readTextFile(`${dir}/keys.json`));
  const file = `${appHome()}/keys.json`;
  const raw = await readTextFile(file);
  const theirs = raw ? parse(raw) : {};
  if (!ours || !theirs) return;
  let added = false;
  for (const [section, keys] of Object.entries(ours)) {
    theirs[section] ??= {};
    for (const [key, action] of Object.entries(keys)) {
      if (key in theirs[section]) continue;
      theirs[section][key] = action;
      added = true;
    }
  }
  if (added) await writeTextFile(file, JSON.stringify(theirs, null, 2) + "\n", raw);
}

// The layout file also holds the person's wallpaper, theme pair, title bar and fonts, so it is
// only replaced when main changed it, and those stay. Without a record of the last update it stays as it is.
async function updateLayout(dir, blob) {
  const last = shared(RECORD)?.layout;
  if (!last || last === blob) return;
  const file = `${appHome()}/layouts/omarchy.json`;
  const raw = await readTextFile(file);
  const next = parse(await readTextFile(`${dir}/layouts/omarchy.json`));
  if (!next) return;
  const mine = parse(raw);
  if (mine?.background?.image) next.background = { ...next.background, image: mine.background.image };
  if (mine?.theme) next.theme = mine.theme;
  if (mine?.titlebar) next.titlebar = mine.titlebar;
  // Fonts too: one the person removed lets Prefs (settings.json) choose, and a layout's font beats them.
  for (const k of ["font", "ui_font"]) {
    if (!mine) break;
    if (k in mine) next[k] = mine[k];
    else delete next[k];
  }
  await writeTextFile(file, JSON.stringify(next, null, 2) + "\n", raw);
}

// Copies only files that differ, so unchanged mods don't reload.
async function copyFiles(dir, paths) {
  const script = `
    PATH="/usr/bin:$PATH"
    cd "$1" || exit 1
    to=$2
    shift 2
    find "$@" -type f | while IFS= read -r f; do
      if ! cmp -s "$f" "$to/$f"; then
        mkdir -p "$to/$(dirname "$f")" && cp -- "$f" "$to/$f" || exit 1
      fi
    done
  `;
  // exec stops waiting after 30 s by default; on Windows comparing every file takes about that long.
  const r = await exec(await tool("sh"), ["-c", script, "sh", dir, appHome(), ...paths], { timeout: 600000 }).catch(() => null);
  return r?.code === 0;
}

// Where each mod sits is the person's choice ("none" keeps one out of a layout): it survives updates.
async function places(mods) {
  const out = new Map();
  for (const m of mods) {
    const place = parse(await readTextFile(`${appHome()}/${m}/mod.json`))?.place;
    if (place !== undefined) out.set(m, place);
  }
  return out;
}
async function keepPlaces(saved) {
  for (const [m, place] of saved) {
    const file = `${appHome()}/${m}/mod.json`;
    const raw = await readTextFile(file);
    const next = parse(raw);
    if (!next || next.place === place) continue;
    next.place = place;
    await writeTextFile(file, JSON.stringify(next, null, 2) + "\n", raw);
  }
}

export const applyUpdate = () => inTurn(apply);

async function apply() {
  if (!(await tool("sh"))) {
    notify({ title: "herdr-omarchy update failed", body: "Windows needs Git for Windows to update.", level: "error" });
    return;
  }
  const sha = await fetchMain();
  const blob = sha && (await git(["-C", clone(), "rev-parse", "HEAD:layouts/omarchy.json"]));
  if (!blob) {
    notify({ title: "herdr-omarchy update failed", body: "Could not fetch main.", level: "error" });
    return;
  }
  await mergeKeys(clone());
  await updateLayout(clone(), blob);
  const failed = () => notify({ title: "herdr-omarchy update failed", body: "Could not copy the files.", level: "error" });
  const others = (await git(["-C", clone(), "ls-tree", "--name-only", "HEAD", "mods/"]))?.split("\n").filter((m) => m !== "mods/omarchy-bar") ?? [];
  const saved = await places(others);
  if (!others.length || !(await copyFiles(clone(), [...others, "themes", "backgrounds/omarchy", "layouts/omarchy.svg"]))) return failed();
  await keepPlaces(saved);
  // Herdr reloads the bar once its own files change, which may end this function: record first.
  const before = shared(RECORD);
  setShared(RECORD, { sha, layout: blob });
  setShared(AVAILABLE, null);
  notify({ title: "herdr-omarchy updated", body: `Now at ${short(sha)}.`, level: "success" });
  if (!(await copyFiles(clone(), ["mods/omarchy-bar"]))) {
    setShared(RECORD, before);
    failed();
  }
}
