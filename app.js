// --- INITIAL DATA & FALLBACK ---
const defaultProgram = {
    routine: [
        { id: "p1", name: "Pass A", exercises: [] },
        { id: "p2", name: "Pass B", exercises: [] },
        { id: "p3", name: "Pass C", exercises: [] }
    ]
};

let programData = JSON.parse(localStorage.getItem("myCustomProgram")) || defaultProgram;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

// --- BOOTSTRAP APP ---
window.onload = () => {
    initEventListeners();
    renderHome();
};

function initEventListeners() {
    // Navigationsknappar
    document.getElementById("global-home").onclick = () => renderHome();
    document.getElementById("start-new-btn").onclick = renderCalendar;
    document.getElementById("calendar-mode").onclick = renderCalendar;
    document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
    document.getElementById("view-programs-btn").onclick = () => renderProgramView();
    document.getElementById("stats-mode").onclick = renderStats;
    
    // Program & Övningar
    document.getElementById("add-custom-pass-btn").onclick = createNewPass;
    document.getElementById("add-new-exercise-btn").onclick = openCreateExerciseModal;
    document.getElementById("close-modal-btn").onclick = closeModal;

    // Kalender Nav
    document.getElementById("prev-month-btn").onclick = () => changeMonth(-1);
    document.getElementById("next-month-btn").onclick = () => changeMonth(1);

    // Kategori-knappar
    document.querySelectorAll(".cat-btn").forEach(btn => {
        btn.onclick = () => filterExercises(btn.dataset.cat);
    });

    // Workout actions
    document.getElementById("save-workout-btn").onclick = finishWorkout;
    document.getElementById("pause-workout-btn").onclick = () => renderHome();
}

// --- CORE FUNCTIONS ---
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

function renderHome() {
    showView("home-view");
    const draftAlert = document.getElementById("draft-alert");
    const startBtn = document.getElementById("start-new-btn");
    
    if (activeDraft) {
        draftAlert.classList.remove("hidden");
        startBtn.classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    } else {
        draftAlert.classList.add("hidden");
        startBtn.classList.remove("hidden");
    }
}

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
}

function openModal() {
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- CALENDAR LOGIC ---
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
        const isAutoDay = [1, 3, 5].includes(dayOfWeek);
        const override = calendarOverrides[dateStr];
        
        let displayPass = null;
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            displayPass = programData.routine[d % programData.routine.length];
        }

        if (hasWorkouts.length > 0) {
            cell.classList.add("cell-completed");
            cell.innerHTML = `<span>${d}</span><span style="font-size:10px;">✓</span>`;
        } else if (isOngoing) {
            cell.classList.add("cell-ongoing");
            cell.innerHTML = `<span>${d}</span><span style="font-size:10px;">⏱️</span>`;
        } else if (displayPass) {
            cell.classList.add("cell-planned");
            cell.innerHTML = `<span>${d}</span><span style="font-size:8px;">${displayPass.name.substring(0,6)}</span>`;
        } else {
            cell.innerHTML = `<span>${d}</span>`;
        }

        cell.onclick = () => openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3 style="margin-bottom:10px;">${dateStr}</h3>`;

    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${w.programName}</strong>
                    <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="color:var(--danger); background:none; border:none;">✖</button>
                </div>
                <div style="font-size:11px; margin-top:5px; color:var(--text-light);">Passet är slutfört.</div>
            </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
        html += `<button class="mode-btn" style="color:var(--danger); background:none;" onclick="cancelActiveDraft()">Avbryt och radera utkast</button>`;
    } else {
        if (planned) {
            html += `<p style="text-align:center;">Planerat: <strong>${planned.name}</strong></p>`;
            html += `<div class="preview-box">${planned.exercises.length > 0 ? planned.exercises.map(e => e.name).join(", ") : "Inga övningar tillagda ännu."}</div>`;
            html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet 🔥</button>`;
        }
        
        html += `<div class="separator"></div><p style="font-size:11px; color:var(--text-light); text-align:center;">VÄLJ PASS ELLER ÄNDRA:</p>`;
        programData.routine.forEach(p => {
            html += `
                <div style="margin-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">
                    <button class="mode-btn glass-border" style="font-size:14px; padding:10px; margin-bottom:5px;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>
                    <div style="font-size:10px; color:var(--text-light); text-align:center;">${p.exercises.length > 0 ? p.exercises.map(e => e.name).join(" • ") : "Tomt pass"}</div>
                </div>`;
        });
        html += `<button class="mode-btn" style="color:var(--danger); background:none; font-size:12px;" onclick="setOverride('${dateStr}', 'none')">Markera som vilodag</button>`;
    }
    body.innerHTML = html;
    openModal();
}

// --- PROGRAM LOGIC ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `<h4>${pass.name}</h4><div style="font-size:10px; color:var(--primary); font-weight:800;">${pass.exercises.length} ÖVNINGAR</div>`;
        div.onclick = () => { renderProgramView(i); showProgramDetails(i); };
        selector.appendChild(div);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    const detailsArea = document.getElementById("program-details-area");
    const list = document.getElementById("program-exercise-list");
    detailsArea.classList.remove("hidden");
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; font-size:18px;">${pass.name}</h3>
            <button class="blue" style="padding:8px 15px; border-radius:10px; border:none; font-weight:800;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.length > 0 ? pass.exercises.map(e => `
            <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <span>${e.name}</span>
                <small style="color:var(--primary); font-weight:800; font-size:9px;">${e.target}</small>
            </div>
        `).join("") : "<p style='text-align:center; color:var(--text-light);'>Inga övningar ännu.</p>"}
    `;
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    
    const options = masterExercises
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(ex => `<option value="${ex.id}">${ex.name} (${ex.target})</option>`).join("");

    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `
                <div class="edit-item-row">
                    <span style="font-size:14px; font-weight:600;">${ex.name}</span>
                    <button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none;">✖</button>
                </div>`).join("")}
        </div>
        <div style="margin-top:20px; padding:15px; background:rgba(255,255,255,0.05); border-radius:15px;">
            <select id="add-ex-select" class="log-input">
                <option value="">-- Lägg till övning --</option>
                ${options}
            </select>
            <button class="mode-btn glass-border" onclick="addExToPass(${idx})">+ Addera</button>
        </div>
        <button class="mode-btn blue" style="margin-top:20px;" onclick="saveProgramEdit(${idx})">Spara</button>
        <button class="mode-btn" style="color:var(--danger); background:none; font-size:14px;" onclick="deletePass(${idx})">Radera pass</button>
    `;
    openModal();
}

// --- EXERCISE LOGIC ---
function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === category));
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    
    if(filtered.length === 0) {
        results.innerHTML = `<p style="text-align:center; color:var(--text-light); padding:20px;">Inga övningar i denna kategori.</p>`;
        return;
    }

    filtered.forEach(ex => {
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.cssText = "padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
        div.innerHTML = `<div><strong>${ex.name}</strong><br><small style="color:var(--primary);">${ex.target}</small></div>
        <button onclick="deleteMasterExercise(${ex.id})" style="background:none; border:none; color:var(--danger);">✖</button>`;
        results.appendChild(div);
    });
}

function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Namn (t.ex. Bänkpress)">
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option><option value="Bröst">Bröst</option><option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option><option value="Biceps">Biceps</option><option value="Triceps">Triceps</option><option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara</button>
    `;
    openModal();
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-cat").value;
    if(!name) return alert("Ange namn!");
    masterExercises.push({ id: Date.now(), name, target });
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

// --- WORKOUT FLOW ---
function startWorkout(workout, data = null, date = null) {
    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: data || workout.exercises.map(()=>({weight:"", reps:"", sets:3})), 
        date: date || new Date().toISOString().split('T')[0] 
    };
    renderActiveWorkout();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `
            <div style="margin-bottom:15px;"><strong>${ex.name}</strong></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                <input type="number" id="w-${i}" class="log-input" placeholder="kg" value="${val.weight}" onchange="updateDraftData(${i})">
                <input type="number" id="r-${i}" class="log-input" placeholder="reps" value="${val.reps}" onchange="updateDraftData(${i})">
                <input type="number" id="s-${i}" class="log-input" placeholder="set" value="${val.sets}" onchange="updateDraftData(${i})">
            </div>`;
        list.appendChild(div);
    });
    showView("workout-view");
}

function finishWorkout() {
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
    activeDraft = null;
    localStorage.removeItem("activeWorkoutDraft");
    saveAll();
    renderCalendar();
}

// --- HELPER FUNCTIONS ---
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }
function createNewPass() {
    const newId = "c-" + Date.now();
    programData.routine.push({ id: newId, name: "Nytt Pass", exercises: [] });
    saveAll(); renderProgramView(programData.routine.length - 1);
}
function addExToPass(pIdx) {
    const exId = document.getElementById("add-ex-select").value;
    if(!exId) return;
    const ex = masterExercises.find(e => e.id == exId);
    programData.routine[pIdx].exercises.push({...ex});
    openEditProgramModal(pIdx);
}
function removeExFromPass(pIdx, eIdx) { programData.routine[pIdx].exercises.splice(eIdx, 1); openEditProgramModal(pIdx); }
function saveProgramEdit(idx) { programData.routine[idx].name = document.getElementById("edit-pass-name").value; saveAll(); closeModal(); renderProgramView(idx); showProgramDetails(idx); }
function deletePass(idx) { if(confirm("Radera?")) { programData.routine.splice(idx,1); saveAll(); closeModal(); renderProgramView(); document.getElementById("program-details-area").classList.add("hidden"); }}
function deleteMasterExercise(id) { masterExercises = masterExercises.filter(e => e.id != id); saveAll(); filterExercises(currentExerciseCategory); }
function updateDraftData(i) { activeDraft.data[i] = { weight: document.getElementById(`w-${i}`).value, reps: document.getElementById(`r-${i}`).value, sets: document.getElementById(`s-${i}`).value }; localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft)); }
function cancelActiveDraft() { if(confirm("Radera utkast?")) { activeDraft = null; localStorage.removeItem("activeWorkoutDraft"); closeModal(); renderCalendar(); }}
function deleteLoggedWorkout(date, idx) { 
    if(confirm("Radera?")) {
        const filtered = workoutHistory.filter(w => w.date === date);
        const item = filtered[idx];
        workoutHistory = workoutHistory.filter(w => w !== item);
        if(activeDraft && activeDraft.date === date) { activeDraft = null; localStorage.removeItem("activeWorkoutDraft"); }
        saveAll(); closeModal(); renderCalendar();
    }
}
function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "<h3>Slutförda pass</h3>";
    const counts = {};
    workoutHistory.forEach(w => { const m = w.date.substring(0, 7); counts[m] = (counts[m] || 0) + 1; });
    Object.entries(counts).forEach(([m, val]) => {
        container.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${m}</span><span>${val} st</span></div>`;
    });
    showView("stats-view");
}
