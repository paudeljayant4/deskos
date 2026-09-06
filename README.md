# DeskOS

A personal web-based operating system where "modes" (Focus / Gaming / Study) aren't just a UI theme — they're a live state that every open app reacts to at once.

Built for Hack Club's **webOS Jam**.

## Features

- **Welcome/Boot Screen** — Animated loading bar with cycling status messages
- **Desktop Shell** — Top bar with live clock, mode switcher, and menu
- **Mode System** — Global `deskState` with pub/sub; switch modes and watch the entire desktop (background, windows, apps) react instantly
- **Draggable Windows** — Title bar dragging, z-index management, close/minimize controls
- **Focus Timer** — Pomodoro-style timer that auto-switches to Focus mode, logs sessions to localStorage
- **Stats Dashboard** — Reads session data from localStorage, updates live via pub/sub when new sessions complete
- **Notes App** — Simple scratchpad for Study mode (auto-saves)
- **Keyboard Shortcuts** — `Ctrl/Cmd+N` new window, `Escape` close focused window
- **Sound Feedback** — Subtle chime on timer completion

## Tech Stack

- Plain HTML/CSS/JS (no framework, no build step)
- CSS Variables for theming
- localStorage for persistence
- Web Audio API for chime

## Getting Started

Just open `index.html` in a browser. No server needed.

```bash
# Option 1: Direct open
open index.html

# Option 2: Serve locally (for AudioContext to work reliably)
npx serve .
# or
python -m http.server 8000
```

## Architecture

```
deskState (singleton)
├── mode: 'focus' | 'gaming' | 'study'
├── listeners: Set<callback>
├── setMode(mode)
├── subscribe(callback) -> unsubscribe
└── notify()

Window Manager
├── createWindow(title, contentBuilder, position)
├── bringToFront(windowEl)
├── closeWindow(windowEl)
└── openWindows: Map<id, windowEl>

Apps (contentBuilder functions)
├── createTimerApp(contentEl, windowEl)
├── createStatsApp(contentEl, windowEl)
└── createNotesApp(contentEl, windowEl)
```

## Mode Colors

| Mode | Accent | Background |
|------|--------|------------|
| Focus | `#58a6ff` (Blue) | Dark slate |
| Gaming | `#ff6b9d` (Pink) | Deep magenta |
| Study | `#3fb950` (Green) | Dark teal |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | Create new window |
| `Escape` | Close focused window |
| Click window | Bring to front |
| Drag titlebar | Move window |

## Data Storage

- **Sessions**: `localStorage['deskos-sessions']` — Array of `{ startTime, duration, mode }`
- **Notes**: `localStorage['deskos-notes']` — Plain text

## Submission Checklist

- [x] Welcome/boot screen with progress bar
- [x] Desktop with top bar, live clock
- [x] Draggable, closable windows with z-index
- [x] Global mode system (pub/sub) — desktop + all windows react
- [x] Focus Timer app (auto-sets Focus mode, logs sessions)
- [x] Stats app (reads sessions, live updates)
- [x] CSS variable theming per mode
- [x] No external dependencies
- [x] Works offline

## License

MIT — Built for Hack Club's webOS Jam 2026