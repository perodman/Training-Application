let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;

// --- INITIALISERING ---
fetch("program.json")
    .then(r => r.json())
    .then(json => {
        const savedProgram = JSON.parse(localStorage.getItem("myCustomProgram"));
        // Om master-listan är tom, fyll på från JSON
        if (masterExercises.length === 0) {
            json.routine.forEach(p => {
                p.exercises.forEach(ex => {
                    if (!masterExercises.find(m => m.name === ex.name)) {
                        masterExercises.push({ 
                            ...ex, 
                            id: Date.now() + Math.random() 
                        });
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

function showView(id, skipScroll = false) {
    const target = document.getElementById(id);
    if (!target) return;
    
    if (target.classList.contains("hidden")) {
        document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
        target.classList.remove("hidden");
    }
    
    if (!skipScroll) {
        window.scrollTo(0, 0);
    }
}

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
}

function openModal() {
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- TIMER LOGIK ---
function updateTimerDisplay() {
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById("workout-timer").textContent = `${hrs}:${mins}:${secs}`;
}

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    document.getElementById("timer-toggle-btn").textContent = "Pausa ⏸️";
    
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDisplay();
        if (activeDraft) {
            activeDraft.secondsElapsed = secondsElapsed;
            localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
        }
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    document.getElementById("timer-toggle-btn").textContent = "Fortsätt ▶️";
}

document.getElementById("timer-toggle-btn").onclick = () => {
    if (isTimerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
};

// --- HANTERA ÖVNINGAR (MASTER LISTA) ---
function openCreateExerciseModal(callback = null) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Övningens namn">
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" id="save-new-ex-btn">Spara Övning</button>
    `;
    
    document.getElementById("save-new-ex-btn").onclick = () => {
        const name = document.getElementById("new-ex-name").value.trim();
        const target = document.getElementById("new-ex-cat").value;
        
        if (!name) return alert("Ange namn!");
        
        const newEx = { id: Date.now(), name, target };
        masterExercises.push(newEx);
        saveAll();
        
        if (callback) {
            callback(newEx);
        } else {
            closeModal();
            filterExercises(currentExerciseCategory);
        }
    };
    openModal();
}

function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.cat === category);
    });
    
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    
    const filtered = masterExercises.filter(ex => {
        if (category === "Armar") {
            return ex.target === "Biceps" || ex.target === "Triceps";
        }
        return ex.target === category;
    });
    
    filtered.forEach(ex => {
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.cssText = "padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
        div.innerHTML = `
            <div>
                <strong>${ex.name}</strong><br>
                <small style="color:var(--primary); font-size:10px;">${ex.target}</small>
            </div>
            <button style="background:none; border:none; font-size:18px;" onclick="openEditExerciseModal(${ex.id})">⚙️</button>
        `;
        results.appendChild(div);
    });
}

function openEditExerciseModal(id) {
    const ex = masterExercises.find(e => e.id == id);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
        <button class="mode-btn blue" onclick="updateExercise(${id})">Uppdatera</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteMasterExercise(${id})">Radera permanent</button>
    `;
    openModal();
}

function updateExercise(id) {
    const ex = masterExercises.find(e => e.id == id);
    ex.name = document.getElementById("edit-ex-name").value;
    saveAll();
    closeModal();
    filterExercises(currentExerciseCategory);
}

function deleteMasterExercise(id) {
    if (confirm("Vill du radera denna övning permanent från biblioteket?")) {
        masterExercises = masterExercises.filter(e => e.id != id);
        saveAll();
        closeModal();
        filterExercises(currentExerciseCategory);
    }
}

// --- KALENDER-VY ---
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
    
    for (let i = 0; i < offset; i++) {
        grid.innerHTML += `<div></div>`;
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        
        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr && activeDraft.isStarted;
        
        const dayOfWeek = new Date(year, month, d).getDay();
        const override = calendarOverrides[dateStr];
        
        let displayPass = null;
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if ([1, 3, 5].includes(dayOfWeek) && override !== "none") {
            displayPass = programData.routine[d % programData.routine.length];
        }
        
        if (hasWorkouts.length > 0) {
            cell.classList.add("cell-completed");
        } else if (isOngoing) {
            cell.classList.add("cell-ongoing");
        } else if (displayPass) {
            cell.classList.add("cell-planned");
        }
        
        cell.innerHTML = `
            <span>${d}</span>
            <span>${hasWorkouts.length ? '✓' : (isOngoing ? '⏱️' : (displayPass ? displayPass.name.split(" ").pop() : ''))}</span>
        `;
        
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
                <div class="card glass" style="text-align:left; border-left:4px solid var(--success); margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong style="display:block;">${w.programName}</strong>
                            <small style="color:var(--text-light);">${w.totalTime || ''}</small>
                        </div>
                        <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); font-size:20px;">&times;</button>
                    </div>
                </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p style="margin-bottom:20px; opacity:0.7;">Planerat: ${planned ? planned.name : 'Vila'}</p>`;
        if (planned) {
            html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name}</button>`;
        }
        html += `<button class="mode-btn glass-border" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')">Starta Fritt Pass</button>`;
    }
    
    body.innerHTML = html;
    openModal();
}

function startFreeWorkoutOnDate(date) {
    startWorkout({ id: "free-" + Date.now(), name: "Fritt Pass", exercises: [] }, null, date, false);
}

function changeMonth(off) {
    currentViewDate.setMonth(currentViewDate.getMonth() + off);
    renderCalendar();
}

function prepareStart(date, id) {
    const p = programData.routine.find(x => x.id === id);
    closeModal();
    startWorkout(p, null, date, false);
}

// --- TRÄNINGSPROGRAM-VY (ÅTERSTÄLLD DESIGN) ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        // Här sätts den aktiva klassen för den blå ramen
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 8px;">📋</div>
            <h4>${pass.name}</h4>
            <small style="opacity:0.7; font-size:10px;">${pass.exercises.length} ÖVNINGAR</small>
        `;
        div.onclick = () => { 
            renderProgramView(i); 
            showProgramDetails(i); 
        };
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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="margin:0; font-family:'Montserrat'; font-weight:900; text-transform:uppercase;">${pass.name}</h3>
            <button class="mode-btn blue" style="width:auto; padding:8px 15px; margin:0; font-size:12px;" onclick="openEditProgramModal(${idx})">REDIGERA</button>
        </div>
        <div class="glass-modern">
            ${pass.exercises.map(e => `
                <div style="padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:600;">${e.name}</span>
                    <small style="color:var(--primary); font-weight:700; font-size:10px; text-transform:uppercase;">${e.target}</small>
                </div>
            `).join("")}
        </div>
        <button class="mode-btn green" style="margin-top:25px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);" onclick="prepareStart('${new Date().toISOString().split('T')[0]}', '${pass.id}')">STARTA DETTA PASS 🔥</button>
    `;
    
    detailsArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div id="edit-pass-exercises" style="margin-bottom:15px;">
            ${pass.exercises.map((ex, i) => `
                <div class="edit-item-row">
                    <span>${ex.name}</span>
                    <button onclick="removeExFromPass(${idx}, ${i})" style="background:none; border:none; color:var(--danger);">✕</button>
                </div>
            `).join("")}
        </div>
        <select id="add-ex-select" class="log-input">
            <option value="">Lägg till övning...</option>
            ${masterExercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join("")}
        </select>
        <button class="mode-btn glass-border" onclick="addExerciseToPass(${idx})">+ Lägg till i passet</button>
        <button class="mode-btn blue" onclick="saveProgramEdit(${idx})" style="margin-top:10px;">Spara Ändringar</button>
    `;
    openModal();
}

function addExerciseToPass(pIdx) {
    const exId = document.getElementById("add-ex-select").value;
    if (!exId) return;
    const ex = masterExercises.find(e => e.id == exId);
    programData.routine[pIdx].exercises.push({ name: ex.name, target: ex.target });
    saveAll();
    openEditProgramModal(pIdx);
}

function removeExFromPass(pIdx, eIdx) {
    programData.routine[pIdx].exercises.splice(eIdx, 1);
    saveAll();
    openEditProgramModal(pIdx);
}

function saveProgramEdit(idx) {
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll();
    closeModal();
    renderProgramView(idx);
    showProgramDetails(idx);
}

// --- AKTIVT TRÄNINGSPASS ---
function getExerciseHistory(name) {
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
        const exMatch = workoutHistory[i].exercises.find(e => e.name === name);
        if (exMatch && exMatch.sets_data) {
            return exMatch.sets_data;
        }
    }
    return null;
}

function startWorkout(workout, data = null, date = null, isStarted = null) {
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    
    if (!data) {
        data = workout.exercises.map(ex => {
            const hist = getExerciseHistory(ex.name);
            return { 
                completed: false, 
                sets_data: hist ? JSON.parse(JSON.stringify(hist)) : Array(3).fill({ weight: "", reps: "" }) 
            };
        });
    }
    
    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data, 
        date: date || new Date().toISOString().split('T')[0], 
        secondsElapsed, 
        isStarted: isStarted !== null ? isStarted : (activeDraft ? activeDraft.isStarted : false)
    };
    
    renderActiveWorkout();
    updateTimerDisplay();
    
    if (activeDraft.isStarted) {
        startTimer();
    } else {
        pauseTimer();
    }
}

function renderActiveWorkout(skipScroll = false) {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    
    if (!activeDraft.isStarted) {
        list.innerHTML = `<button class="mode-btn green" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>`;
        showView("workout-view", skipScroll);
        return;
    }
    
    activeDraft.workout.exercises.forEach((ex, i) => {
        const exerciseData = activeDraft.data[i];
        const isDone = exerciseData.completed;
        const div = document.createElement("div");
        div.className = `card glass ${isDone ? 'exercise-done-card' : ''}`;
        
        let setsHtml = `
            <div style="margin-top:10px;">
                <div style="display:grid; grid-template-columns: 35px 1fr 1fr 30px; gap:8px; margin-bottom:5px; opacity:0.5;">
                    <span></span><small style="text-align:center; font-size:9px;">KG</small><small style="text-align:center; font-size:9px;">REPS</small><span></span>
                </div>
        `;
        
        exerciseData.sets_data.forEach((set, sIdx) => {
            setsHtml += `
                <div style="display:grid; grid-template-columns: 35px 1fr 1fr 30px; gap:8px; margin-bottom:8px; align-items:center;">
                    <span style="font-size:12px; font-weight:800; color:var(--primary)">#${sIdx + 1}</span>
                    <input type="number" class="log-input" style="margin:0; padding:8px;" value="${set.weight}" onchange="updateSetData(${i}, ${sIdx}, this.value, 'w')">
                    <input type="number" class="log-input" style="margin:0; padding:8px;" value="${set.reps}" onchange="updateSetData(${i}, ${sIdx}, this.value, 'r')">
                    <button onclick="removeSetFromExercise(${i}, ${sIdx})" style="background:none; border:none; color:var(--danger); font-size:16px;">×</button>
                </div>`;
        });
        
        setsHtml += `
                <button class="mode-btn glass-border" style="padding:8px; font-size:11px; border-style:dashed;" onclick="addSetToExercise(${i})">+ Lägg till set</button>
                <button class="done-toggle-btn ${isDone ? 'is-completed' : ''}" onclick="toggleExerciseDone(${i})">
                    ${isDone ? '<span>KLAR ✓</span>' : '<span>MARKERA SOM KLAR</span>'}
                </button>
            </div>
        `;
        
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="${isDone ? 'text-decoration:line-through; opacity:0.5;' : ''}">${ex.name}</strong>
                <button onclick="removeActiveExercise(${i})" style="color:var(--danger); background:none; border:none; font-size:18px;">✖</button>
            </div>
            ${setsHtml}
        `;
        list.appendChild(div);
    });
    
    const addBtn = document.createElement("button");
    addBtn.className = "mode-btn glass-border";
    addBtn.innerHTML = "➕ Lägg till övning";
    addBtn.onclick = openAddExerciseToWorkoutModal;
    list.appendChild(addBtn);
    
    showView("workout-view", skipScroll);
}

function actuallyStartWorkout() {
    activeDraft.isStarted = true;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    startTimer();
}

function toggleExerciseDone(i) {
    activeDraft.data[i].completed = !activeDraft.data[i].completed;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout(true);
}

function updateSetData(exIdx, setIdx, val, type) {
    if (type === 'w') activeDraft.data[exIdx].sets_data[setIdx].weight = val;
    else activeDraft.data[exIdx].sets_data[setIdx].reps = val;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function addSetToExercise(exIdx) {
    const sets = activeDraft.data[exIdx].sets_data;
    const last = sets[sets.length - 1];
    sets.push({ weight: last ? last.weight : "", reps: last ? last.reps : "" });
    renderActiveWorkout(true);
}

function removeSetFromExercise(exIdx, sIdx) {
    activeDraft.data[exIdx].sets_data.splice(sIdx, 1);
    renderActiveWorkout(true);
}

function removeActiveExercise(i) {
    if (confirm("Ta bort övningen från passet?")) {
        activeDraft.workout.exercises.splice(i, 1);
        activeDraft.data.splice(i, 1);
        renderActiveWorkout(true);
    }
}

function openAddExerciseToWorkoutModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Välj Övning</h3>
        <div style="max-height:300px; overflow-y:auto; text-align:left;">
            ${masterExercises.map(ex => `
                <div class="card glass" style="padding:15px; margin-bottom:8px; cursor:pointer;" onclick="addExToActive(${ex.id})">
                    <strong>${ex.name}</strong><br>
                    <small style="color:var(--primary);">${ex.target}</small>
                </div>
            `).join("")}
        </div>
    `;
    openModal();
}

function addExToActive(id) {
    const ex = masterExercises.find(e => e.id == id);
    activeDraft.workout.exercises.push({ name: ex.name, target: ex.target });
    const hist = getExerciseHistory(ex.name);
    activeDraft.data.push({ 
        completed: false, 
        sets_data: hist ? JSON.parse(JSON.stringify(hist)) : Array(3).fill({ weight: "", reps: "" }) 
    });
    closeModal();
    renderActiveWorkout(true);
}

// --- NAVIGATION & ÖVRIGT ---
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { 
    showView("exercises-view"); 
    filterExercises(currentExerciseCategory); 
};
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("stats-mode").onclick = renderStats;
document.getElementById("start-new-btn").onclick = renderCalendar;

function renderHome() {
    showView("home-view");
    if (activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => {
            startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
        };
    }
}

document.getElementById("save-workout-btn").onclick = () => {
    if (!confirm("Vill du avsluta och spara passet?")) return;
    pauseTimer();
    const log = { 
        date: activeDraft.date, 
        programName: activeDraft.workout.name, 
        totalTime: document.getElementById("workout-timer").textContent, 
        exercises: activeDraft.workout.exercises.map((ex, i) => ({ 
            name: ex.name, 
            sets_data: activeDraft.data[i].sets_data 
        })) 
    };
    workoutHistory.push(log);
    saveAll();
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    renderCalendar();
};

document.getElementById("pause-workout-btn").onclick = () => location.reload();

function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const months = {};
    workoutHistory.forEach(w => {
        const m = w.date.substring(0, 7);
        months[m] = (months[m] || 0) + 1;
    });
    
    Object.entries(months).sort().forEach(([m, val]) => {
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = (val * 20) + "px";
        // Enkel tooltip-effekt
        bar.title = `${m}: ${val} pass`;
        container.appendChild(bar);
    });
    showView("stats-view");
}

function deleteLoggedWorkout(date, idx) {
    if (confirm("Radera detta loggade pass?")) {
        const dayWorkouts = workoutHistory.filter(w => w.date === date);
        const itemToDelete = dayWorkouts[idx];
        workoutHistory = workoutHistory.filter(w => w !== itemToDelete);
        saveAll();
        renderCalendar();
        closeModal();
    }
}
