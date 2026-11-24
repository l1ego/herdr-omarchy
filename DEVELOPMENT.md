# Working on Omarchy

Each folder under `mods/` is a self-contained Herdr mod, with its own copy of every icon it draws: nothing refers to Herdr's shipped mods, which are replaced at every start. `main.js` is its entry point. Keep helper imports within that folder so the mod can be installed independently. Herdr runs the UI with `gpui-kit`, `gpui-base`, and `herdr`; Node APIs are available only in tests.

## Where to make changes

| Change | File |
| --- | --- |
| Layout, tile sizes, spacing | `layouts/omarchy.json` |
| Theme colors | `themes/*.json` |
| Theme wallpapers | `backgrounds/omarchy/<theme>/` |
| Wallpaper follows theme, next-wallpaper key | `mods/omarchy-bar/main.js` |
| Theme picker | `mods/omarchy-themes/main.js` |
| Commit graph table, header, Manygit list | `mods/omarchy-changes/graph/graph.js` |
| Git commands, parsing, menus, dialogs | `mods/omarchy-changes/graph/git.js` |
| Settings state, persistence, machine actions | `mods/omarchy-settings/main.js` |
| Layout, theme, appearance, font pickers | `mods/omarchy-settings/look.js` |
| Settings buttons, rows, toggles, steppers | `mods/omarchy-settings/controls.js` |
| Usage endpoints, credentials, agent/provider routing | `mods/omarchy-ai-usage/providers.js` |
| Usage countdowns and quota-window timing | `mods/omarchy-ai-usage/time.js` |
| Usage display, refresh scheduling, cached results | `mods/omarchy-ai-usage/main.js` |
| Mod installation, updates, removal | `mods/omarchy-mod-manager/core.js` |
| Mod Manager text contrast and colors | `mods/omarchy-mod-manager/palette.js` |
| Mod Manager navigation and display | `mods/omarchy-mod-manager/main.js` |
| Changes view: diff, wrap, split, branches, commit | `mods/omarchy-changes/main.js` |
| Reopen closed tab: snapshot and reopen key | `mods/omarchy-tabs/main.js` |
| Reopen: agent resume commands | `mods/omarchy-tabs/reopen.js` |
| Reopen: process scan, exact pane tree restore | `mods/omarchy-tabs/reopen.py` |
| Keybindings list | `mods/omarchy-keys/main.js` |
| Browser button: the terminal-browser command | `mods/omarchy-bar/browser.js` |
| Notifications (layout root `toast`) | `mods/omarchy-toast/main.js` |
| Terminal right-click menu (layout root `terminal_menu`), space and tab menus | `mods/omarchy-menu/main.js` |
| Go-to picker (search button, palette) | `mods/omarchy-picker/main.js` |
| Add a machine dialog | `mods/omarchy-machine-add/main.js` |
| Theme switcher and its previews | `mods/omarchy-themes/main.js`, `mods/omarchy-themes/previews/` |

## Check changes

From the repo root, run `npm test`. Tests use Node's built-in runner with no installation step. Provider tests use fake login files and HTTP responses.

From the repo root, check each changed mod, for example:

```sh
herdr-app check mods/omarchy-settings
herdr-app check mods/omarchy-ai-usage
herdr-app check mods/omarchy-mod-manager
```

`check` loads the entry point, helper imports, and initial UI. It does not exercise later clicks or asynchronous states. When changing UI behavior, also exercise the affected picker, panel, or dialog in Herdr. Repo edits and installed copies under `~/.config/herdr-app` are separate unless explicitly linked.

## Browser

The Browser button in the top bar starts [terminal-browser](https://terminal-browser.com/) in a new tab, through the login shell. The layout does not install it. Install it before you use the button:

```sh
curl -fsSL https://terminal-browser.sh/install | bash
```

Herdr's terminal draws only inline kitty images. It does not draw frames sent as a file or through shared memory (`t=f`, `t=t`, `t=s`).

## Shared Omarchy UI

Edit `ui/components.js` for surfaces, headings, controls, inputs and menu rows. Edit `ui/actions.js` for Omarchy dialog routing and `ui/scroll-rail.js` for the collapsed sidebar scroll component. Then run `npm run sync-ui` once to update every consumer.

Herdr rejects imports outside a mod folder. `scripts/sync-ui.mjs` distributes the shared sources into each consuming mod as generated `ui.js` and `ui-actions.js`. Do not edit those generated copies. `npm test` checks that they match the sources. The distributed files keep each mod independently installable.

`omarchy-dialog` supplies confirmation and text prompts. Its layout-owned controller handles rename shortcuts; dialog actions capture their target before opening. Worktree dialogs use `omarchy-worktree` rather than Herdr's built-in views. The tab strip `+` runs `tab.new` directly.
