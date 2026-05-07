// --- STATE & STORAGE ---
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let programData = JSON.parse(localStorage.getItem("myCustomProgram")) || { routine: [] };

let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

// --- STARTUP LOGIC ---
window.onload = () => {
    // Om vi inte har några övningar alls, skapa några startövningar
    if (masterExercises.length === 0) {
        masterExercises = [
            { id: 1, name: "Knäböj", target: "Ben" },
            { id: 2, name: "Bänkpress", target: "Bröst" },
            { id: 3, name: "Marklyft", target: "Rygg" }
        ];
        saveAll();
    }
    renderHome();
};

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

// --- NAVIGATION ---
function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove("hidden");
        window.scrollTo(0, 0);
    }
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }

// --- HOME VIEW ---
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

// --- CALENDAR ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' }).toUpperCase();
    
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr;
        const override = calendarOverrides[dateStr];
        
        let displayPass = null;
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if ([1, 3, 5].includes(new Date(year, month, d).getDay()) && override !== "none" && programData.routine.length > 0) {
            displayPass = programData.routine[d % programData.routine.length];
        }

        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        if (hasWorkouts.length) cell.classList.add("cell-completed");
        else if (isOngoing) cell.classList.add("cell-ongoing");
        else if (displayPass) cell.classList.add("cell-planned");
        
        cell.innerHTML = `<span>${d}</span><span style="font-size:10px;">${hasWorkouts.length ? "✓" : isOngoing ? "⏱️" : displayPass ? "P" : ""}</span>`;
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
            html += `<div class="card glass" style="text-align:left;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${w.programName}</strong>
                    <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); font-size:18px;">✖</button>
                </div>
            </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pass</button>`;
        html += `<button class="mode-btn" style="color:var(--danger); background:none;" onclick="cancelOngoing()">Radera pågående ✖</button>`;
    } else {
        html += `<p style="text-align:center;">Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta 🔥</button>`;
        html += `<div class="separator"></div><p style="font-size:11px; text-align:center;">ÄNDRA PLANERING</p>`;
        programData.routine.forEach(p => {
            html += `<div style="display:flex; gap:5px; margin-bottom:5px;">
                <button class="mode-btn glass-border" style="font-size:14px; margin:0; flex-grow:1;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>
                <button onclick="previewPass('${p.id}')" style="background:var(--card); border:1px solid var(--glass-border); border-radius:12px; width:45px; color:var(--primary);">ℹ️</button>
            </div>`;
        });
        html += `<button class="mode-btn" style="color:var(--danger); background:none;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    openModal();
}

function previewPass(id) {
    const p = programData.routine.find(x => x.id === id);
    alert(`Innehåll i ${p.name}:\n\n` + (p.exercises.length ? p.exercises.map(e => `- ${e.name}`).join("\n") : "Inga övningar tillagda"));
}

function cancelOngoing() {
    if(confirm("Radera passet? Status blir 'Planerat' igen.")) {
        activeDraft = null;
        saveAll();
        closeModal();
        renderCalendar();
    }
}

function deleteLoggedWorkout(date, idx) {
    if(confirm("Radera genomfört pass?")) {
        const dayWorkouts = workoutHistory.filter(w => w.date === date);
        const itemToRemove = dayWorkouts[idx];
        workoutHistory = workoutHistory.filter(w => w !== itemToRemove);
        saveAll();
        closeModal();
        renderCalendar();
    }
}

// --- PROGRAMS & EDITING ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `<h4>${pass.name}</h4><small>${pass.exercises.length} övningar</small>`;
        div.onclick = () => { renderProgramView(i); showProgramDetails(i); };
        selector.appendChild(div);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    document.getElementById("program-details-area").classList.remove("hidden");
    const list = document.getElementById("program-exercise-list");
    list.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0;">${pass.name}</h3>
        <button class="mode-btn blue" style="width:auto; padding:8px 15px;" onclick="openEditProgramModal(${idx})">Redigera</button>
    </div>
    ${pass.exercises.map(e => `<div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">${e.name}</div>`).join("")}`;
}

function openCreatePassModal() {
    const name = prompt("Namn på nytt pass:");
    if(!name) return;
    programData.routine.push({ id: "p" + Date.now(), name, exercises: [] });
    saveAll();
    renderProgramView();
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `<div class="edit-item-row">
                <button onclick="moveExercise(${idx}, ${i}, -1)" style="background:none; border:1px solid var(--primary); color:var(--primary); border-radius:5px;">▲</button>
                <span style="flex-grow:1; margin:0 10px; font-size:14px;">${ex.name}</span>
                <button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none;">✖</button>
            </div>`).join("")}
        </div>
        <div class="separator"></div>
        <select id="add-ex-select" class="log-input">
            <option value="">+ Lägg till övning...</option>
            ${masterExercises.map(m=>`<option value="${m.id}">${m.name}</option>`).join("")}
        </select>
        <button class="mode-btn blue" onclick="saveProgramEdit(${idx})">Spara & Stäng</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteProgram(${idx})">Radera hela passet</button>
    `;
    openModal();
}

function saveProgramEdit(idx) {
    const exId = document.getElementById("add-ex-select").value;
    if(exId) {
        const found = masterExercises.find(e => e.id == exId);
        programData.routine[idx].exercises.push({...found});
    }
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll(); closeModal(); renderProgramView(idx); showProgramDetails(idx);
}

function moveExercise(pIdx, eIdx, dir) {
    const ex = programData.routine[pIdx].exercises;
    if(eIdx+dir >= 0 && eIdx+dir < ex.length) {
        [ex[eIdx], ex[eIdx+dir]] = [ex[eIdx+dir], ex[eIdx]];
        openEditProgramModal(pIdx);
    }
}

function removeExFromPass(pIdx, eIdx) {
    programData.routine[pIdx].exercises.splice(eIdx, 1);
    openEditProgramModal(pIdx);
}

function deleteProgram(idx) {
    if(confirm("Radera passet helt?")) {
        programData.routine.splice(idx, 1);
        saveAll(); closeModal(); renderProgramView();
    }
}

// --- EXERCISE BANK ---
function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === category));
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    
    masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category)
    .forEach(ex => {
        results.innerHTML += `<div class="card glass" style="padding:15px; display:flex; justify-content:space-between; align-items:center;">
            <div><strong>${ex.name}</strong><br><small style="color:var(--primary);">${ex.target}</small></div>
            <button onclick="deleteMasterExercise(${ex.id})" style="background:none; border:none; color:var(--danger); font-size:18px;">✖</button>
        </div>`;
    });
}

function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Namn (t.ex. Knäböj)">
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option><option value="Bröst">Bröst</option><option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option><option value="Biceps">Biceps</option><option value="Triceps">Triceps</option><option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara Övning</button>
    `;
    openModal();
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    if(!name) return;
    masterExercises.push({ id: Date.now(), name, target: document.getElementById("new-ex-cat").value });
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function deleteMasterExercise(id) {
    if(confirm("Radera övningen permanent från banken?")) {
        masterExercises = masterExercises.filter(e => e.id != id);
        saveAll(); filterExercises(currentExerciseCategory);
    }
}

// --- ACTIVE WORKOUT ---
function startWorkout(workout, data = null, date = null) {
    activeDraft = { 
        workout, 
        data: data || workout.exercises.map(() => ({ weight: "", reps: "", sets: 3 })), 
        date: date || new Date().toISOString().split('T')[0] 
    };
    saveAll();
    renderActiveWorkout();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    
    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        list.innerHTML += `<div class="card glass">
            <strong>${ex.name}</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:10px;">
                <input type="number" id="w-${i}" class="log-input" placeholder="KG" value="${val.weight}" onchange="updateDraftData(${i})">
                <input type="number" id="r-${i}" class="log-input" placeholder="Reps" value="${val.reps}" onchange="updateDraftData(${i})">
                <input type="number" id="s-${i}" class="log-input" placeholder="Set" value="${val.sets}" onchange="updateDraftData(${i})">
            </div>
        </div>`;
    });
    showView("workout-view");
}

function updateDraftData(idx) {
    activeDraft.data[idx] = { 
        weight: document.getElementById(`w-${idx}`).value, 
        reps: document.getElementById(`r-${idx}`).value, 
        sets: document.getElementById(`s-${idx}`).value 
    };
    saveAll();
}

// --- LISTENERS ---
document.getElementById("global-home").onclick = () => renderHome();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();

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
    activeDraft = null;
    saveAll();
    renderCalendar();
};

document.getElementById("pause-workout-btn").onclick = () => renderHome();

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }
