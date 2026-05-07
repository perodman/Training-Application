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
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0, 0);
}

// --- ÖVNINGS-LOGIK ---
function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <label style="font-size:11px; color:var(--text-light); text-transform:uppercase; letter-spacing:1px;">Namn</label>
        <input type="text" id="new-ex-name" class="log-input" style="text-align:left;">
        <label style="font-size:11px; color:var(--text-light); text-transform:uppercase; letter-spacing:1px;">Muskelgrupp</label>
        <select id="new-ex-target" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn green" onclick="saveNewExercise()">Spara Övning</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function openEditExerciseModal(exId) {
    const ex = masterExercises.find(m => m.id == exId);
    const body = document.getElementById("modal-body");
    // Punkt 4: Centrerad rubrik via CSS h3
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
        <button class="mode-btn green" onclick="updateExercise(${exId})">Uppdatera</button>
        <button class="mode-btn" style="background:none; color:var(--danger); font-size:12px;" onclick="deleteExercise(${exId})">Radera övning</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === category));
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
        div.innerHTML = `<div><strong>${ex.name}</strong><br><small style="color:var(--primary)">${ex.target}</small></div>
            <button class="order-btn" onclick="openEditExerciseModal(${ex.id})"> ⚙️ </button>`;
        results.appendChild(div);
    });
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
}

// Punkt 8: Gråa ut nuvarande planerat pass
function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;

    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            html += `<div class="card glass" style="border-left:4px solid var(--success);">
                <div style="display:flex; justify-content:space-between;"><strong>${w.programName}</strong><button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" class="delete-x-btn">✖</button></div>
                <div style="font-size:12px; margin-top:10px;">${w.exercises.length} övningar loggade</div>
            </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p style="text-align:center;">Just nu: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet  🔥 </button>`;
        html += `<div class="separator"></div><p style="font-size:12px; text-align:center; color:var(--text-light);">Ändra planering för dagen:</p>`;
        
        programData.routine.forEach(p => {
            const isPlanned = planned && p.id === planned.id;
            const disabledAttr = isPlanned ? 'disabled' : '';
            const cssClass = isPlanned ? 'mode-btn btn-disabled' : 'mode-btn glass-border';
            html += `<button ${disabledAttr} class="${cssClass}" style="font-size:13px; padding:12px;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>`;
        });
        
        const isRestPlanned = !planned;
        html += `<button ${isRestPlanned ? 'disabled' : ''} class="mode-btn ${isRestPlanned ? 'btn-disabled' : ''}" style="color:var(--danger); background:none; font-size:13px;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

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

// NAVIGATION & EVENT
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => {
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
};

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }

function updateExercise(exId) {
    const ex = masterExercises.find(m => m.id == exId);
    const oldName = ex.name;
    ex.name = document.getElementById("edit-ex-name").value.trim();
    ex.target = document.getElementById("edit-ex-target").value;
    programData.routine.forEach(pass => {
        pass.exercises.forEach(e => { if(e.name === oldName) { e.name = ex.name; e.target = ex.target; } });
    });
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-target").value;
    if(!name) return;
    masterExercises.push({ id: Date.now(), name, target });
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

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
