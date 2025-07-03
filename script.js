// Data structure:
// exercises: [{ id, name, icon }]
// weeklySchedule: { 0: [exerciseId], 1: [exerciseId], ... } (0=Sunday)
// overrides: { 'YYYY-MM-DD': [exerciseId, ...] }

const DEFAULT_EXERCISES = [
  { id: 'run', name: 'Run', icon: '🏃' },
  { id: 'bike', name: 'Bike', icon: '🚴' },
  { id: 'swim', name: 'Swim', icon: '🌊' },
  { id: 'rest', name: 'Rest', icon: '🛌' },
];

const DEFAULT_TINT_COLORS = {
  swim: '#4fc3f7', // blue
  gym: '#a259e6',  // purple
  swimGym: 'linear-gradient(135deg, #4fc3f7 0%, #a259e6 100%)',
};

function loadData() {
  return {
    exercises: JSON.parse(localStorage.getItem('exercises')) || DEFAULT_EXERCISES,
    weeklySchedule: JSON.parse(localStorage.getItem('weeklySchedule')) || {
      0: [], 1: ['run'], 2: ['run'], 3: ['bike'], 4: ['rest'], 5: ['run'], 6: ['run']
    },
    overrides: JSON.parse(localStorage.getItem('overrides')) || {},
    tintColors: JSON.parse(localStorage.getItem('tintColors')) || DEFAULT_TINT_COLORS,
    tintByExerciseId: JSON.parse(localStorage.getItem('tintByExerciseId')) || {},
  };
}

function saveData({ exercises, weeklySchedule, overrides, tintColors, tintByExerciseId }) {
  localStorage.setItem('exercises', JSON.stringify(exercises));
  localStorage.setItem('weeklySchedule', JSON.stringify(weeklySchedule));
  localStorage.setItem('overrides', JSON.stringify(overrides));
  localStorage.setItem('tintColors', JSON.stringify(tintColors));
  localStorage.setItem('tintByExerciseId', JSON.stringify(tintByExerciseId));
}

// UI logic will be added here: settings panel, calendar population, day editing modal, etc.
// This is just the initial structure. UI rendering and event listeners will be implemented next.

// --- Calendar Logic ---
const calendarTitle = document.getElementById('calendarTitle');
const calendarDates = document.getElementById('calendarDates');

let state = {
  ...loadData(),
  current: (() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  })(),
};

// Use a fake 'today' for testing
const now = new Date();

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return { firstDay, lastDay, days: lastDay.getDate() };
}

function getDayKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function renderCalendar() {
  const { year, month } = state.current;
  const { firstDay, days } = getMonthDays(year, month);
  const startDay = firstDay.getDay();
  calendarTitle.textContent = `${firstDay.toLocaleString('default', { month: 'long' })} ${year}`;

  // Navigation (add prev/next buttons)
  if (!document.getElementById('prevMonthBtn')) {
    const prev = document.createElement('button');
    prev.id = 'prevMonthBtn';
    prev.textContent = '‹';
    prev.onclick = () => {
      if (state.current.month === 0) {
        state.current.year--;
        state.current.month = 11;
      } else {
        state.current.month--;
      }
      renderCalendar();
    };
    calendarTitle.parentNode.insertBefore(prev, calendarTitle);
  }
  if (!document.getElementById('nextMonthBtn')) {
    const next = document.createElement('button');
    next.id = 'nextMonthBtn';
    next.textContent = '›';
    next.onclick = () => {
      if (state.current.month === 11) {
        state.current.year++;
        state.current.month = 0;
      } else {
        state.current.month++;
      }
      renderCalendar();
    };
    calendarTitle.parentNode.appendChild(next);
  }

  // Remove old days
  calendarDates.innerHTML = '';

  // Calculate previous and next month info
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonthDays = getMonthDays(prevYear, prevMonth).days;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  // Fill 42 cells (6 rows x 7 days)
  let cells = [];
  // Leading days from previous month
  for (let i = 0; i < startDay; i++) {
    const d = prevMonthDays - startDay + i + 1;
    cells.push({
      day: d,
      year: prevYear,
      month: prevMonth,
      overflow: true
    });
  }
  // Current month days
  for (let d = 1; d <= days; d++) {
    cells.push({
      day: d,
      year,
      month,
      overflow: false
    });
  }
  // Trailing days from next month
  while (cells.length < 42) {
    const d = cells.length - (startDay + days) + 1;
    cells.push({
      day: d,
      year: nextYear,
      month: nextMonth,
      overflow: true
    });
  }

  // Render cells
  for (let i = 0; i < 42; i++) {
    const { day, year: cellYear, month: cellMonth, overflow } = cells[i];
    const cell = document.createElement('div');
    cell.className = 'calendar-cell' + (overflow ? ' calendar-cell--overflow' : '');
    // Highlight today
    let isToday = false;
    if (!overflow && cellYear === now.getFullYear() && cellMonth === now.getMonth() && day === now.getDate()) {
      cell.classList.add('today');
      isToday = true;
    }
    // Add class for past days (not today, not overflow)
    const isPast = !overflow && (
      cellYear < now.getFullYear() ||
      (cellYear === now.getFullYear() && cellMonth < now.getMonth()) ||
      (cellYear === now.getFullYear() && cellMonth === now.getMonth() && day < now.getDate())
    );
    if (isPast) {
      cell.classList.add('calendar-cell--past');
    }
    const dateSpan = document.createElement('span');
    dateSpan.className = 'date';
    dateSpan.textContent = day;
    cell.appendChild(dateSpan);

    // Exercises for this day
    const key = getDayKey(cellYear, cellMonth, day);
    let exercises = state.overrides[key] || state.weeklySchedule[new Date(cellYear, cellMonth, day).getDay()] || [];
    if (exercises.length) {
      const iconsDiv = document.createElement('div');
      iconsDiv.className = 'icons';
      exercises.forEach(eid => {
        const ex = state.exercises.find(e => e.id === eid);
        if (ex) {
          const icon = document.createElement('span');
          icon.className = 'icon ' + ex.id;
          icon.textContent = ex.icon;
          icon.title = 'Remove ' + ex.name;
          icon.style.cursor = 'pointer';
          icon.onclick = (e) => {
            e.stopPropagation();
            // Remove this exercise from this day (override or weekly)
            let arr = (state.overrides[key] || exercises.slice());
            arr = arr.filter(id => id !== eid);
            // If empty, set to rest day if rest exists
            if (arr.length === 0) {
              const restEx = state.exercises.find(e => e.id === 'rest');
              if (restEx) arr = ['rest'];
            }
            if (arr.length) {
              state.overrides[key] = arr;
            } else {
              delete state.overrides[key];
            }
            saveData(state);
            renderCalendar();
            // If day modal is open for this day, update it too
            if (document.getElementById('dayEditModal').classList.contains('active')) {
              renderDayEditContent(key, day, arr);
            }
          };
          iconsDiv.appendChild(icon);
        }
      });
      cell.appendChild(iconsDiv);
    }
    if (!overflow) {
      cell.onclick = () => openDayEditModal(key, day, exercises);
    }
    // Add green tint for active (non-rest) days, but not today or future days
    if (isPast && exercises.length && !(exercises.length === 1 && exercises[0] === 'rest')) {
      cell.classList.add('calendar-cell--active');
    }
    // Add tint for each activity (past only, not today/future/overflow/rest)
    if (isPast && exercises.length) {
      // If only one exercise, use its tint (including rest)
      if (exercises.length === 1 && state.tintByExerciseId[exercises[0]]) {
        cell.style.background = hexToRgba(state.tintByExerciseId[exercises[0]], 0.18);
      } else if (exercises.length > 1) {
        // If all have tints, use a gradient
        const tints = exercises.map(eid => state.tintByExerciseId[eid]).filter(Boolean);
        if (tints.length === exercises.length) {
          cell.style.background = `linear-gradient(135deg, ${tints.map(c => hexToRgba(c, 0.18)).join(', ')})`;
        }
      }
    }
    calendarDates.appendChild(cell);
  }
}

// --- Modal Logic ---
function openSettingsModal() {
  document.getElementById('settingsModal').classList.add('active');
  renderSettingsContent();
}
function openDayEditModal(key, day, exercises) {
  document.getElementById('dayEditModal').classList.add('active');
  renderDayEditContent(key, day, exercises);
}

document.getElementById('settingsBtn').onclick = openSettingsModal;

// --- Initial Render ---
renderCalendar();

function renderSettingsContent() {
  const content = document.getElementById('settingsContent');
  content.innerHTML = '';

  // --- Exercise Management ---
  const exTitle = document.createElement('h3');
  exTitle.textContent = 'Exercises';
  content.appendChild(exTitle);

  const exList = document.createElement('div');
  exList.style.marginBottom = '12px';
  state.exercises.forEach((ex, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '4px';
    // Emoji
    const emoji = document.createElement('input');
    emoji.type = 'text';
    emoji.value = ex.icon;
    emoji.maxLength = 2;
    emoji.style.width = '2em';
    emoji.style.fontSize = '1.2em';
    emoji.oninput = e => { ex.icon = emoji.value; saveData(state); renderCalendar(); };
    row.appendChild(emoji);
    // Name
    const name = document.createElement('input');
    name.type = 'text';
    name.value = ex.name;
    name.style.marginLeft = '8px';
    name.style.flex = '1';
    name.oninput = e => { ex.name = name.value; saveData(state); renderCalendar(); };
    row.appendChild(name);
    // Remove
    if (state.exercises.length > 1) {
      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.style.marginLeft = '8px';
      del.onclick = () => {
        state.exercises.splice(idx, 1);
        // Remove from weekly schedule
        for (let d = 0; d < 7; d++) {
          state.weeklySchedule[d] = (state.weeklySchedule[d] || []).filter(eid => eid !== ex.id);
        }
        saveData(state);
        renderSettingsContent();
        renderCalendar();
      };
      row.appendChild(del);
    }
    exList.appendChild(row);
  });
  content.appendChild(exList);
  // Add new exercise
  const addExBtn = document.createElement('button');
  addExBtn.textContent = '+ Add Exercise';
  addExBtn.onclick = () => {
    const newId = 'ex' + Math.random().toString(36).slice(2, 8);
    state.exercises.push({ id: newId, name: 'New', icon: '❓' });
    saveData(state);
    renderSettingsContent();
  };
  content.appendChild(addExBtn);

  // --- Weekly Schedule ---
  const schedTitle = document.createElement('h3');
  schedTitle.textContent = 'Weekly Schedule';
  schedTitle.style.marginTop = '18px';
  content.appendChild(schedTitle);

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  days.forEach((day, dIdx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '4px';
    const label = document.createElement('span');
    label.textContent = day;
    label.style.width = '90px';
    row.appendChild(label);
    // Multi-select for exercises
    state.exercises.forEach(ex => {
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = (state.weeklySchedule[dIdx] || []).includes(ex.id);
      chk.onchange = () => {
        let arr = state.weeklySchedule[dIdx] || [];
        if (chk.checked) {
          arr.push(ex.id);
        } else {
          arr = arr.filter(eid => eid !== ex.id);
        }
        state.weeklySchedule[dIdx] = arr;
        saveData(state);
        renderCalendar();
      };
      row.appendChild(chk);
      const icon = document.createElement('span');
      icon.textContent = ex.icon;
      icon.style.margin = '0 6px 0 2px';
      row.appendChild(icon);
    });
    content.appendChild(row);
  });

  // --- Tint for Each Activity ---
  const tintEachTitle = document.createElement('h3');
  tintEachTitle.textContent = 'Tint for Each Activity';
  tintEachTitle.style.marginTop = '18px';
  content.appendChild(tintEachTitle);

  state.exercises.forEach(ex => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '8px';
    const lbl = document.createElement('span');
    lbl.textContent = `${ex.icon} ${ex.name}`;
    lbl.style.width = '120px';
    row.appendChild(lbl);
    const input = document.createElement('input');
    input.type = 'color';
    input.value = state.tintByExerciseId[ex.id] || '#ffffff00';
    input.oninput = () => {
      state.tintByExerciseId[ex.id] = input.value;
      saveData(state);
      renderCalendar();
    };
    input.style.width = '40px';
    row.appendChild(input);
    content.appendChild(row);
  });

  // --- Tint Color Settings ---
  const tintTitle = document.createElement('h3');
  tintTitle.textContent = 'Tint Colors';
  tintTitle.style.marginTop = '18px';
  content.appendChild(tintTitle);

  const tintRow = (label, key, type = 'color') => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '8px';
    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.width = '120px';
    row.appendChild(lbl);
    const input = document.createElement('input');
    input.type = type;
    input.value = state.tintColors[key];
    input.oninput = () => {
      state.tintColors[key] = input.value;
      saveData(state);
      renderCalendar();
    };
    if (type === 'color') input.style.width = '40px';
    row.appendChild(input);
    content.appendChild(row);
  };
  tintRow('Swim Only', 'swim');
  tintRow('Gym Only', 'gym');
  // For gradient, use text input for now
  tintRow('Swim + Gym', 'swimGym', 'text');
}

function renderDayEditContent(key, day, exercises) {
  const content = document.getElementById('dayEditContent');
  content.innerHTML = '';
  const { year, month } = state.current;
  const date = new Date(year, month, day);
  const title = document.createElement('h3');
  title.textContent = `Edit ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  content.appendChild(title);

  // List all exercises with checkboxes
  state.exercises.forEach(ex => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.marginBottom = '6px';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = exercises.includes(ex.id);
    chk.onchange = () => {
      let arr = (state.overrides[key] || []).slice();
      if (chk.checked) {
        if (!arr.includes(ex.id)) arr.push(ex.id);
      } else {
        arr = arr.filter(eid => eid !== ex.id);
      }
      // If empty, set to rest day if rest exists
      if (arr.length === 0) {
        const restEx = state.exercises.find(e => e.id === 'rest');
        if (restEx) arr = ['rest'];
      }
      if (arr.length) {
        state.overrides[key] = arr;
      } else {
        delete state.overrides[key];
      }
      saveData(state);
      renderDayEditContent(key, day, arr);
      renderCalendar();
    };
    row.appendChild(chk);
    const icon = document.createElement('span');
    icon.textContent = ex.icon;
    icon.style.margin = '0 6px 0 2px';
    row.appendChild(icon);
    const label = document.createElement('span');
    label.textContent = ex.name;
    row.appendChild(label);
    content.appendChild(row);
  });

  // Reset to weekly schedule
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset to Weekly Schedule';
  resetBtn.style.marginTop = '12px';
  resetBtn.onclick = () => {
    delete state.overrides[key];
    saveData(state);
    renderDayEditContent(key, day, state.weeklySchedule[date.getDay()] || []);
    renderCalendar();
  };
  content.appendChild(resetBtn);
}

// Helper to convert hex to rgba with alpha
function hexToRgba(hex, alpha) {
  if (!hex || hex.length < 4) return hex;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r},${g},${b},${alpha})`;
} 