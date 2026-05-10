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

// Hjälpfunktion för ikoner
function getPassIcon(name) {
    const lower = name.toLowerCase();
    if (lower.includes("ben")) return "🦵";
    if (lower.includes("bröst") || lower.includes("push")) return "🏋️";
    if (lower.includes("rygg") || lower.includes("pull")) return "🪵";
    if (lower.includes("axlar")) return "👐";
    if (lower.includes("armar") || lower.includes("biceps")) return "💪";
    if (lower.includes("mage") || lower.includes("bål")) return "🧘";
    return "🔥";
}

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

function showView(id, skipScroll = false) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    if(!skipScroll) window.scrollTo(0, 0);
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }

// --- TIMER ---
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
        if(activeDraft) {
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
    if (isTimerRunning) pauseTimer(); else startTimer();
};

// --- ÖVNINGS-HANTERING ---
function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Namn">
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option><option value="Bröst">Bröst</option><option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option><option value="Armar">Armar</option><option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewMasterExercise()">Spara</button>
    `;
    openModal();
}

function saveNewMasterExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-cat").value;
    if(!name) return;
    masterExercises.push({ id: Date.now(), name, target });
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === category));
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    masterExercises.filter(ex => ex.target === category).forEach(ex => {
        results.innerHTML += `
            <div class="card glass" style="padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <strong>${ex.name}</strong>
                <button onclick="openEditExerciseModal(${ex.id})" style="background:none; border:none; font-size:18px;">⚙️</button>
            </div>`;
    });
}

function openEditExerciseModal(id) {
    const ex = masterExercises.find(e => e.id == id);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
        <button class="mode-btn blue" onclick="updateMasterEx(${id})">Uppdatera</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteMasterEx(${id})">Radera permanent</button>
    `;
    openModal();
}

function updateMasterEx(id) {
    masterExercises.find(e => e.id == id).name = document.getElementById("edit-ex-name").value;
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function deleteMasterEx(id) {
    if(confirm("Radera övningen permanent?")) {
        masterExercises = masterExercises.filter(e => e.id != id);
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
}

// --- PROGRAM-HANTERING ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `
            <span class="prog-icon">${getPassIcon(pass.name)}</span>
            <h4>${pass.name}</h4>
            <small>${pass.exercises.length} övningar</small>
        `;
        div.onclick = () => showProgramDetails(i);
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
            <h3 style="margin:0;">${pass.name}</h3>
            <button class="mode-btn blue" style="width:auto; padding:8px 15px; font-size:12px; margin:0;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `<div style="padding:12px 0; border-bottom:1px solid var(--glass-border); font-size:14px;">${e.name}</div>`).join("")}
    `;
    list.scrollIntoView({ behavior: 'smooth' });
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `
                <div class="edit-item-row">
                    <span>${ex.name}</span>
                    <button onclick="removeExFromPass(${idx}, ${i})" style="background:none; border:none; color:var(--danger);">✖</button>
                </div>
            `).join("")}
        </div>
        <select id="add-ex-to-pass" class="log-input" style="margin-top:15px;">
            <option value="">Lägg till övning...</option>
            ${masterExercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join("")}
        </select>
        <button class="mode-btn blue" onclick="saveProgramEdits(${idx})">Spara ändringar</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deletePass(${idx})">Radera pass</button>
    `;
    document.getElementById("add-ex-to-pass").onchange = (e) => {
        if(!e.target.value) return;
        const ex = masterExercises.find(mx => mx.id == e.target.value);
        programData.routine[idx].exercises.push({ name: ex.name, target: ex.target });
        openEditProgramModal(idx);
    };
    openModal();
}

function saveProgramEdits(idx) {
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll(); closeModal(); renderProgramView(idx); showProgramDetails(idx);
}

function removeExFromPass(pIdx, eIdx) {
    programData.routine[pIdx].exercises.splice(eIdx, 1);
    openEditProgramModal(pIdx);
}

function deletePass(idx) {
    if(confirm("Radera hela passet?")) {
        programData.routine.splice(idx, 1);
        saveAll(); closeModal(); renderProgramView();
    }
}

document.getElementById("add-custom-pass-btn").onclick = () => {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Nytt Pass</h3>
        <input type="text" id="new-pass-name" class="log-input" placeholder="Namn (t.ex. Ben & Mage)">
        <button class="mode-btn blue" onclick="createNewPass()">Skapa</button>
    `;
    openModal();
};

function createNewPass() {
    const name = document.getElementById("new-pass-name").value.trim();
    if(!name) return;
    programData.routine.push({ id: Date.now(), name, exercises: [] });
    saveAll(); closeModal(); renderProgramView();
}

// --- AKTIVT PASS ---
function getExerciseHistory(name) {
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
        const exMatch = workoutHistory[i].exercises.find(e => e.name === name);
        if (exMatch) return exMatch.sets_data;
    }
    return null;
}

function startWorkout(workout, data = null, date = null) {
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    if(!data) {
        data = workout.exercises.map(ex => {
            const hist = getExerciseHistory(ex.name);
            return { completed: false, sets_data: hist ? JSON.parse(JSON.stringify(hist)) : [{weight:"", reps:""}, {weight:"", reps:""}, {weight:"", reps:""}] };
        });
    }
    activeDraft = { workout: JSON.parse(JSON.stringify(workout)), data, date: date || new Date().toISOString().split('T')[0], secondsElapsed, isStarted: activeDraft ? activeDraft.isStarted : false };
    renderActiveWorkout();
    updateTimerDisplay();
    if(activeDraft.isStarted) startTimer();
}

function renderActiveWorkout(skipScroll = false) {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
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
            <div style="display:grid; grid-template-columns: 35px 1fr 1fr 30px; gap:8px; margin: 10px 0 5px; opacity:0.5; font-size:9px; text-align:center;">
                <span>SET</span><span>KG</span><span>REPS</span><span></span>
            </div>
        `;

        exerciseData.sets_data.forEach((set, sIdx) => {
            setsHtml += `
            <div style="display:grid; grid-template-columns: 35px 1fr 1fr 30px; gap:8px; margin-bottom:8px; align-items:center;">
                <span style="font-size:12px; font-weight:800; color:var(--primary)">#${sIdx + 1}</span>
                <input type="number" class="log-input" style="margin:0; padding:8px;" value="${set.weight}" onchange="updateSetData(${i}, ${sIdx}, this.value, 'w')">
                <input type="number" class="log-input" style="margin:0; padding:8px;" value="${set.reps}" onchange="updateSetData(${i}, ${sIdx}, this.value, 'r')">
                <button onclick="removeSetFromExercise(${i}, ${sIdx})" style="background:none; border:none; color:var(--danger);">×</button>
            </div>`;
        });

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="${isDone ? 'text-decoration:line-through; opacity:0.5;' : ''}">${ex.name}</strong>
                <button onclick="removeActiveExercise(${i})" style="color:var(--danger); background:none; border:none;">✖</button>
            </div>
            ${setsHtml}
            <button class="mode-btn glass-border" style="padding:8px; font-size:11px; border-style:dashed;" onclick="addSetToExercise(${i})">+ Lägg till set</button>
            
            <button class="done-toggle-btn ${isDone ? 'is-completed' : ''}" onclick="toggleExerciseDone(${i})">
                ${isDone ? 'KLAR ✓' : 'MARKERA SOM KLAR'}
            </button>
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
    if(type === 'w') activeDraft.data[exIdx].sets_data[setIdx].weight = val; 
    else activeDraft.data[exIdx].sets_data[setIdx].reps = val; 
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft)); 
}

function addSetToExercise(exIdx) { 
    const sets = activeDraft.data[exIdx].sets_data;
    const last = sets[sets.length-1]; 
    sets.push({ weight: last ? last.weight : "", reps: last ? last.reps : "" }); 
    renderActiveWorkout(true); 
}

function removeSetFromExercise(exIdx, sIdx) { 
    activeDraft.data[exIdx].sets_data.splice(sIdx, 1); 
    renderActiveWorkout(true); 
}

function removeActiveExercise(i) { 
    if(confirm("Ta bort övningen från passet?")) {
        activeDraft.workout.exercises.splice(i, 1); 
        activeDraft.data.splice(i, 1); 
        renderActiveWorkout(true); 
    }
}

function openAddExerciseToWorkoutModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Välj Övning</h3>
        <div style="max-height:300px; overflow-y:auto;">
            ${masterExercises.map(ex => `
                <div class="card glass" style="padding:12px; margin-bottom:8px; cursor:pointer;" onclick="addExToActive(${ex.id})">
                    ${ex.name} <small style="color:var(--primary)">(${ex.target})</small>
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
        sets_data: hist ? JSON.parse(JSON.stringify(hist)) : [{weight:"", reps:""}, {weight:"", reps:""}, {weight:"", reps:""}] 
    });
    closeModal(); renderActiveWorkout(true);
}

// --- KALENDER ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' }).toUpperCase();
    
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        
        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr && activeDraft.isStarted;
        
        if (hasWorkouts.length > 0) cell.classList.add("cell-completed");
        else if (isOngoing) cell.classList.add("cell-ongoing");
        
        cell.innerHTML = `<span>${d}</span>`;
        cell.onclick = () => openDayManager(dateStr, hasWorkouts, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;
    if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p style="margin-bottom:15px; font-size:14px; opacity:0.7;">Välj pass för denna dag:</p>`;
        programData.routine.forEach(p => {
            html += `<button class="mode-btn blue" onclick="closeModal(); startWorkout(${JSON.stringify(p).replace(/"/g, '&quot;')}, null, '${dateStr}')">${p.name}</button>`;
        });
        html += `<button class="mode-btn glass-border" onclick="closeModal(); startWorkout({name:'Fritt Pass', exercises:[]}, null, '${dateStr}')">Starta Fritt Pass</button>`;
    }
    body.innerHTML = html; openModal();
}

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }

// --- STATS ---
function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const counts = {}; 
    workoutHistory.forEach(w => { const m = w.date.substring(0, 7); counts[m] = (counts[m] || 0) + 1; });
    
    Object.entries(counts).sort().forEach(([m, val]) => {
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = (val * 15) + "px";
        bar.style.width = "35px";
        bar.style.background = "var(--primary)";
        bar.style.borderRadius = "6px";
        container.appendChild(bar);
    });
    showView("stats-view");
}

// --- GLOBAL NAVIGATION ---
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("stats-mode").onclick = renderStats;

function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
}

document.getElementById("save-workout-btn").onclick = () => {
    if(!confirm("Vill du avsluta och spara passet?")) return;
    const log = { 
        date: activeDraft.date, 
        programName: activeDraft.workout.name, 
        totalTime: document.getElementById("workout-timer").textContent,
        exercises: activeDraft.data.map((d, i) => ({ 
            name: activeDraft.workout.exercises[i].name, 
            sets_data: d.sets_data 
        })) 
    };
    workoutHistory.push(log); 
    saveAll(); 
    localStorage.removeItem("activeWorkoutDraft"); 
    activeDraft = null; 
    location.reload();
};

document.getElementById("pause-workout-btn").onclick = () => {
    saveAll();
    location.reload();
};
