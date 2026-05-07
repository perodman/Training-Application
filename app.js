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
        
        // Initiera master-övningar om de är tomma
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
        <label style="font-size:12px; color:var(--text-light);">Namn</label>
        <input type="text" id="new-ex-name" class="log-input" style="text-align:left; margin-bottom:15px;">
        <label style="font-size:12px; color:var(--text-light);">Muskelgrupp</label>
        <select id="new-ex-target" class="log-input" style="margin-bottom:20px;">
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

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-target").value;
    if(!name) return alert("Ange ett namn!");
    masterExercises.push({ id: Date.now(), name, target });
    saveAll();
    closeModal();
    filterExercises(currentExerciseCategory);
}

function openEditExerciseModal(exId) {
    const ex = masterExercises.find(m => m.id == exId);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}" style="text-align:left; margin-bottom:15px;">
        <select id="edit-ex-target" class="log-input" style="margin-bottom:20px;">
            <option value="Ben" ${ex.target === 'Ben' ? 'selected' : ''}>Ben</option>
            <option value="Bröst" ${ex.target === 'Bröst' ? 'selected' : ''}>Bröst</option>
            <option value="Rygg" ${ex.target === 'Rygg' ? 'selected' : ''}>Rygg</option>
            <option value="Axlar" ${ex.target === 'Axlar' ? 'selected' : ''}>Axlar</option>
            <option value="Biceps" ${ex.target === 'Biceps' ? 'selected' : ''}>Biceps</option>
            <option value="Triceps" ${ex.target === 'Triceps' ? 'selected' : ''}>Triceps</option>
            <option value="Bål" ${ex.target === 'Bål' ? 'selected' : ''}>Bål</option>
        </select>
        <button class="mode-btn green" onclick="updateExercise(${exId})">Uppdatera</button>
        <button class="mode-btn" style="background:none; color:var(--danger);" onclick="deleteExercise(${exId})">Radera övning</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function updateExercise(exId) {
    const ex = masterExercises.find(m => m.id == exId);
    const oldName = ex.name;
    ex.name = document.getElementById("edit-ex-name").value.trim();
    ex.target = document.getElementById("edit-ex-target").value;
    
    // Uppdatera i alla program också
    programData.routine.forEach(pass => {
        pass.exercises.forEach(e => {
            if(e.name === oldName) { e.name = ex.name; e.target = ex.target; }
        });
    });
    
    saveAll();
    closeModal();
    filterExercises(currentExerciseCategory);
}

function deleteExercise(exId) {
    if(confirm("Radera övningen permanent?")) {
        masterExercises = masterExercises.filter(m => m.id != exId);
        saveAll();
        closeModal();
        filterExercises(currentExerciseCategory);
    }
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
        div.innerHTML = `
            <div>
                <strong style="display:block;">${ex.name}</strong>
                <span style="font-size:10px; color:var(--primary); font-weight:800;">${ex.target}</span>
            </div>
            <button class="order-btn" onclick="openEditExerciseModal(${ex.id})"> ⚙️ </button>
        `;
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
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;

    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            html += `
                <div class="card glass" style="border-left:4px solid var(--success);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${w.programName}</strong>
                        <button class="delete-x-btn" onclick="deleteLoggedWorkout('${dateStr}', ${idx})"> ✖ </button>
                    </div>
                    <div style="margin-top:10px;">
                        ${w.exercises.map(ex => `
                            <div class="history-item-row">
                                <span>${ex.name}</span>
                                <strong>${ex.weight}kg x ${ex.reps}</strong>
                            </div>
                        `).join("")}
                    </div>
                </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p>Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet  🔥 </button>`;
        html += `<hr style="opacity:0.1; margin:15px 0"><p style="font-size:12px">Ändra planering:</p>`;
        programData.routine.forEach(p => {
            html += `<button class="mode-btn glass-border" style="font-size:12px; padding:10px;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>`;
        });
        html += `<button class="mode-btn" style="color:var(--danger); background:none;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function deleteLoggedWorkout(date, idx) {
    if(confirm("Radera loggat pass?")) {
        const index = workoutHistory.findIndex(w => w.date === date);
        workoutHistory.splice(index, 1);
        saveAll();
        closeModal();
        renderCalendar();
    }
}

function setOverride(date, val) {
    calendarOverrides[date] = val;
    saveAll();
    closeModal();
    renderCalendar();
}

function prepareStart(date, id) {
    const p = programData.routine.find(x => x.id === id);
    closeModal();
    startWorkout(p, null, date);
}

// --- TRÄNINGS-VY LOGIK ---
function startWorkout(workout, data = null, date = null) {
    activeDraft = { workout, data, date: date || new Date().toISOString().split('T')[0] };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    
    workout.exercises.forEach((ex, i) => {
        const val = data ? data[i] : { weight: "", reps: "", sets: ex.defaultSets || 3 };
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `
            <strong style="font-size:18px;">${ex.name}</strong>
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
            name: ex.name,
            weight: document.getElementById(`w-${i}`).value || "0",
            reps: document.getElementById(`r-${i}`).value || "0",
            sets: document.getElementById(`s-${i}`).value || "0"
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

// --- PROGRAM-VY LOGIK ---
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
            <h3 style="margin:0;">${pass.name}</h3>
            <button class="order-btn" style="background:var(--primary);" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `
            <div class="edit-item">
                <span>${e.name}</span>
                <small style="color:var(--primary)">${e.target}</small>
            </div>
        `).join("")}
    `;
}

function openEditProgramModal(pIdx) {
    const pass = programData.routine[pIdx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <div id="edit-pass-ex-list"></div>
        <hr style="opacity:0.1; margin:20px 0;">
        <p style="font-size:12px;">Lägg till övning:</p>
        <select id="bank-select" class="log-input" style="margin-bottom:10px;">
            ${masterExercises.map(ex => `<option value="${ex.name}">${ex.name} (${ex.target})</option>`).join("")}
        </select>
        <button class="mode-btn green" onclick="addExerciseToPass(${pIdx})">+ Lägg till</button>
    `;
    
    const list = body.querySelector("#edit-pass-ex-list");
    pass.exercises.forEach((ex, i) => {
        const div = document.createElement("div");
        div.className = "edit-item";
        div.innerHTML = `
            <span style="font-size:13px;">${ex.name}</span>
            <div class="order-controls">
                <button class="order-btn" onclick="moveEx(${pIdx}, ${i}, -1)">↑</button>
                <button class="order-btn" onclick="moveEx(${pIdx}, ${i}, 1)">↓</button>
                <button class="delete-x-btn" onclick="removeEx(${pIdx}, ${i})">✖</button>
            </div>
        `;
        list.appendChild(div);
    });
    document.getElementById("workout-modal").classList.remove("hidden");
}

function addExerciseToPass(pIdx) {
    const name = document.getElementById("bank-select").value;
    const ex = masterExercises.find(m => m.name === name);
    programData.routine[pIdx].exercises.push({...ex});
    saveAll();
    openEditProgramModal(pIdx);
    showProgramDetails(pIdx);
}

function moveEx(pIdx, exIdx, dir) {
    const exs = programData.routine[pIdx].exercises;
    const target = exIdx + dir;
    if(target >= 0 && target < exs.length) {
        [exs[exIdx], exs[target]] = [exs[target], exs[exIdx]];
        saveAll();
        openEditProgramModal(pIdx);
        showProgramDetails(pIdx);
    }
}

function removeEx(pIdx, exIdx) {
    programData.routine[pIdx].exercises.splice(exIdx, 1);
    saveAll();
    openEditProgramModal(pIdx);
    showProgramDetails(pIdx);
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
        bar.innerHTML = `<span style="position:absolute; top:-20px; width:100%; text-align:center; font-size:10px;">${val}</span>`;
        wrapper.appendChild(bar);
        wrapper.innerHTML += `<div class="chart-label">${m.split('-')[1]}</div>`;
        container.appendChild(wrapper);
    });
}

// --- NAVIGATION & EVENT ---
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

document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = renderProgramView;
document.getElementById("stats-mode").onclick = () => { showView("stats-view"); renderStats(); };
document.getElementById("add-custom-pass-btn").onclick = () => {
    const char = String.fromCharCode(65 + programData.routine.length);
    programData.routine.push({ id: `pass-${char.toLowerCase()}`, name: `Pass ${char}`, exercises: [] });
    saveAll();
    renderProgramView();
};

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
