// UPPDATERAD DATA: Nu med dina lokala MP4-filer
let exercises = JSON.parse(localStorage.getItem('lift_exercises')) || [
    { 
        id: 1, 
        name: 'Knäböj', 
        category: 'Ben', 
        sets: 3, 
        reps: '8-12', 
        animation: 'Gemini_Generated_Image_sqtn3ksqtn3ksqtn.mp4' 
    },
    { 
        id: 2, 
        name: 'Bänkpress', 
        category: 'Bröst', 
        sets: 3, 
        reps: '8-12',
        animation: 'Skärmbild 2026-05-11 124104.mp4' 
    },
    { id: 3, name: 'Marklyft', category: 'Rygg', sets: 3, reps: '5' }
];

let programs = JSON.parse(localStorage.getItem('lift_programs')) || [
    { id: 'a', name: 'Pass A', exercises: [1, 2] },
    { id: 'b', name: 'Pass B', exercises: [3] }
];

let workoutLogs = JSON.parse(localStorage.getItem('lift_logs')) || [];
let currentDraft = JSON.parse(localStorage.getItem('lift_draft')) || null;
let workoutTimer = null;
let secondsElapsed = 0;
let isPaused = false;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let isPlanningMode = false;

document.addEventListener('DOMContentLoaded', () => {
    updateDraftAlert();
    setupEventListeners();
    renderExerciseBank();
    renderProgramList();
});

function setupEventListeners() {
    document.getElementById('start-new-btn').onclick = () => {
        isPlanningMode = true;
        showView('calendar-view');
        renderCalendar();
    };
    document.getElementById('calendar-mode').onclick = () => {
        isPlanningMode = false;
        showView('calendar-view');
        renderCalendar();
    };
    document.getElementById('view-exercises-btn').onclick = () => showView('exercises-view');
    document.getElementById('view-programs-btn').onclick = () => showView('programs-view');
    document.getElementById('stats-mode').onclick = () => {
        showView('stats-view');
        renderStats();
    };
    document.getElementById('global-home').onclick = () => {
        isPlanningMode = false;
        showView('home-view');
    };
    document.getElementById('save-workout-btn').onclick = saveActiveWorkout;
    document.getElementById('pause-workout-btn').onclick = saveWorkoutAsDraft;
    document.getElementById('resume-workout-btn').onclick = resumeDraft;
    document.getElementById('timer-toggle-btn').onclick = toggleTimer;
    document.getElementById('add-custom-pass-btn').onclick = openCreatePassModal;
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo(0,0);
}

// --- CALENDAR ---
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('month-label');
    const infoBox = document.getElementById('calendar-info-box');
    grid.innerHTML = '';
    
    if (isPlanningMode) {
        infoBox.innerHTML = `<div class="card glass-light" style="border-left: 4px solid var(--primary); margin-bottom:15px;"><p style="margin:0; font-size:0.9rem; font-weight:600;">Välj en dag för att starta ditt pass.</p></div>`;
    } else {
        infoBox.innerHTML = '';
    }

    const date = new Date(currentYear, currentMonth, 1);
    const monthNames = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];
    label.innerText = `${monthNames[currentMonth]} ${currentYear}`;

    let firstDay = date.getDay();
    if (firstDay === 0) firstDay = 7; 

    for (let i = 1; i < firstDay; i++) grid.appendChild(document.createElement('div'));

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        cell.innerHTML = `<span>${d}</span>`;
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        if (workoutLogs.some(l => l.date === dateStr)) cell.classList.add('cell-completed');
        else if (currentDraft && currentDraft.date === dateStr) cell.classList.add('cell-ongoing');
        else if (getPlannedPass(dateStr)) cell.classList.add('cell-planned');

        cell.onclick = () => openDayManager(dateStr);
        grid.appendChild(cell);
    }
}

function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
}

function openDayManager(dateStr) {
    const plan = getPlannedPass(dateStr);
    const modal = document.getElementById('workout-modal');
    const body = document.getElementById('modal-body');
    const currentProgId = plan ? plan.id : (programs[0] ? programs[0].id : null);
    const currentProgName = plan ? plan.name : (programs[0] ? programs[0].name : "Pass");

    body.innerHTML = `
        <h3>${dateStr}</h3>
        <button id="main-start-btn" class="mode-btn green" onclick="startWorkout('${dateStr}', '${currentProgId}')">Starta ${currentProgName} 🔥</button>
        <div style="margin-top:20px;">
            <p style="font-size:12px; color:var(--text-light); text-align:center;">ÄNDRA PLANERING</p>
            <div class="plan-override-grid">
                ${programs.map(p => `<button class="mode-btn glass-border plan-override-btn ${plan && plan.id === p.id ? 'active-choice' : ''}" onclick="setOverrideSilent('${dateStr}', '${p.id}', '${p.name}')">${p.name}</button>`).join('')}
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}

function setOverrideSilent(date, programId, programName) {
    let overrides = JSON.parse(localStorage.getItem('lift_overrides')) || {};
    overrides[date] = programId;
    localStorage.setItem('lift_overrides', JSON.stringify(overrides));
    document.getElementById('main-start-btn').innerText = `Starta ${programName} 🔥`;
    document.getElementById('main-start-btn').onclick = () => startWorkout(date, programId);
    renderCalendar();
}

function getPlannedPass(dateStr) {
    const overrides = JSON.parse(localStorage.getItem('lift_overrides')) || {};
    if (overrides[dateStr]) return programs.find(p => p.id === overrides[dateStr]);
    const d = new Date(dateStr).getDay();
    if (d === 1 || d === 5) return programs.find(p => p.id === 'a');
    if (d === 3) return programs.find(p => p.id === 'b');
    return null;
}

// --- WORKOUT ENGINE ---
function startWorkout(date, programId) {
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    closeModal();
    showView('workout-view');
    document.getElementById('active-title').innerText = program.name;
    const workoutEx = program.exercises.map(exId => {
        const base = exercises.find(e => e.id === exId);
        return { ...base, sets: [] };
    });
    currentDraft = { date, programName: program.name, exercises: workoutEx, seconds: 0 };
    secondsElapsed = 0;
    renderActiveWorkout();
    startTimer();
}

function renderActiveWorkout() {
    const container = document.getElementById('exercise-list');
    container.innerHTML = '';
    currentDraft.exercises.forEach((ex, exIdx) => {
        const card = document.createElement('div');
        card.className = `card glass-modern ${ex.done ? 'exercise-done' : ''}`;
        
        // HÄR RENDERAS VIDEON (Ändrad från img till video)
        const mediaHtml = ex.animation ? `
            <div class="exercise-media">
                <video src="${ex.animation}" autoplay loop muted playsinline style="width:100%; border-radius:12px;"></video>
            </div>
        ` : '';

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <strong style="font-size:1.2rem;">${ex.name}</strong>
                <button class="reorder-btn" onclick="toggleExDone(${exIdx})">  ${ex.done ? '✅' : '✔️'}  </button>
            </div>
            ${mediaHtml}
            <div id="sets-container-${exIdx}"></div>
            <button class="mode-btn glass-border" style="padding:10px; font-size:13px;" onclick="addSet(${exIdx})">+ Lägg till set</button>
        `;
        container.appendChild(card);
        renderSets(exIdx);
    });
}

function renderSets(exIdx) {
    const container = document.getElementById(`sets-container-${exIdx}`);
    container.innerHTML = '';
    currentDraft.exercises[exIdx].sets.forEach((set, setIdx) => {
        const row = document.createElement('div');
        row.className = 'edit-item-row';
        row.innerHTML = `
            <span style="font-weight:700; color:var(--primary);">${setIdx + 1}</span>
            <input type="number" class="log-input" style="width:70px; margin:0;" value="${set.weight}" placeholder="kg" onchange="updateSet(${exIdx}, ${setIdx}, 'weight', this.value)">
            <input type="number" class="log-input" style="width:60px; margin:0;" value="${set.reps}" placeholder="reps" onchange="updateSet(${exIdx}, ${setIdx}, 'reps', this.value)">
            <button onclick="removeSet(${exIdx}, ${setIdx})" style="background:none; border:none; color:var(--danger); font-size:18px;">×</button>
        `;
        container.appendChild(row);
    });
}

function addSet(exIdx) {
    const ex = currentDraft.exercises[exIdx];
    const lastSet = ex.sets[ex.sets.length - 1] || { weight: '', reps: '' };
    ex.sets.push({ ...lastSet });
    renderSets(exIdx);
}

function updateSet(exIdx, setIdx, field, val) { currentDraft.exercises[exIdx].sets[setIdx][field] = val; }
function removeSet(exIdx, setIdx) { currentDraft.exercises[exIdx].sets.splice(setIdx, 1); renderSets(exIdx); }
function toggleExDone(idx) { currentDraft.exercises[idx].done = !currentDraft.exercises[idx].done; renderActiveWorkout(); }

function startTimer() {
    if (workoutTimer) clearInterval(workoutTimer);
    workoutTimer = setInterval(() => {
        if (!isPaused) {
            secondsElapsed++;
            currentDraft.seconds = secondsElapsed;
            document.getElementById('workout-timer').innerText = new Date(secondsElapsed * 1000).toISOString().substr(11, 8);
        }
    }, 1000);
}

function toggleTimer() {
    isPaused = !isPaused;
    document.getElementById('timer-toggle-btn').innerText = isPaused ? 'Återuppta ▶️' : 'Pausa ⏸️';
}

function saveActiveWorkout() {
    clearInterval(workoutTimer);
    workoutLogs.push({ ...currentDraft, duration: document.getElementById('workout-timer').innerText, id: Date.now() });
    localStorage.setItem('lift_logs', JSON.stringify(workoutLogs));
    localStorage.removeItem('lift_draft');
    currentDraft = null;
    updateDraftAlert();
    showView('home-view');
}

function saveWorkoutAsDraft() {
    clearInterval(workoutTimer);
    localStorage.setItem('lift_draft', JSON.stringify(currentDraft));
    updateDraftAlert();
    showView('home-view');
}

function resumeDraft() {
    if (!currentDraft) return;
    showView('workout-view');
    secondsElapsed = currentDraft.seconds || 0;
    renderActiveWorkout();
    startTimer();
}

function updateDraftAlert() {
    const alertBox = document.getElementById('draft-alert');
    if (currentDraft) alertBox.classList.remove('hidden');
    else alertBox.classList.add('hidden');
}

function renderExerciseBank() {
    const container = document.getElementById('exercise-results');
    container.innerHTML = '';
    exercises.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'edit-item-row';
        div.innerHTML = `<div><strong>${ex.name}</strong><br><small>${ex.category}</small></div>`;
        container.appendChild(div);
    });
}

function filterExercises(cat) {
    const filtered = exercises.filter(e => e.category === cat);
    const container = document.getElementById('exercise-results');
    container.innerHTML = '';
    filtered.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'edit-item-row';
        div.innerHTML = `<div><strong>${ex.name}</strong></div>`;
        container.appendChild(div);
    });
}

function renderProgramList() {
    const container = document.getElementById('pass-selector-list');
    container.innerHTML = '';
    programs.forEach(p => {
        const card = document.createElement('div');
        card.className = 'prog-card';
        card.innerHTML = `<h4>${p.name}</h4>`;
        card.onclick = () => showProgramDetails(p.id);
        container.appendChild(card);
    });
}

function showProgramDetails(id) {
    const p = programs.find(x => x.id === id);
    const container = document.getElementById('program-exercise-list');
    document.getElementById('program-details-area').classList.remove('hidden');
    container.innerHTML = `<h3>${p.name}</h3>`;
    p.exercises.forEach(exId => {
        const ex = exercises.find(e => e.id === exId);
        container.innerHTML += `<div class="edit-item-row">${ex.name}</div>`;
    });
}

function closeModal() { document.getElementById('workout-modal').classList.add('hidden'); }
function openMonthPicker() {
    const m = prompt("Månad (1-12):", currentMonth + 1);
    if (m >= 1 && m <= 12) { currentMonth = parseInt(m) - 1; renderCalendar(); }
}

function renderStats() {
    const container = document.getElementById('chart-container');
    container.innerHTML = '';
    const counts = new Array(12).fill(0);
    workoutLogs.forEach(log => counts[new Date(log.date).getMonth()]++);
    const max = Math.max(...counts, 1);
    counts.forEach(c => {
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = `${(c / max) * 100}%`;
        container.appendChild(bar);
    });
}

function openCreateExerciseModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = `<h3>Ny övning</h3><input type="text" id="new-ex-name" class="log-input" placeholder="Namn"><button class="mode-btn green" onclick="saveNewExercise()">Spara</button>`;
    document.getElementById('workout-modal').classList.remove('hidden');
}

function saveNewExercise() {
    const name = document.getElementById('new-ex-name').value;
    if (name) {
        exercises.push({ id: Date.now(), name, category: 'Övrigt' });
        localStorage.setItem('lift_exercises', JSON.stringify(exercises));
        renderExerciseBank();
        closeModal();
    }
}

function openCreatePassModal() {
    const body = document.getElementById('modal-body');
    body.innerHTML = `<h3>Nytt Pass</h3><input type="text" id="new-prog-name" class="log-input" placeholder="Namn"><button class="mode-btn green" onclick="saveNewProgram()">Spara</button>`;
    document.getElementById('workout-modal').classList.remove('hidden');
}

function saveNewProgram() {
    const name = document.getElementById('new-prog-name').value;
    if (name) {
        programs.push({ id: 'c' + Date.now(), name, exercises: [1] });
        localStorage.setItem('lift_programs', JSON.stringify(programs));
        renderProgramList();
        closeModal();
    }
}
