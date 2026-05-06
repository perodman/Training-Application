let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

// --- INIT ---
fetch("program.json").then(r => r.json()).then(json => {
    const savedProgram = JSON.parse(localStorage.getItem("myCustomProgram"));
    
    if (masterExercises.length === 0) {
        json.routine.forEach(p => {
            p.exercises.forEach(ex => {
                if (!masterExercises.find(m => m.name === ex.name)) {
                    masterExercises.push({ ...ex, id: Date.now() + Math.random() });
                }
            });
        });
        localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    }
    
    programData = savedProgram || json;
    renderHome();
});

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}

// --- ÖVNINGS-LOGIK ---
function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[data-cat="${category}"]`);
    if(btn) btn.classList.add("active");
    
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    
    const filtered = masterExercises.filter(ex => {
        if (category === "Armar") return ex.target === "Biceps" || ex.target === "Triceps";
        return ex.target === category;
    });
    
    filtered.forEach(ex => {
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.cssText = "padding:18px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;";
        div.innerHTML = `
            <div>
                <strong style="display:block; font-size:16px;">${ex.name}</strong>
                <span style="font-size:11px; color:var(--primary); font-weight:700; text-transform:uppercase;">${ex.target}</span>
            </div>
            <button class="circle-ctrl" style="width:36px; height:36px; font-size:14px;" onclick="openEditExerciseModal(${ex.id})">⚙️</button>
        `;
        results.appendChild(div);
    });
}

function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3 style="margin-top:0">Skapa Övning</h3>
        <p style="color:var(--text-light); font-size:13px;">Lägg till en ny övning i din databas.</p>
        <input type="text" id="new-ex-name" class="log-input" style="margin-bottom:15px; text-align:left;" placeholder="Namn (t.ex. Marklyft)">
        <select id="new-ex-target" class="log-input" style="margin-bottom:20px; text-align:left;">
            <option value="Ben">Ben</option><option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option><option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option><option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara Övning</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-target").value;
    if(!name) return;
    masterExercises.push({ id: Date.now(), name, target });
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function openEditExerciseModal(exId) {
    const ex = masterExercises.find(m => m.id == exId);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3 style="margin-top:0">Redigera</h3>
        <input type="text" id="edit-ex-name" class="log-input" style="margin-bottom:15px; text-align:left;" value="${ex.name}">
        <select id="edit-ex-target" class="log-input" style="margin-bottom:20px;">
            <option value="Ben" ${ex.target === 'Ben'?'selected':''}>Ben</option>
            <option value="Bröst" ${ex.target === 'Bröst'?'selected':''}>Bröst</option>
            <option value="Rygg" ${ex.target === 'Rygg'?'selected':''}>Rygg</option>
            <option value="Axlar" ${ex.target === 'Axlar'?'selected':''}>Axlar</option>
            <option value="Biceps" ${ex.target === 'Biceps'?'selected':''}>Biceps</option>
            <option value="Triceps" ${ex.target === 'Triceps'?'selected':''}>Triceps</option>
            <option value="Bål" ${ex.target === 'Bål'?'selected':''}>Bål</option>
        </select>
        <button class="mode-btn blue" onclick="updateExercise(${exId})">Uppdatera</button>
        <button class="mode-btn red" style="margin-top:10px; background:rgba(239,68,68,0.2); color:#ef4444;" onclick="deleteExercise(${exId})">Radera</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function updateExercise(exId) {
    const ex = masterExercises.find(m => m.id == exId);
    const oldName = ex.name;
    ex.name = document.getElementById("edit-ex-name").value.trim();
    ex.target = document.getElementById("edit-ex-target").value;
    programData.routine.forEach(p => p.exercises.forEach(e => { if(e.name === oldName) e.name = ex.name; }));
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function deleteExercise(exId) {
    if(confirm("Radera övningen?")) {
        masterExercises = masterExercises.filter(m => m.id != exId);
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
}

// --- CORE FUNCTIONS ---
function renderHome() {
    showView("home-view");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
    const draftAlert = document.getElementById("draft-alert");
    const startBtn = document.getElementById("start-new-btn");
    if (activeDraft) {
        draftAlert.classList.remove("hidden");
        startBtn.classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    } else {
        draftAlert.classList.add("hidden");
        startBtn.classList.remove("hidden");
        startBtn.onclick = () => renderCalendar();
    }
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const days = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;
    
    for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        if (hasWorkouts.length > 0) cell.classList.add("cell-completed");
        cell.innerHTML = `<span>${d}</span>`;
        cell.onclick = () => openDayManager(dateStr);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr) {
    const body = document.getElementById("modal-body");
    const workouts = workoutHistory.filter(w => w.date === dateStr);
    let html = `<h3>${dateStr}</h3>`;
    if(workouts.length > 0) {
        workouts.forEach(w => html += `<div class="card glass" style="margin-top:10px;"><strong>${w.programName}</strong><br>Genomfört ✅</div>`);
    } else {
        html += `<p>Inga pass loggade.</p>`;
        programData.routine.forEach(p => {
            html += `<button class="mode-btn blue" style="margin-top:10px;" onclick="prepareStart('${dateStr}', '${p.id}')">Starta ${p.name}</button>`;
        });
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function prepareStart(date, id) {
    const pass = programData.routine.find(p => p.id === id);
    closeModal();
    startWorkout(pass, null, date);
}

function startWorkout(workout, data = null, date = null) {
    activeDraft = { workout, data, date: date || new Date().toISOString().split('T')[0] };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    workout.exercises.forEach((ex, i) => {
        const val = data ? data[i] : { weight: "", reps: "", sets: 3 };
        const div = document.createElement("div");
        div.className = "card-front";
        div.innerHTML = `
            <strong style="font-size:18px;">${ex.name}</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:15px;">
                <input type="number" id="w-${i}" class="log-input" value="${val.weight}" placeholder="KG">
                <input type="number" id="r-${i}" class="log-input" value="${val.reps}" placeholder="Reps">
                <input type="number" id="s-${i}" class="log-input" value="${val.sets}" placeholder="Set">
            </div>
        `;
        list.appendChild(div);
    });
    showView("workout-view");
}

document.getElementById("save-workout-btn").onclick = () => {
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name,
            weight: document.getElementById(`w-${i}`).value,
            reps: document.getElementById(`r-${i}`).value,
            sets: document.getElementById(`s-${i}`).value
        }))
    };
    workoutHistory.push(log);
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.removeItem("activeWorkoutDraft");
    renderHome();
};

function renderProgramView() {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const btn = document.createElement("button");
        btn.className = "mode-btn glass";
        btn.textContent = pass.name;
        btn.onclick = () => showProgramDetails(i);
        selector.appendChild(btn);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    const list = document.getElementById("program-exercise-list");
    list.classList.remove("hidden");
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="margin:0">${pass.name}</h3>
            <button class="circle-ctrl" onclick="openEditModal(${idx})">⚙️</button>
        </div>
        ${pass.exercises.map(e => `<div style="padding:10px 0; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between;"><span>${e.name}</span><small style="color:var(--primary)">${e.target}</small></div>`).join("")}
    `;
}

// Event Listeners & Helpers
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises("Ben"); };
document.getElementById("view-programs-btn").onclick = renderProgramView;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("stats-mode").onclick = () => { showView("stats-view"); renderStats(); };
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }

function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const months = {};
    workoutHistory.forEach(w => { const m = w.date.substring(0,7); months[m] = (months[m] || 0) + 1; });
    Object.entries(months).forEach(([m, val]) => {
        const w = document.createElement("div");
        w.style.cssText = "flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%;";
        w.innerHTML = `<div style="background:var(--primary); width:80%; border-radius:8px 8px 0 0; height:${val*20}px; min-height:10px; box-shadow: 0 0 15px var(--primary-glow);"></div><div style="font-size:10px; margin-top:8px;">${m}</div>`;
        container.appendChild(w);
    });
}
