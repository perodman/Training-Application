// --- STATE ---
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let programData = { routine: [] };

// --- INIT ---
fetch("program.json").then(r => r.json()).then(json => {
    programData = JSON.parse(localStorage.getItem("myCustomProgram")) || json;
    // Om banken är tom, fyll den från programmet första gången
    if (masterExercises.length === 0) {
        programData.routine.forEach(p => p.exercises.forEach(ex => {
            if(!masterExercises.find(m => m.name === ex.name)) {
                masterExercises.push({...ex, id: Date.now() + Math.random()});
            }
        }));
        saveAll();
    }
    renderHome();
    initGlobalTimer();
});

// --- TIMER MOTOR (Hjärnan som aldrig pausar i bakgrunden) ---
let globalTimerInterval = null;
function initGlobalTimer() {
    if (globalTimerInterval) clearInterval(globalTimerInterval);
    globalTimerInterval = setInterval(() => {
        if (activeDraft && activeDraft.timerRunning) {
            const now = Date.now();
            const elapsedSinceLastStart = Math.floor((now - activeDraft.startTime) / 1000);
            const totalSeconds = activeDraft.accumulatedTime + elapsedSinceLastStart;
            
            const display = document.getElementById("workout-timer");
            if (display && !document.getElementById("workout-view").classList.contains("hidden")) {
                display.textContent = formatTime(totalSeconds);
            }
        }
    }, 1000);
}

function formatTime(s) {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sc = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sc}`;
}

// --- WORKOUT LOGIK ---
function startWorkout(workout, data = null, date = null, timeSeconds = 0) {
    // Om ett pass redan körs och vi inte uttryckligen skickar in ny tid (redigering), rör inte timern
    if (activeDraft && !timeSeconds && activeDraft.workout.name === workout.name) {
        // Vi bara öppnar vyn, ingen reset
    } else {
        activeDraft = {
            workout: JSON.parse(JSON.stringify(workout)),
            data: data || workout.exercises.map(() => ({ weight: "", reps: "", sets: 3 })),
            date: date || new Date().toISOString().split('T')[0],
            accumulatedTime: timeSeconds,
            startTime: Date.now(),
            timerRunning: true
        };
    }
    saveAll();
    renderActiveWorkout();
    showView("workout-view");
}

function toggleTimer() {
    if (!activeDraft) return;
    if (activeDraft.timerRunning) {
        // Pausa: Spara ner tiden vi har tickat ihop hittills
        activeDraft.accumulatedTime += Math.floor((Date.now() - activeDraft.startTime) / 1000);
        activeDraft.timerRunning = false;
        document.getElementById("timer-toggle-btn").textContent = "Fortsätt ▶️";
    } else {
        // Starta: Sätt en ny referenspunkt för "nu"
        activeDraft.startTime = Date.now();
        activeDraft.timerRunning = true;
        document.getElementById("timer-toggle-btn").textContent = "Pausa ⏸️";
    }
    saveAll();
}

function editLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    
    // Konvertera HH:MM:SS från historiken tillbaka till sekunder för klockan
    const parts = item.totalTime.split(':');
    const totalSeconds = (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);

    const workoutObj = { name: item.programName, exercises: item.exercises.map(ex => ({ name: ex.name })) };
    const dataObj = item.exercises.map(ex => ({ weight: ex.weight, reps: ex.reps, sets: ex.sets }));
    
    // Ta bort från historiken (den flyttas till "aktivt pass")
    workoutHistory = workoutHistory.filter(w => w !== item);
    saveAll();

    // Starta passet med den gamla tiden intakt!
    closeModal();
    startWorkout(workoutObj, dataObj, date, totalSeconds);
}

// --- NAVIGATION & SPARANDE ---
function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}

function saveAll() {
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
}

function renderHome() {
    showView("home-view");
    if (activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => showView("workout-view");
    } else {
        document.getElementById("draft-alert").classList.add("hidden");
    }
}

// --- EVENT LISTENERS ---
document.getElementById("global-home").onclick = () => renderHome();
document.getElementById("calendar-mode").onclick = () => renderCalendar();
document.getElementById("timer-toggle-btn").onclick = toggleTimer;
document.getElementById("exit-workout-btn").onclick = () => renderHome();

document.getElementById("save-workout-btn").onclick = () => {
    let finalSecs = activeDraft.accumulatedTime;
    if (activeDraft.timerRunning) finalSecs += Math.floor((Date.now() - activeDraft.startTime) / 1000);
    
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: formatTime(finalSecs),
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name,
            weight: document.getElementById(`w-${i}`).value || "0",
            reps: document.getElementById(`r-${i}`).value || "0",
            sets: document.getElementById(`s-${i}`).value || "0"
        }))
    };
    workoutHistory.push(log);
    activeDraft = null;
    localStorage.removeItem("activeWorkoutDraft");
    saveAll();
    renderCalendar();
};

// --- KALENDER & MODAL (Samma som du var nöjd med) ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const label = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    document.getElementById("month-label").textContent = label.charAt(0).toUpperCase() + label.slice(1);
    
    const days = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        const completed = workoutHistory.filter(w => w.date === dateStr);
        if (completed.length > 0) cell.classList.add("cell-completed");
        if (activeDraft && activeDraft.date === dateStr) cell.classList.add("cell-ongoing");
        
        cell.innerHTML = `<span>${d}</span>`;
        cell.onclick = () => {
            let html = `<h3>${dateStr}</h3>`;
            if (completed.length > 0) {
                completed.forEach((w, i) => {
                    html += `<div class="glass" style="margin-bottom:10px; padding:15px; text-align:left;">
                        <strong>${w.programName}</strong><br><small>Tid: ${w.totalTime}</small>
                        <button class="mode-btn blue" onclick="editLoggedWorkout('${dateStr}', ${i})" style="padding:10px; font-size:12px; margin-top:10px;">Redigera (fortsätt tid)</button>
                    </div>`;
                });
            } else {
                html += `<p>Inga pass loggade.</p><button class="mode-btn green" onclick="closeModal(); startWorkout(programData.routine[0], null, '${dateStr}')">Starta Standardpass</button>`;
            }
            document.getElementById("modal-body").innerHTML = html;
            openModal();
        };
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        const div = document.createElement("div");
        div.className = "glass";
        div.innerHTML = `
            <div style="font-weight:800; margin-bottom:10px;">${ex.name}</div>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
                <input type="number" id="w-${i}" class="log-input" value="${val.weight}" placeholder="kg">
                <input type="number" id="r-${i}" class="log-input" value="${val.reps}" placeholder="reps">
                <input type="number" id="s-${i}" class="log-input" value="${val.sets}" placeholder="set">
            </div>
        `;
        list.appendChild(div);
    });
}

function changeMonth(v) { currentViewDate.setMonth(currentViewDate.getMonth() + v); renderCalendar(); }
function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
