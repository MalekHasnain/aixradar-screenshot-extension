# Quick Screenshot & Annotate

A Chrome extension for capturing and annotating screenshots — built with Manifest V3, vanilla JavaScript, no frameworks.

## Features

- **Capture Full Page** — Take a screenshot of the visible tab with one click
- **Capture Selected Area** — Drag to select a specific region of the page
- **Annotation Tools** — Add arrows, rectangles, and text to your screenshots
- **Color Picker** — Choose any color for your annotations
- **Adjustable Line Width** — 2px, 3px, 5px, or 8px stroke width
- **Undo Support** — Undo annotations (Ctrl+Z)
- **Download as PNG** — Save your annotated screenshot
- **Recent History** — Last 12 screenshots accessible from the popup
- **Settings** — Default format (PNG/JPEG) and quality slider
- **Keyboard Shortcuts** — A=Arrow, R=Rectangle, T=Text, Ctrl+Z=Undo, Ctrl+S=Download

## Installation

### From Chrome Web Store (when published)
1. Visit the Chrome Web Store listing
2. Click "Add to Chrome"

### Developer Mode (unpacked)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the extension folder
6. The extension icon will appear in your toolbar

## Usage

1. Click the extension icon in the toolbar
2. Choose **Capture Full Page** or **Capture Selected Area**
3. If capturing an area, click and drag on the page to select the region
4. The annotation editor opens in a new tab
5. Use the toolbar to add arrows, rectangles, or text
6. Click **Download** to save as PNG

### Keyboard Shortcuts (in Editor)

| Key | Action |
|-----|--------|
| `A` | Arrow tool |
| `R` | Rectangle tool |
| `T` | Text tool |
| `Ctrl+Z` | Undo |
| `Ctrl+S` | Download |

## File Structure

```
quick-screenshot-annotate/
├── manifest.json       # Extension manifest (MV3)
├── popup.html          # Popup UI
├── popup.css           # Popup styles (dark theme)
├── popup.js            # Popup logic
├── background.js       # Service worker
├── content.js          # Selection overlay script
├── editor.html         # Annotation editor page
├── editor.js           # Canvas drawing logic
├── editor.css          # Editor styles
├── README.md           # This file
├── PRIVACY.md          # Privacy policy
└── LICENSE             # MIT license
```

## Permissions

- **activeTab** — Access the current tab for screenshots
- **storage** — Save settings and recent screenshots locally
- **scripting** — Inject the selection overlay for area capture

No host permissions (`<all_urls>`) are required. Screenshots are processed entirely in the browser and never uploaded.

## Privacy

See [PRIVACY.md](PRIVACY.md) for the full privacy policy. In short: **zero data collection. Everything stays on your device.**

## License

MIT — See [LICENSE](LICENSE) for details.
