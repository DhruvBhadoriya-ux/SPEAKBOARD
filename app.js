(() => {
  const TASKS_KEY = 'speakboard.tasks.v1';
  const NOTES_KEY = 'speakboard.notes.v2';
  const LEGACY_NOTES_KEY = 'speakboard.notes.v1';
  const FOCUS_SESSIONS_KEY = 'speakboard.focusSessions.v1';
  const VOICE_ACTIVITY_KEY = 'speakboard.voiceActivity.v1';
  const starterTasks = [
    { id: 'starter-1', title: 'Shape the outline for this week', category: 'Planning', done: false, createdAt: null },
    { id: 'starter-2', title: 'Send a quick update to the team', category: 'Communication', done: false, createdAt: null },
    { id: 'starter-3', title: 'Review the notes from yesterday', category: 'Review', done: true, createdAt: null },
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function readStorage(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : JSON.parse(saved);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function createId(kind) {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  let tasks = readStorage(TASKS_KEY, null);
  if (!Array.isArray(tasks)) tasks = starterTasks.map((task) => ({ ...task }));
  let notes = readStorage(NOTES_KEY, null);
  if (!Array.isArray(notes)) {
    const legacyNote = readStorage(LEGACY_NOTES_KEY, '');
    notes = typeof legacyNote === 'string' && legacyNote.trim()
      ? [{ id: createId('note'), content: legacyNote.trim(), createdAt: Date.now() }]
      : [];
  }
  const savedVoiceActivity = readStorage(VOICE_ACTIVITY_KEY, []);
  let voiceActivity = Array.isArray(savedVoiceActivity)
    ? savedVoiceActivity.filter((entry) => entry
      && typeof entry.transcript === 'string'
      && typeof entry.action === 'string'
      && Number.isFinite(Date.parse(entry.timestamp))).slice(0, 10)
    : [];
  let activeFilter = 'all';

  const taskForm = $('#task-form');
  const taskInput = $('#task-input');
  const taskList = $('#task-list');
  const emptyState = $('#empty-state');
  const emptyTitle = $('#empty-title');
  const emptyCopy = $('#empty-copy');
  const noteForm = $('#note-form');
  const noteInput = $('#note-input');
  const notesList = $('#notes-list');
  const notesEmpty = $('#notes-empty');
  const notesSaveStatus = $('#notes-save-status');
  const voiceActivityList = $('#voice-activity-list');
  const voiceActivityEmpty = $('#voice-activity-empty');
  const voiceActivityCount = $('#voice-activity-count');

  const iconMarkup = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4L19 7"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9 7V4.5h6V7m2.5 0-.8 12h-9.4L6.5 7m3 3.5v5m5-5v5"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 10 6-10 6V6Z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.5h2.5v11H8zM13.5 6.5H16v11h-2.5z" fill="currentColor" stroke="none"/></svg>',
  };

  function persistTasks() {
    writeStorage(TASKS_KEY, tasks);
  }

  function persistNotes() {
    return writeStorage(NOTES_KEY, notes);
  }

  function makeTaskNode(task) {
    const item = document.createElement('li');
    item.className = `task-row${task.done ? ' is-complete' : ''}`;
    item.dataset.id = task.id;

    const toggle = document.createElement('button');
    toggle.className = 'task-toggle';
    toggle.type = 'button';
    toggle.dataset.action = 'toggle';
    toggle.setAttribute('aria-pressed', String(Boolean(task.done)));
    toggle.setAttribute('aria-label', task.done
      ? `Mark “${task.title}” as incomplete`
      : `Mark “${task.title}” complete`);
    if (task.done) toggle.innerHTML = iconMarkup.check;

    const copy = document.createElement('span');
    copy.className = 'task-copy';
    const title = document.createElement('span');
    title.className = 'task-title';
    title.textContent = task.title;
    const meta = document.createElement('span');
    meta.className = 'task-meta';
    meta.textContent = task.createdAt
      ? `Added at ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(task.createdAt))}`
      : 'Today';
    copy.append(title, meta);

    const category = document.createElement('span');
    category.className = 'task-label';
    category.textContent = task.done ? 'Complete' : task.category || 'Personal';

    const remove = document.createElement('button');
    remove.className = 'delete-task';
    remove.type = 'button';
    remove.dataset.action = 'delete';
    remove.setAttribute('aria-label', `Remove “${task.title}”`);
    remove.innerHTML = iconMarkup.trash;

    item.append(toggle, copy, category, remove);
    return item;
  }

  function renderTasks() {
    const visibleTasks = tasks.filter((task) => {
      if (activeFilter === 'pending') return !task.done;
      if (activeFilter === 'completed') return task.done;
      return true;
    });

    taskList.replaceChildren(...visibleTasks.map(makeTaskNode));
    emptyState.hidden = visibleTasks.length > 0;
    if (visibleTasks.length === 0) {
      if (tasks.length === 0) {
        emptyTitle.textContent = 'A fresh page';
        emptyCopy.textContent = 'Add a task above and take it one step at a time.';
      } else {
        emptyTitle.textContent = activeFilter === 'pending' ? 'All caught up' : 'Nothing here yet';
        emptyCopy.textContent = activeFilter === 'pending'
          ? 'You’ve completed everything on your list.'
          : 'Complete a task and it will show up here.';
      }
    }

    const complete = tasks.filter((task) => task.done).length;
    const pending = tasks.length - complete;
    const percentage = tasks.length ? Math.round((complete / tasks.length) * 100) : 0;
    $('#total-count').textContent = tasks.length;
    $('#complete-count').textContent = complete;
    $('#pending-count').textContent = pending;
    $('#productivity-count').textContent = percentage;
    $('#productivity-progress').style.width = `${percentage}%`;
    $('#task-heading-count').textContent = tasks.length;
    $('#remaining-label').textContent = `${pending} ${pending === 1 ? 'task' : 'tasks'} left`;
    persistTasks();
  }

  function addTask(value) {
    const title = value.trim();
    if (!title) return false;
    tasks.unshift({
      id: createId('task'),
      title,
      category: 'Personal',
      done: false,
      createdAt: Date.now(),
    });
    setTaskFilter('all');
    taskInput.value = '';
    taskInput.focus();
    return true;
  }

  function deleteTask(taskId) {
    const nextTasks = tasks.filter((task) => task.id !== taskId);
    if (nextTasks.length === tasks.length) return false;
    tasks = nextTasks;
    renderTasks();
    return true;
  }

  function completeTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return false;
    if (task.done) return true;
    task.done = true;
    renderTasks();
    return true;
  }

  function toggleTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return false;
    task.done = !task.done;
    renderTasks();
    return true;
  }

  function setTaskFilter(filter) {
    activeFilter = filter;
    $$('.filter-button').forEach((button) => {
      const selected = button.dataset.filter === activeFilter;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    renderTasks();
  }

  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addTask(taskInput.value);
  });

  taskList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('.task-row');
    const taskId = row?.dataset.id;
    if (button.dataset.action === 'toggle') toggleTask(taskId);
    if (button.dataset.action === 'delete') deleteTask(taskId);
  });

  $$('.filter-button').forEach((button) => {
    button.addEventListener('click', () => setTaskFilter(button.dataset.filter));
  });

  // Each note is a separate local entry, so it can be rendered or removed on its own.
  function makeNoteNode(note) {
    const item = document.createElement('li');
    item.className = 'note-card';
    item.dataset.id = note.id;

    const content = document.createElement('p');
    content.className = 'note-content';
    content.textContent = note.content;

    const footer = document.createElement('div');
    footer.className = 'note-card-footer';
    const timestamp = document.createElement('time');
    const createdAt = new Date(note.createdAt || Date.now());
    timestamp.dateTime = createdAt.toISOString();
    timestamp.textContent = new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(createdAt);

    const remove = document.createElement('button');
    remove.className = 'delete-note';
    remove.type = 'button';
    remove.dataset.action = 'delete-note';
    remove.setAttribute('aria-label', 'Delete note');
    remove.innerHTML = iconMarkup.trash;

    footer.append(timestamp, remove);
    item.append(content, footer);
    return item;
  }

  function renderNotes() {
    notesList.replaceChildren(...notes.map(makeNoteNode));
    notesEmpty.hidden = notes.length > 0;
    $('#notes-count').textContent = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;
    notesSaveStatus.textContent = persistNotes()
      ? 'Notes saved on this device'
      : 'Could not save on this device';
  }

  function addNote(value) {
    const content = value.trim();
    if (!content) return false;
    notes.unshift({ id: createId('note'), content, createdAt: Date.now() });
    renderNotes();
    noteInput.value = '';
    noteInput.focus();
    return true;
  }

  function deleteNote(noteId) {
    const nextNotes = notes.filter((note) => note.id !== noteId);
    if (nextNotes.length === notes.length) return false;
    notes = nextNotes;
    renderNotes();
    return true;
  }

  noteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addNote(noteInput.value);
  });

  notesList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="delete-note"]');
    if (!button) return;
    deleteNote(button.closest('.note-card')?.dataset.id);
  });

  function normalizeSpeechPhrase(transcript) {
    return String(transcript || '')
      .toLowerCase()
      .replace(/[“”‘’"`]/g, '')
      .replace(/[.,!?;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseVoiceCommand(transcript) {
    const phrase = normalizeSpeechPhrase(transcript);
    if (!phrase) return { type: 'empty' };

    if (/^(show|list|display|read|what|tell me|find)\b/.test(phrase)
      && /\b(pending|unfinished|incomplete)\b/.test(phrase)
      && /\b(tasks?|to dos?)\b/.test(phrase)) {
      return { type: 'show-pending' };
    }

    if (/^(please )?(start|begin|resume) (?:(?:the|a|my) )?(?:focus(?: (?:timer|session))?|timer|session)$/.test(phrase)) {
      return { type: 'start-focus' };
    }
    if (/^(please )?(pause) (?:(?:the|my) )?(?:focus(?: (?:timer|session))?|timer|session)$/.test(phrase)) {
      return { type: 'pause-focus' };
    }
    if (/^(please )?(stop|end) (?:(?:the|my) )?(?:focus(?: (?:timer|session))?|timer|session)$/.test(phrase)) {
      return { type: 'stop-focus' };
    }
    if (/^(please )?reset (?:(?:the|my) )?(?:focus(?: (?:timer|session))?|timer|session)$/.test(phrase)) {
      return { type: 'reset-focus' };
    }

    const noteMatch = phrase.match(/^(?:please )?(?:add|create|save|write|jot down) (?:(?:a|the|my) )?note(?: (?:that|saying))?\s*(.*)$/);
    if (noteMatch) return noteMatch[1] ? { type: 'add-note', content: noteMatch[1] } : { type: 'missing-content', item: 'note' };

    const addTaskMatch = phrase.match(/^(?:please )?(?:add|create|make|new) (?:a )?task\s*(.*)$/);
    if (addTaskMatch) return addTaskMatch[1] ? { type: 'add-task', title: addTaskMatch[1] } : { type: 'missing-content', item: 'task' };

    if (/^(?:please )?(?:delete|remove|cancel) (?:the )?task$/.test(phrase)) {
      return { type: 'missing-content', item: 'task name to delete' };
    }
    const deleteMatch = phrase.match(/^(?:please )?(?:delete|remove|cancel) (?:(?:the|my) )?task(?: (?:called|named|titled))?\s+(.+)$/);
    if (deleteMatch) return { type: 'delete-task', query: deleteMatch[1] };

    if (/^(?:please )?(?:complete|finish) (?:the )?task$/.test(phrase)) {
      return { type: 'missing-content', item: 'task name to complete' };
    }
    const markMatch = phrase.match(/^(?:please )?(?:mark|set) (?:(?:the|my) )?(?:task )?(.+?) (?:as )?(?:complete|completed|done)$/);
    if (markMatch) return { type: 'complete-task', query: markMatch[1] };
    const completeMatch = phrase.match(/^(?:please )?(?:complete|finish|done) (?:(?:the|my) )?(?:task )?(.+)$/);
    if (completeMatch) return { type: 'complete-task', query: completeMatch[1] };

    // Keep voice capture useful when the speaker says a task without a command prefix.
    return { type: 'add-task', title: String(transcript || '').trim(), implicit: true };
  }

  function findTaskByVoiceTitle(query) {
    const target = normalizeSpeechPhrase(query).replace(/^(?:the|my) /, '');
    if (!target) return { status: 'missing' };

    const candidates = tasks.filter((task) => {
      const title = normalizeSpeechPhrase(task.title);
      return title === target || title.includes(target) || target.includes(title);
    });
    const exact = candidates.filter((task) => normalizeSpeechPhrase(task.title) === target);
    if (exact.length === 1) return { status: 'found', task: exact[0] };
    if (exact.length > 1 || candidates.length > 1) return { status: 'ambiguous' };
    if (candidates.length === 1) return { status: 'found', task: candidates[0] };
    return { status: 'not-found' };
  }

  function handleVoiceCommand(transcript) {
    const command = parseVoiceCommand(transcript);
    let response;

    switch (command.type) {
      case 'add-task':
        addTask(command.title);
        response = command.implicit ? 'added as a task.' : 'task added.';
        break;
      case 'complete-task': {
        const match = findTaskByVoiceTitle(command.query);
        if (match.status === 'found') {
          response = match.task.done ? 'that task is already complete.' : 'task completed.';
          if (!match.task.done) completeTask(match.task.id);
        } else if (match.status === 'ambiguous') response = 'more than one task matches. Say a more specific title.';
        else response = 'I couldn’t find that task.';
        break;
      }
      case 'delete-task': {
        const match = findTaskByVoiceTitle(command.query);
        if (match.status === 'found') {
          deleteTask(match.task.id);
          response = 'task deleted.';
        } else if (match.status === 'ambiguous') response = 'more than one task matches. Say a more specific title.';
        else response = 'I couldn’t find that task.';
        break;
      }
      case 'add-note':
        addNote(command.content);
        response = 'note saved.';
        break;
      case 'show-pending': {
        setTaskFilter('pending');
        const pendingCount = tasks.filter((task) => !task.done).length;
        $('#task-list').scrollIntoView({ behavior: 'smooth', block: 'center' });
        response = `showing ${pendingCount} pending ${pendingCount === 1 ? 'task' : 'tasks'}.`;
        break;
      }
      case 'start-focus':
        response = startFocusTimer() ? 'focus timer started.' : 'focus timer is already running.';
        break;
      case 'pause-focus':
        response = stopFocusTimer() ? 'focus session paused.' : 'focus session is already paused.';
        break;
      case 'stop-focus':
        response = stopFocusTimer() ? 'focus timer stopped.' : 'focus timer is already stopped.';
        break;
      case 'reset-focus':
        resetFocusSession();
        response = 'focus session reset to 25 minutes.';
        break;
      case 'missing-content':
        response = `say the ${command.item} after the command.`;
        break;
      default:
        response = 'I didn’t catch that. Try a task or timer command.';
    }

    recordVoiceActivity(String(transcript).trim(), response);
    voiceStatus.textContent = `Transcript: “${String(transcript).trim()}” · ${response}`;
  }

  function makeVoiceActivityNode(entry) {
    const item = document.createElement('li');
    item.className = 'voice-activity-item';

    const content = document.createElement('div');
    content.className = 'voice-activity-copy';
    const command = document.createElement('span');
    command.className = 'activity-command';
    command.textContent = `“${entry.transcript}”`;
    const action = document.createElement('span');
    action.className = 'activity-action';
    action.textContent = entry.action;
    content.append(command, action);

    const timestamp = document.createElement('time');
    timestamp.className = 'activity-timestamp';
    const date = new Date(entry.timestamp);
    timestamp.dateTime = date.toISOString();
    timestamp.textContent = new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(date);

    item.append(content, timestamp);
    return item;
  }

  function renderVoiceActivity() {
    voiceActivityList.replaceChildren(...voiceActivity.map(makeVoiceActivityNode));
    voiceActivityEmpty.hidden = voiceActivity.length > 0;
    voiceActivityCount.textContent = `${voiceActivity.length} / 10`;
    writeStorage(VOICE_ACTIVITY_KEY, voiceActivity);
  }

  function recordVoiceActivity(transcript, action) {
    if (!transcript) return;
    voiceActivity.unshift({
      id: createId('voice'),
      transcript,
      action,
      timestamp: new Date().toISOString(),
    });
    voiceActivity = voiceActivity.slice(0, 10);
    renderVoiceActivity();
  }

  const micButton = $('#mic-button');
  const voiceStatus = $('#voice-status');
  let recognition = null;
  let listening = false;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = document.documentElement.lang || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.addEventListener('start', () => {
      listening = true;
      micButton.classList.add('is-listening');
      micButton.setAttribute('aria-label', 'Stop voice capture');
      voiceStatus.textContent = 'Listening… speak your task.';
    });
    recognition.addEventListener('result', (event) => {
      const transcript = [...event.results]
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (transcript) {
        handleVoiceCommand(transcript);
      }
    });
    recognition.addEventListener('error', (event) => {
      listening = false;
      micButton.classList.remove('is-listening');
      micButton.setAttribute('aria-label', 'Speak to add a task');
      const messages = {
        'not-allowed': 'Microphone access is blocked. Allow it in browser settings to use voice capture.',
        'service-not-allowed': 'Speech recognition is disabled by the browser or device.',
        'no-speech': 'No speech heard. Tap the microphone to try again.',
        'audio-capture': 'No microphone was found. Connect one or type your task below.',
        network: 'Speech recognition needs a network connection. Try again or type below.',
        aborted: 'Voice capture stopped. Tap the microphone when you’re ready.',
      };
      voiceStatus.textContent = messages[event.error] || 'Voice capture didn’t work. Try again or type below.';
    });
    recognition.addEventListener('nomatch', () => {
      voiceStatus.textContent = 'I couldn’t make out those words. Try again or type your task below.';
    });
    recognition.addEventListener('end', () => {
      listening = false;
      micButton.classList.remove('is-listening');
      micButton.setAttribute('aria-label', 'Speak to add a task');
      if (voiceStatus.textContent.startsWith('Listening')) {
        voiceStatus.textContent = 'Say it. We’ll make it a task.';
      }
    });
  } else {
    voiceStatus.textContent = 'Voice capture isn’t supported in this browser. Type your task below.';
  }

  micButton.addEventListener('click', () => {
    if (!recognition) {
      voiceStatus.textContent = 'Voice capture isn’t supported in this browser. Type your task below.';
      taskInput.focus();
      return;
    }
    try {
      if (listening) recognition.stop();
      else recognition.start();
    } catch {
      voiceStatus.textContent = 'Voice capture is already starting. Try again in a moment.';
    }
  });

  const timerDisplay = $('#timer-display');
  const timerModeLabel = $('#timer-mode-label');
  const timerHint = $('#timer-hint');
  const timerStartButton = $('#timer-start');
  const timerPauseButton = $('#timer-pause');
  const timerProgress = $('#timer-ring-progress');
  const timerNotification = $('#timer-notification');
  const focusSessionCountLabel = $('#focus-session-count');
  const timerModes = $$('.timer-mode');
  const timerRadius = 51;
  const timerCircumference = 2 * Math.PI * timerRadius;
  let timerMode = 'focus';
  let timerDuration = 25 * 60;
  let timeLeft = timerDuration;
  let timerInterval = null;
  let timerEndsAt = null;
  let completedFocusSessions = readStorage(FOCUS_SESSIONS_KEY, 0);
  if (!Number.isSafeInteger(completedFocusSessions) || completedFocusSessions < 0) completedFocusSessions = 0;

  timerProgress.style.strokeDasharray = String(timerCircumference);
  focusSessionCountLabel.textContent = String(completedFocusSessions);

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }

  function paintTimer() {
    timerDisplay.textContent = formatTime(timeLeft);
    const progress = timerDuration ? timeLeft / timerDuration : 0;
    timerProgress.style.strokeDashoffset = String(timerCircumference * (1 - progress));
    timerModeLabel.textContent = timerMode === 'focus' ? 'FOCUS TIME' : 'SHORT BREAK';
    timerHint.textContent = timerInterval
      ? 'Stay with this moment.'
      : timerMode === 'focus' ? 'You’ve got this.' : 'Take a breath.';
  }

  function setTimerButton(running) {
    timerStartButton.disabled = running;
    timerPauseButton.disabled = !running;
    const canResume = timeLeft < timerDuration;
    timerStartButton.innerHTML = `${iconMarkup.play}<span>${canResume ? 'Resume' : timerMode === 'focus' ? 'Start' : 'Start break'}</span>`;
  }

  function clearTimerNotification() {
    timerNotification.hidden = true;
    timerNotification.textContent = '';
  }

  function selectTimerMode(mode, minutes) {
    window.clearInterval(timerInterval);
    timerInterval = null;
    timerEndsAt = null;
    timerMode = mode;
    timerDuration = minutes * 60;
    timeLeft = timerDuration;
    clearTimerNotification();
    timerModes.forEach((button) => {
      const selected = button.dataset.mode === mode;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    setTimerButton(false);
    paintTimer();
  }

  function startTimer() {
    if (timerInterval) return false;
    if (timeLeft <= 0) timeLeft = timerDuration;
    clearTimerNotification();
    timerEndsAt = Date.now() + timeLeft * 1000;
    timerInterval = window.setInterval(tickTimer, 250);
    setTimerButton(true);
    paintTimer();
    return true;
  }

  function stopFocusTimer() {
    if (!timerInterval) return false;
    if (timerEndsAt) timeLeft = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    if (timeLeft <= 0) {
      finishTimer();
      return true;
    }
    window.clearInterval(timerInterval);
    timerInterval = null;
    timerEndsAt = null;
    setTimerButton(false);
    paintTimer();
    return true;
  }

  function startFocusTimer() {
    if (timerMode !== 'focus') selectTimerMode('focus', 25);
    return startTimer();
  }

  function resetTimer() {
    window.clearInterval(timerInterval);
    timerInterval = null;
    timerEndsAt = null;
    timeLeft = timerDuration;
    clearTimerNotification();
    setTimerButton(false);
    paintTimer();
  }

  function resetFocusSession() {
    selectTimerMode('focus', 25);
    resetTimer();
  }

  function finishTimer() {
    window.clearInterval(timerInterval);
    timerInterval = null;
    timerEndsAt = null;
    const finishedMode = timerMode;
    if (finishedMode === 'focus') {
      completedFocusSessions += 1;
      writeStorage(FOCUS_SESSIONS_KEY, completedFocusSessions);
      focusSessionCountLabel.textContent = String(completedFocusSessions);
      timerNotification.textContent = `Focus session complete! You’ve completed ${completedFocusSessions} ${completedFocusSessions === 1 ? 'session' : 'sessions'}. Enjoy your break.`;
    } else {
      timerNotification.textContent = 'Break complete. Ready for another focus session?';
    }
    timerNotification.hidden = false;
    timerMode = finishedMode === 'focus' ? 'break' : 'focus';
    timerDuration = (timerMode === 'focus' ? 25 : 5) * 60;
    timeLeft = timerDuration;
    timerHint.textContent = finishedMode === 'focus' ? 'Lovely work. Take a breather.' : 'Break’s over. Ready when you are.';
    timerModeLabel.textContent = finishedMode === 'focus' ? 'FOCUS COMPLETE' : 'BREAK COMPLETE';
    timerModes.forEach((button) => {
      const selected = button.dataset.mode === timerMode;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    setTimerButton(false);
    timerDisplay.textContent = formatTime(timeLeft);
    timerProgress.style.strokeDashoffset = '0';
  }

  function tickTimer() {
    if (!timerEndsAt) return;
    timeLeft = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    paintTimer();
    if (timeLeft <= 0) finishTimer();
  }

  timerStartButton.addEventListener('click', startTimer);
  timerPauseButton.addEventListener('click', stopFocusTimer);
  $('#timer-reset').addEventListener('click', resetTimer);

  timerModes.forEach((button) => {
    button.addEventListener('click', () => selectTimerMode(button.dataset.mode, Number(button.dataset.minutes)));
  });

  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  $('#today-label').textContent = today.toLocaleUpperCase();

  $$('.primary-nav .nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      $$('.primary-nav .nav-link').forEach((item) => {
        item.classList.toggle('is-active', item === link);
        if (item === link) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
    });
  });

  setTimerButton(false);
  paintTimer();
  renderTasks();
  renderNotes();
  renderVoiceActivity();
})();
