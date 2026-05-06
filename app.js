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
    
    // Om masterExercises är tom (första gången), ladda från JSON
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
}

// --- ÖVNINGS-LOGIK (NYTT) ---

function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <label style="font-size:12px; font-weight:800;">Namn</label>
        <input type="text" id="new-ex-name" class="log-input" style="margin-bottom:15px; text-align:left;" placeholder="t.ex. Marklyft">
        
        <label style="font-size:12px; font-weight:800;">Muskelgrupp</label>
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
    
    const newEx = { id: Date.now(), name, target };
    masterExercises.push(newEx);
    saveAll();
    closeModal();
    filterExercises(currentExerciseCategory);
}

function openEditExerciseModal(exId) {
    const ex = masterExercises.find(m => m.id == exId);
    if(!ex) return;

    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <label style="font-size:12px; font-weight:800;">Namn</label>
        <input type="text" id="edit-ex-name" class="log-input" style="margin-bottom:15px; text-align:left;" value="${ex.name}">
        
        <label style="font-size:12px; font-weight:800;">Muskelgrupp</label>
        <select id="edit-ex-target" class="log-input" style="margin-bottom:20px;">
            <option value="Ben" ${ex.target === 'Ben' ? 'selected' : ''}>Ben</option>
            <option value="Bröst" ${ex.target === 'Bröst' ? 'selected' : ''}>Bröst</option>
            <option value="Rygg" ${ex.target === 'Rygg' ? 'selected' : ''}>Rygg</option>
            <option value="Axlar" ${ex.target === 'Axlar' ? 'selected' : ''}>Axlar</option>
            <option value="Biceps" ${ex.target === 'Biceps' ? 'selected' : ''}>Biceps</option>
            <option value="Triceps" ${ex.target === 'Triceps' ? 'selected' : ''}>Triceps</option>
            <option value="Bål" ${ex.target === 'Bål' ? 'selected' : ''}>Bål</option>
        </select>
        <button class="mode-btn green" onclick="updateExercise(${exId})">Uppdatera Övning</button>
        <button class="mode-btn red" onclick="deleteExercise(${exId})" style="margin-top:10px;">Radera Övning</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function updateExercise(exId) {
    const oldName = masterExercises.find(m => m.id == exId).name;
    const newName = document.getElementById("edit-ex-name").value.trim();
    const newTarget = document.getElementById("edit-ex-target").value;

    if(!newName) return alert("Namnet får inte vara tomt!");

    // Uppdatera Master
    const idx = masterExercises.findIndex(m => m.id == exId);
    masterExercises[idx].name = newName;
    masterExercises[idx].target = newTarget;

    // Synka till alla program (viktigt!)
    programData.routine.forEach(pass => {
        pass.exercises.forEach(ex => {
            if(ex.name === oldName) {
                ex.name = newName;
                ex.target = newTarget;
            }
        });
    });

    saveAll();
    closeModal();
    filterExercises(currentExerciseCategory);
}

function deleteExercise(exId) {
    if(confirm("Vill du verkligen radera denna övning? Den kommer inte tas bort från befintliga program, men försvinner från banken.")) {
        masterExercises = masterExercises.filter(m => m.id != exId);
        saveAll();
        closeModal();
        filterExercises(currentExerciseCategory);
    }
}

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
        div.className = "card";
        div.style.cssText = "padding:15px; display:flex; justify-content:space-between; align-items:center;";
        div.innerHTML = `
            <div>
                <strong style="display:block;">${ex.name}</strong>
                <span style="font-size:10px; color:var(--primary); font-weight:800;">${ex.target}</span>
            </div>
            <button class="order-btn" onclick="openEditExerciseModal(${ex.id})">Redigera</button>
        `;
        results.appendChild(div);
    });
}

// --- RESTEN AV APPS LOGIK (BEHÅLLD) ---

function renderHome() {
    showView("home-view");
    const draftAlert = document.getElementById("draft-alert");
    const startBtn = document.getElementById("start-new-btn");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
    if (activeDraft) {
        draftAlert.classList.remove("hidden");
        startBtn.classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => {
            startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
        };
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
    const rawMonth = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    label.textContent = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;
    workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(year, month, d);
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr;
        const dayOfWeek = dateObj.getDay();
        const isAutoDay = [2, 4, 6].includes(dayOfWeek);
        const override = calendarOverrides[dateStr];
        let displayPass = null;
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            const dayCounter = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24 * 2)); 
            const idx = dayCounter % programData.routine.length;
            displayPass = programData.routine[idx];
        }
        let passLabel = "";
        if (hasWorkouts.length > 0) {
            cell.classList.add("cell-completed");
            passLabel = "✓";
        } else if (isOngoing) {
            cell.classList.add("cell-ongoing");
            passLabel = "⏱️";
        } else if (displayPass) {
            cell.classList.add("cell-planned");
            passLabel = displayPass.name.split(" ").pop();
        }
        cell.innerHTML = `<span>${d}</span><span class="cell-info">${passLabel}</span>`;
        cell.onclick = () => openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, currentPass, completedWorkouts, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;
    if (completedWorkouts.length > 0) {
        html += `<h4>Genomförda pass:</h4>`;
        completedWorkouts.forEach((w, idx) => {
            html += `
                <div class="card" style="border-left: 5px solid var(--success); padding: 12px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${w.programName}</strong>
                        <div style="display:flex; gap:5px;">
                             <button class="order-btn" style="background:#dbeafe; color:var(--primary);" onclick="editLoggedWorkout('${dateStr}', ${idx})">Redigera</button>
                             <button class="delete-x-btn" onclick="deleteLoggedWorkout('${dateStr}', ${idx})">✖</button>
                        </div>
                    </div>
                </div>`;
        });
    } else if (isOngoing) {
        html += `<div class="card" style="text-align:center;"><button class="mode-btn orange" onclick="resumeFromCalendar()">Öppna pågående pass</button></div>`;
    } else {
        html += `<p>Planerat: <strong>${currentPass ? currentPass.name : 'Vila'}</strong></p>
            ${currentPass ? `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${currentPass.id}')">Starta passet 🔥</button>` : ''}
            <hr><h4>Ändra planering:</h4>
            ${programData.routine.map(p => `<button class="mode-btn blue" onclick="setOverride('${dateStr}', '${p.id}')">Planera ${p.name}</button>`).join("")}
            <button class="mode-btn red" onclick="setOverride('${dateStr}', 'none')">Sätt som vilodag</button>`;
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function resumeFromCalendar() {
    closeModal();
    if (activeDraft) startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
}

function prepareStart(dateStr, passId) {
    const pass = programData.routine.find(p => p.id === passId);
    closeModal();
    startWorkout(pass, null, dateStr);
}

function setOverride(dateStr, val) {
    calendarOverrides[dateStr] = val;
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
    closeModal();
    renderCalendar();
}

function startWorkout(workout, savedData = null, workoutDate = null) {
    const finalDate = workoutDate || new Date().toISOString().split('T')[0];
    activeDraft = { workout: workout, data: savedData, date: finalDate };
    document.getElementById("active-title").textContent = `${workout.name}`;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    workout.exercises.forEach((ex, i) => {
        const val = (savedData && savedData[i]) ? savedData[i] : { weight: "", reps: "", sets: ex.defaultSets || 3 };
        const container = document.createElement("div");
        container.className = "exercise-card-container";
        container.innerHTML = `
            <div class="card-front">
                <div style="font-size:10px; font-weight:900; color:var(--primary); text-transform:uppercase; margin-bottom:5px;">${ex.target}</div>
                <strong style="font-size:18px; display:block; margin-bottom:15px;">${ex.name}</strong>
                <div class="input-group">
                    <div><input type="number" id="w-${i}" class="log-input" value="${val.weight}" placeholder="KG"></div>
                    <div><input type="number" id="r-${i}" class="log-input" value="${val.reps}" placeholder="Reps"></div>
                    <div><input type="number" id="s-${i}" class="log-input" value="${val.sets}" placeholder="Set"></div>
                </div>
            </div>`;
        list.appendChild(container);
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
    activeDraft = null;
    renderCalendar();
};

document.getElementById("pause-workout-btn").onclick = () => {
    const draftData = activeDraft.workout.exercises.map((ex, i) => ({
        weight: document.getElementById(`w-${i}`).value,
        reps: document.getElementById(`r-${i}`).value,
        sets: document.getElementById(`s-${i}`).value
    }));
    activeDraft.data = draftData;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    location.reload();
};

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
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">${pass.name}</h3>
            <button class="mode-btn indigo" style="width:auto; padding:8px 15px;" onclick="openEditModal(${idx})">Redigera</button>
        </div>
        <hr>
        ${pass.exercises.map(e => `<div class="edit-item"><span>${e.name}</span><small>${e.target}</small></div>`).join("")}
    `;
}

function openEditModal(pIdx) {
    const pass = programData.routine[pIdx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <div id="edit-ex-list"></div>
        <hr>
        <h4 style="margin-bottom:10px;">Lägg till övning</h4>
        <select id="muscle-group-select" class="log-input" onchange="updateExerciseDropdown()" style="margin-bottom:10px; font-size:14px;">
            <option value="">Välj muskelgrupp...</option>
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <select id="bank-select" class="log-input" disabled style="margin-bottom:10px; font-size:14px;"></select>
        <button id="add-btn-modal" class="mode-btn green" onclick="addFromBank(${pIdx})" disabled>+ Lägg till övning</button>
    `;
    const list = body.querySelector("#edit-ex-list");
    pass.exercises.forEach((ex, i) => {
        const item = document.createElement("div");
        item.className = "edit-item";
        item.innerHTML = `
            <span>${ex.name}</span>
            <div class="order-controls">
                <button class="order-btn" onclick="moveExercise(${pIdx}, ${i}, -1)">↑</button>
                <button class="order-btn" onclick="moveExercise(${pIdx}, ${i}, 1)">↓</button>
                <button class="delete-x-btn" onclick="removeFromPass(${pIdx}, ${i})">✖</button>
            </div>`;
        list.appendChild(item);
    });
    document.getElementById("workout-modal").classList.remove("hidden");
}

function updateExerciseDropdown() {
    const muscle = document.getElementById("muscle-group-select").value;
    const bankSelect = document.getElementById("bank-select");
    const addBtn = document.getElementById("add-btn-modal");
    bankSelect.innerHTML = "";
    if (!muscle) { bankSelect.disabled = true; addBtn.disabled = true; return; }
    
    // Använd armar-logiken för filter
    const filtered = masterExercises.filter(ex => {
        if(muscle === "Biceps" || muscle === "Triceps") return ex.target === muscle;
        return ex.target === muscle;
    });

    filtered.forEach(ex => { bankSelect.innerHTML += `<option value="${ex.name}">${ex.name}</option>`; });
    bankSelect.disabled = false; addBtn.disabled = false;
}

function addFromBank(pIdx) {
    const name = document.getElementById("bank-select").value;
    const exObj = masterExercises.find(m => m.name === name);
    programData.routine[pIdx].exercises.push({ ...exObj });
    saveAll();
    openEditModal(pIdx);
    showProgramDetails(pIdx);
}

function moveExercise(pIdx, exIdx, direction) {
    const exercises = programData.routine[pIdx].exercises;
    const newIdx = exIdx + direction;
    if (newIdx >= 0 && newIdx < exercises.length) {
        const temp = exercises[exIdx];
        exercises[exIdx] = exercises[newIdx];
        exercises[newIdx] = temp;
        saveAll();
        openEditModal(pIdx);
    }
}

function removeFromPass(pIdx, exIdx) {
    programData.routine[pIdx].exercises.splice(exIdx, 1);
    saveAll();
    openEditModal(pIdx);
}

document.getElementById("add-custom-pass-btn").onclick = () => {
    const newChar = String.fromCharCode(65 + programData.routine.length);
    programData.routine.push({ id: `pass-${newChar.toLowerCase()}`, name: `Pass ${newChar}`, exercises: [] });
    saveAll();
    renderProgramView();
};

document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = renderProgramView;
document.getElementById("stats-mode").onclick = () => { showView("stats-view"); renderStats(); };
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }

function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const months = {};
    workoutHistory.forEach(w => {
        const m = w.date.substring(0, 7);
        months[m] = (months[m] || 0) + 1;
    });
    Object.entries(months).forEach(([m, val]) => {
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = Math.min(val * 15, 130) + "px";
        const w = document.createElement("div");
        w.style.flex = "1";
        w.appendChild(bar);
        w.innerHTML += `<div class="chart-label">${m}</div>`;
        container.appendChild(w);
    });
}
