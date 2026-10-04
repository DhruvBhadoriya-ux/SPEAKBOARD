# Speakboard

Speakboard is a calm, voice-friendly productivity dashboard for managing daily tasks, quick notes, and focused work sessions.

## Features

- Add, complete, filter, and delete tasks.
- Track total, completed, and pending tasks plus a completion percentage.
- Save and remove quick notes.
- Use a 25-minute focus timer with pause and reset controls, plus a 5-minute break mode.
- Capture voice commands for tasks, notes, pending tasks, and focus sessions.
- Review the latest 10 voice commands with timestamps and action results.
- Save tasks, notes, completed focus sessions, and voice activity in browser local storage.
- Use the responsive dark interface on desktop or mobile.

## Run locally

Speakboard is a static HTML, CSS, and JavaScript app. It has no build step or package dependencies.

From the project folder, start a local server:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. Press **Control+C** in the terminal to stop the server.

## Voice controls

Select the microphone button and allow microphone access when prompted. Speech recognition uses the browser's Web Speech API, so voice capture depends on browser support and permission. When voice capture is unavailable, tasks can still be entered using the task field.

Commands include:

- “Add task …”
- “Complete task …”
- “Delete task …”
- “Add note …”
- “Show pending tasks”
- “Start focus session”
- “Pause focus session”
- “Reset focus session”

## Files

```text
speakboard/
├── index.html
├── style.css
├── app.js
└── readme.md
```

## Credits

Created with assistance from **Wispr Flow**.
