export const BROWSER = ["sh", "-c", 'setsid -f "${SHELL:-sh}" -lc "exec ghostty -e terminal-browser https://duckduckgo.com" >/dev/null 2>&1'];
