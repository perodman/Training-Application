let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

// --- INIT ---
fetch("program.json")
    .then(r => r.json())
    .then(json => {
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
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(id);
    if(target) target.classList.remove("hidden");
    window.scrollTo(0, 0);
}

// --- ÖVNINGS-LOGIK ---
function filterExercises(category) {
    currentExerciseCategory = category;
    // Punkt 1: Markera den valda knappen
    document.querySelectorAll(".cat-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.cat === category);
    });

    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    const filtered = masterExercises.filter(ex => {
        if (category === "Armar") return ex.target === "Biceps" || ex.target === "Triceps";
        return ex.target === category;
    });

    filtered.forEach(ex => {
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.cssText = "padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
        // Punkt 2: Uppdaterad färg för muskelgrupp (Cyan istället för lila)
        div.innerHTML = `
            <div>
                <strong style="font-size:16px;">${ex.name}</strong><br>
                <small style="color:var(--primary); font-weight:800; text-transform:uppercase; letter-spacing:1px; font-size:10px;">${ex.target}</small>
            </div>
            <button class="order-btn" style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="openEditExerciseModal(${ex.id})"> ⚙️ </button>`;
        results.appendChild(div);
    });
}

function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <label style="font-size:11px; color:var(--text-light); text-transform:uppercase;">Namn</label>
        <input type="text" id="new-ex-name" class="log-input" style="text-align:left;">
        <label style="font-size:11px; color:var(--text-light); text-transform:uppercase;">Muskelgrupp</label>
        <select id="new-ex-target" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara Övning</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function openEditExerciseModal(exId) {
    const ex = masterExercises.find(m => m.id == exId);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}" style="text-align:left;">
        <select id="edit-ex-target" class="log-input">
            <option value="Ben" ${ex.target === 'Ben' ? 'selected' : ''}>Ben</option>
            <option value="Bröst" ${ex.target === 'Bröst' ? 'selected' : ''}>Bröst</option>
            <option value="Rygg" ${ex.target === 'Rygg' ? 'selected' : ''}>Rygg</option>
            <option value="Axlar" ${ex.target === 'Axlar' ? 'selected' : ''}>Axlar</option>
            <option value="Biceps" ${ex.target === 'Biceps' ? 'selected' : ''}>Biceps</option>
            <option value="Triceps" ${ex.target === 'Triceps' ? 'selected' : ''}>Triceps</option>
            <option value="Bål" ${ex.target === 'Bål' ? 'selected' : ''}>Bål</option>
        </select>
        <button class="mode-btn blue" onclick="updateExercise(${exId})">Uppdatera</button>
        <button class="mode-btn" style="background:none; color:var(--danger); font-size:12px;" onclick="deleteExercise(${exId})">Radera övning</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- KALENDER-LOGIK ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthText = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    label.textContent = monthText.charAt(0).toUpperCase() + monthText.slice(1);

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement("div");
        cell.className = "calendar-cell";

        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr;
        const dayOfWeek = new Date(year, month, d).getDay();
        const isAutoDay = [2, 4, 6].includes(dayOfWeek);
        const override = calendarOverrides[dateStr];
        
        let displayPass = null;
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            const dayCounter = Math.floor(new Date(year, month, d).getTime() / (1000 * 86400 * 2));
            displayPass = programData.routine[dayCounter % programData.routine.length];
        }

        let info = "";
        if (hasWorkouts.length > 0) {
            cell.classList.add("cell-completed");
            info = "✓";
        } else if (isOngoing) {
            cell.classList.add("cell-ongoing");
            info = "⏱️";
        } else if (displayPass) {
            cell.classList.add("cell-planned");
            info = displayPass.name.split(" ").pop();
        }

        cell.innerHTML = `<span>${d}</span><span class="cell-info">${info}</span>`;
        cell.onclick = () => openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;

    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left;">
                <div style="display:flex; justify-content:space-between;"><strong>${w.programName}</strong><button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer;">✖</button></div>
                <div style="font-size:12px; margin-top:10px; color:var(--text-light);">${w.exercises.length} övningar loggade</div>
            </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p style="text-align:center;">Just nu: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet  🔥 </button>`;
        html += `<div class="separator"></div><p style="font-size:11px; text-align:center; color:var(--text-light); text-transform:uppercase;">Ändra planering:</p>`;
        
        programData.routine.forEach(p => {
            const isPlanned = planned && p.id === planned.id;
            html += `<button ${isPlanned ? 'disabled' : ''} class="mode-btn ${isPlanned ? 'btn-disabled' : 'glass-border'}" style="font-size:13px; padding:12px;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>`;
        });
        const isRestPlanned = !planned;
        html += `<button ${isRestPlanned ? 'disabled' : ''} class="mode-btn ${isRestPlanned ? 'btn-disabled' : ''}" style="color:var(--danger); background:none; font-size:13px;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- STATISTIK ---
function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const months = {};
    workoutHistory.forEach(w => {
        const m = w.date.substring(0, 7);
        months[m] = (months[m] || 0) + 1;
    });

    Object.entries(months).sort().forEach(([m, val]) => {
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "flex:1; display:flex; flex-direction:column; align-items:center;";
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = Math.min(val * 15, 130) + "px";
        bar.innerHTML = `<span style="position:absolute; top:-20px; width:100%; text-align:center; font-size:10px; color:var(--primary); font-weight:900;">${val}</span>`;
        wrapper.appendChild(bar);
        wrapper.innerHTML += `<div class="chart-label" style="font-size:9px; margin-top:8px; color:var(--text-light);">${m.split('-')[1]}</div>`;
        container.appendChild(wrapper);
    });
    showView("stats-view");
}

// --- TRÄNINGSPROGRAM ---
function renderProgramView() {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const btn = document.createElement("button");
        btn.className = "mode-btn blue";
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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; text-align:left;">${pass.name}</h3>
            <button class="order-btn" style="background:var(--primary); color:#0f172a; padding:5px 12px; border-radius:8px; font-weight:800; border:none; cursor:pointer;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `
            <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--glass-border);">
                <span>${e.name}</span>
                <small style="color:var(--primary); font-weight:800;">${e.target}</small>
            </div>
        `).join("")}
    `;
}

// --- NAVIGATION & EVENT BINDING ---
function renderHome() {
    showView("home-view");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    } else {
        document.getElementById("draft-alert").classList.add("hidden");
        document.getElementById("start-new-btn").classList.remove("hidden");
    }
}

// Punkt 3: Åtgärdad navigering
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = renderProgramView;
document.getElementById("stats-mode").onclick = renderStats;

// Hjälpfunktioner
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }

function startWorkout(workout, data = null, date = null) {
    activeDraft = { workout, data, date: date || new Date().toISOString().split('T')[0] };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    workout.exercises.forEach((ex, i) => {
        const val = data ? data[i] : { weight: "", reps: "", sets: ex.defaultSets || 3 };
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `<strong style="font-size:18px;">${ex.name}</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:10px;">
                <div><small>KG</small><input type="number" id="w-${i}" class="log-input" value="${val.weight}"></div>
                <div><small>Reps</small><input type="number" id="r-${i}" class="log-input" value="${val.reps}"></div>
                <div><small>Set</small><input type="number" id="s-${i}" class="log-input" value="${val.sets}"></div>
            </div>`;
        list.appendChild(div);
    });
    showView("workout-view");
}

document.getElementById("save-workout-btn").onclick = () => {
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name, weight: document.getElementById(`w-${i}`).value || "0",
            reps: document.getElementById(`r-${i}`).value || "0", sets: document.getElementById(`s-${i}`).value || "0"
        }))
    };
    workoutHistory.push(log);
    saveAll();
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    renderCalendar();
};

document.getElementById("pause-workout-btn").onclick = () => {
    activeDraft.data = activeDraft.workout.exercises.map((ex, i) => ({
        weight: document.getElementById(`w-${i}`).value,
        reps: document.getElementById(`r-${i}`).value,
        sets: document.getElementById(`s-${i}`).value
    }));
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    location.reload();
};
