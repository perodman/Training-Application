let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();

let timerInterval = null;
let secondsElapsed = activeDraft ? (activeDraft.secondsElapsed || 0) : 0;
let isTimerRunning = false;

// --- INIT ---
fetch("program.json").then(r => r.json()).then(json => {
    if (masterExercises.length === 0) {
        json.routine.forEach(p => p.exercises.forEach(ex => {
            if (!masterExercises.find(m => m.name === ex.name)) masterExercises.push({ ...ex, id: Date.now() + Math.random() });
        }));
        localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    }
    programData = JSON.parse(localStorage.getItem("myCustomProgram")) || json;
    renderHome();
});

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(id);
    if (target) target.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }

// --- SMART ÖVNINGSVÄLJARE ---
function openExercisePicker(onSelect) {
    const body = document.getElementById("modal-body");
    const cats = ["Ben", "Rygg", "Bröst", "Axlar", "Armar", "Bål"];
    body.innerHTML = `<h3>Välj Muskelgrupp</h3><div class="category-grid">` + 
        cats.map(c => `<button class="cat-btn" onclick="showPickerList('${c}')">${c}</button>`).join("") + `</div>`;
    window.showPickerList = (cat) => {
        const filtered = masterExercises.filter(ex => cat === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === cat);
        body.innerHTML = `<h3>${cat}</h3><div style="max-height:300px; overflow-y:auto;">` + 
            filtered.map(ex => `<button class="mode-btn glass-border" onclick="selectAndClose('${ex.name}', '${ex.target}')">${ex.name}</button>`).join("") + 
            `</div><button class="mode-btn" onclick="openExercisePicker()">← Tillbaka</button>`;
    };
    window.selectAndClose = (name, target) => { onSelect({name, target}); closeModal(); };
    openModal();
}

// --- TRÄNINGSLOGIK ---
function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if (!activeDraft.isStarted) {
        list.innerHTML = `<button class="mode-btn green" style="padding:40px; font-size:1.5rem;" onclick="startNow()">STARTA PASS 🔥</button>`;
    } else {
        activeDraft.workout.exercises.forEach((ex, i) => {
            const val = activeDraft.data[i];
            list.innerHTML += `
                <div class="card glass">
                    <strong>${ex.name}</strong>
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:10px;">
                        <input type="number" class="log-input" placeholder="kg" value="${val.weight}" onchange="updateVal(${i}, 'weight', this.value)">
                        <input type="number" class="log-input" placeholder="reps" value="${val.reps}" onchange="updateVal(${i}, 'reps', this.value)">
                        <input type="number" class="log-input" placeholder="set" value="${val.sets}" onchange="updateVal(${i}, 'sets', this.value)">
                    </div>
                </div>`;
        });
        list.innerHTML += `
            <button class="mode-btn glass-border" onclick="openExercisePicker(addExToActive)">+ Lägg till övning</button>
            <button class="mode-btn orange" onclick="saveAndExit()">Spara utkast & Stäng</button>
            <button class="mode-btn green" onclick="finishWorkout()">AVSLUTA & LOGGA 🏆</button>`;
        startTimer();
    }
    showView("workout-view");
}

function startNow() { activeDraft.isStarted = true; saveAll(); renderActiveWorkout(); }
function updateVal(i, field, val) { activeDraft.data[i][field] = val; localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft)); }
function addExToActive(ex) { activeDraft.workout.exercises.push(ex); activeDraft.data.push({weight:"", reps:"", sets:3}); renderActiveWorkout(); }
function saveAndExit() { pauseTimer(); saveAll(); renderHome(); }

function finishWorkout() {
    workoutHistory.push({
        date: activeDraft.date, programName: activeDraft.workout.name,
        totalTime: document.getElementById("workout-timer").textContent,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({ ...ex, ...activeDraft.data[i] }))
    });
    activeDraft = null; localStorage.removeItem("activeWorkoutDraft");
    pauseTimer(); secondsElapsed = 0; saveAll(); renderCalendar();
}

// --- KALENDER ---
function renderCalendar() {
    const container = document.getElementById("calendar-view");
    const year = currentViewDate.getFullYear(); const month = currentViewDate.getMonth();
    const monthName = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    
    container.innerHTML = `
        <h2 class="section-title">Dagbok</h2>
        <div class="calendar-header">
            <button class="nav-arrow" onclick="moveMonth(-1)">❮</button>
            <div id="month-label">${monthName.toUpperCase()}</div>
            <button class="nav-arrow" onclick="moveMonth(1)">❯</button>
        </div>
        <div class="calendar-weekdays"><div>Mån</div><div>Tis</div><div>Ons</div><div>Tor</div><div>Fre</div><div>Lör</div><div>Sön</div></div>
        <div id="calendar-grid" class="calendar-grid"></div>`;
    
    const grid = document.getElementById("calendar-grid");
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;
    for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const hasWorkouts = workoutHistory.some(w => w.date === dateStr);
        const cell = document.createElement("div");
        cell.className = "calendar-cell" + (hasWorkouts ? " cell-completed" : "");
        cell.innerHTML = `<span>${d}</span>`;
        cell.onclick = () => openDay(dateStr);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

// --- ÖVRIGT ---
function moveMonth(dir) { currentViewDate.setMonth(currentViewDate.getMonth() + dir); renderCalendar(); }
function renderHome() { showView("home-view"); document.getElementById("draft-alert").className = activeDraft ? "" : "hidden"; }
function startTimer() { if (isTimerRunning) return; isTimerRunning = true; timerInterval = setInterval(() => { secondsElapsed++; updateTimer(); }, 1000); }
function pauseTimer() { isTimerRunning = false; clearInterval(timerInterval); }
function updateTimer() {
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    const el = document.getElementById("workout-timer");
    if (el) el.textContent = `${hrs}:${mins}:${secs}`;
}

// Event Listeners
document.getElementById("global-home").onclick = () => { pauseTimer(); renderHome(); };
document.getElementById("view-programs-btn").onclick = () => {
    const list = document.getElementById("pass-selector-list");
    list.innerHTML = programData.routine.map((p, i) => `
        <div class="prog-card" onclick="renderActiveWorkoutFromProg(${i})">
            <div style="font-size:2rem;">${['⚡','🔥','🏆','💎'][i%4]}</div>
            <h4>${p.name}</h4>
        </div>`).join("");
    showView("programs-view");
};
window.renderActiveWorkoutFromProg = (i) => {
    const p = programData.routine[i];
    activeDraft = { workout: JSON.parse(JSON.stringify(p)), data: p.exercises.map(()=>({weight:"", reps:"", sets:3})), date: new Date().toISOString().split('T')[0], isStarted: false };
    renderActiveWorkout();
};
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("resume-workout-btn").onclick = () => renderActiveWorkout();
