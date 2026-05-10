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

// --- INIT ---
fetch("program.json")
.then(r => r.json())
.then(json => {
    const savedProgram = JSON.parse(localStorage.getItem("myCustomProgram"));
    if (masterExercises.length === 0) {
        json.routine.forEach(p => {
            p.exercises.forEach(ex => {
                if (!masterExercises.find(m => m.name === ex.name)) {
                    masterExercises.push({ ...ex, id: Date.now() + Math.random(), defaultSets: 3 });
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
    const target = document.getElementById(id);
    if(!target) return;
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    target.classList.remove("hidden");
    window.scrollTo(0, 0);
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
    const btn = document.getElementById("timer-toggle-btn");
    if(btn) btn.textContent = "Fortsätt ▶️";
}

document.getElementById("timer-toggle-btn").onclick = () => {
    if (isTimerRunning) pauseTimer();
    else startTimer();
};

// --- ÖVNINGS-BANK LOGIK ---
function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === category));
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    filtered.forEach(ex => {
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.cssText = "padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
        div.innerHTML = `<div><strong style="font-size:16px;">${ex.name}</strong><br><small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:10px;">${ex.target}</small></div>
        <button style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="openEditExerciseModal(${ex.id})">  ⚙️  </button>`;
        results.appendChild(div);
    });
}

function openCreateExerciseModal(callback = null) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Namn (t.ex. Knäböj)">
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option><option value="Bröst">Bröst</option><option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option><option value="Biceps">Biceps</option><option value="Triceps">Triceps</option><option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" id="save-new-ex-btn">Spara Övning</button>
    `;
    document.getElementById("save-new-ex-btn").onclick = () => {
        const name = document.getElementById("new-ex-name").value.trim();
        const target = document.getElementById("new-ex-cat").value;
        if(!name) return alert("Ange ett namn!");
        const newEx = { id: Date.now(), name, target, defaultSets: 3 };
        masterExercises.push(newEx);
        saveAll();
        if(callback) callback(newEx);
        else { closeModal(); filterExercises(currentExerciseCategory); }
    };
    openModal();
}

function openEditExerciseModal(id) {
    const ex = masterExercises.find(e => e.id == id);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
        <select id="edit-ex-cat" class="log-input">
            <option value="Ben" ${ex.target==='Ben'?'selected':''}>Ben</option>
            <option value="Bröst" ${ex.target==='Bröst'?'selected':''}>Bröst</option>
            <option value="Rygg" ${ex.target==='Rygg'?'selected':''}>Rygg</option>
            <option value="Axlar" ${ex.target==='Axlar'?'selected':''}>Axlar</option>
            <option value="Biceps" ${ex.target==='Biceps'?'selected':''}>Biceps</option>
            <option value="Triceps" ${ex.target==='Triceps'?'selected':''}>Triceps</option>
            <option value="Bål" ${ex.target==='Bål'?'selected':''}>Bål</option>
        </select>
        <button class="mode-btn blue" onclick="updateExercise(${id})">Uppdatera</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteMasterExercise(${id})">Radera permanent</button>
    `;
    openModal();
}

function updateExercise(id) {
    const ex = masterExercises.find(e => e.id == id);
    ex.name = document.getElementById("edit-ex-name").value;
    ex.target = document.getElementById("edit-ex-cat").value;
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function deleteMasterExercise(id) {
    if(confirm("Radera permanent?")) {
        masterExercises = masterExercises.filter(e => e.id != id);
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
}

// --- HISTORIK FUNKTIONER ---
function getExerciseHistory(exName) {
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
        const workout = workoutHistory[i];
        const exMatch = workout.exercises.find(e => e.name === exName);
        if (exMatch && exMatch.setsData) return exMatch.setsData;
    }
    return null;
}

// --- AKTIVT PASS LOGIK ---
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    
    let workoutData = data;
    if (!workoutData) {
        workoutData = workout.exercises.map(ex => {
            const history = getExerciseHistory(ex.name);
            if (history) return { setsData: JSON.parse(JSON.stringify(history)) };
            return { setsData: Array.from({length: 3}, () => ({weight: "", reps: ""})) };
        });
    }

    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: workoutData, 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: secondsElapsed,
        isStarted: isImmediateStart || (activeDraft ? activeDraft.isStarted : false)
    };
    renderActiveWorkout();
    updateTimerDisplay();
    if(activeDraft.isStarted) startTimer(); else pauseTimer();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        list.innerHTML = `<button class="mode-btn green" onclick="actuallyStartWorkout()">STARTA 🔥</button>`;
    } else {
        activeDraft.workout.exercises.forEach((ex, exIdx) => {
            const exerciseData = activeDraft.data[exIdx];
            let setsHtml = exerciseData.setsData.map((setData, setIdx) => `
                <div class="set-row">
                    <div class="set-label">${setIdx + 1}</div>
                    <input type="number" class="set-input" placeholder="kg" value="${setData.weight}" onchange="updateSetData(${exIdx}, ${setIdx}, 'weight', this.value)">
                    <input type="number" class="set-input" placeholder="reps" value="${setData.reps}" onchange="updateSetData(${exIdx}, ${setIdx}, 'reps', this.value)">
                    <button class="remove-set-btn" onclick="removeSet(${exIdx}, ${setIdx})">✖</button>
                </div>
            `).join("");

            list.innerHTML += `
                <div class="card glass">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <strong>${ex.name}</strong>
                        <button style="background:none; border:none; color:var(--danger); font-size:12px;" onclick="removeExFromActiveWorkout(${exIdx})">Radera övning</button>
                    </div>
                    <div style="display:grid; grid-template-columns: 35px 1fr 1fr 40px; gap:8px; margin-bottom:5px; font-size:10px; text-transform:uppercase; color:var(--text-light); text-align:center;">
                        <span>Set</span><span>Vikt</span><span>Reps</span><span></span>
                    </div>
                    <div>${setsHtml}</div>
                    <button class="add-set-btn" onclick="addSet(${exIdx})">+ Nytt set</button>
                </div>`;
        });
        list.innerHTML += `<button class="mode-btn glass-border" onclick="openAddExerciseToWorkoutModal()">➕ Lägg till övning</button>`;
    }
    showView("workout-view");
}

function actuallyStartWorkout() {
    activeDraft.isStarted = true;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    startTimer();
}

function updateSetData(exIdx, setIdx, field, value) {
    activeDraft.data[exIdx].setsData[setIdx][field] = value;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function addSet(exIdx) {
    const sets = activeDraft.data[exIdx].setsData;
    const lastSet = sets[sets.length - 1];
    sets.push({ weight: lastSet ? lastSet.weight : "", reps: lastSet ? lastSet.reps : "" });
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
}

function removeSet(exIdx, setIdx) {
    activeDraft.data[exIdx].setsData.splice(setIdx, 1);
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
}

function removeExFromActiveWorkout(idx) {
    if(confirm("Ta bort övningen från passet?")) {
        activeDraft.workout.exercises.splice(idx, 1);
        activeDraft.data.splice(idx, 1);
        localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
        renderActiveWorkout();
    }
}

function openAddExerciseToWorkoutModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>Lägg till övning</h3>
    <input type="text" id="search-ex-active" class="log-input" placeholder="Sök övning..." oninput="searchInActiveWorkout(this.value)">
    <div id="active-search-results" style="max-height:300px; overflow-y:auto; margin-top:15px;"></div>
    <button class="mode-btn blue" style="margin-top:20px;" onclick="openCreateExerciseModal(addNewExToActiveWorkout)">+ Skapa helt ny övning</button>`;
    searchInActiveWorkout("");
    openModal();
}

function searchInActiveWorkout(q) {
    const res = document.getElementById("active-search-results");
    res.innerHTML = "";
    masterExercises.filter(ex => ex.name.toLowerCase().includes(q.toLowerCase())).forEach(ex => {
        const d = document.createElement("div");
        d.className = "edit-item-row";
        d.innerHTML = `<span>${ex.name}</span><button onclick="addNewExToActiveWorkout(${JSON.stringify(ex).replace(/"/g, '&quot;')})">➕</button>`;
        res.appendChild(d);
    });
}

function addNewExToActiveWorkout(ex) {
    activeDraft.workout.exercises.push(ex);
    const history = getExerciseHistory(ex.name);
    activeDraft.data.push({ setsData: history ? JSON.parse(JSON.stringify(history)) : [{weight:"", reps:""}, {weight:"", reps:""}, {weight:"", reps:""}] });
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    closeModal();
    renderActiveWorkout();
}

function pauseAndSaveDraft() {
    pauseTimer();
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    location.reload();
}

document.getElementById("save-workout-btn").onclick = () => {
    if(!activeDraft.isStarted) { localStorage.removeItem("activeWorkoutDraft"); location.reload(); return; }
    pauseTimer();
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: document.getElementById("workout-timer").textContent,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name,
            setsData: activeDraft.data[i].setsData
        }))
    };
    workoutHistory.push(log);
    saveAll();
    localStorage.removeItem("activeWorkoutDraft");
    location.reload();
};

// --- KALENDER LOGIK ---
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
        const isOngoing = activeDraft && activeDraft.date === dateStr && activeDraft.isStarted;
        const dayOfWeek = new Date(year, month, d).getDay();
        const isAutoDay = [1, 3, 5].includes(dayOfWeek);
        const override = calendarOverrides[dateStr];
        let displayPass = null;
        if (override && override !== "none") displayPass = programData.routine.find(p => p.id === override);
        else if (isAutoDay && override !== "none") displayPass = programData.routine[d % programData.routine.length];
        
        let info = "";
        if (hasWorkouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = "⏱️"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
        cell.innerHTML = `<span>${d}</span><span>${info}</span>`;
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
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div><strong>${w.programName}</strong><br><small>${w.totalTime}</small></div>
                    <button style="background:none; border:none; color:var(--danger);" onclick="deleteLoggedWorkout('${dateStr}', ${idx})">✖</button>
                </div>
            </div>`;
        });
        html += `<button class="mode-btn blue" style="margin-top:10px;" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')">Logga ett till pass ➕</button>`;
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p>Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name}</button>`;
        html += `<button class="mode-btn glass-border" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')">Fritt Pass ➕</button>`;
    }
    body.innerHTML = html;
    openModal();
}

function deleteLoggedWorkout(date, idx) {
    if(confirm("Radera detta träningspass från historiken?")) {
        const fullIdx = workoutHistory.findIndex(w => w.date === date); // Förenklad logik för demo
        workoutHistory.splice(fullIdx + idx, 1);
        saveAll();
        renderCalendar();
        closeModal();
    }
}

function startFreeWorkoutOnDate(date) {
    const freePass = { id: "free-" + Date.now(), name: "Fritt Pass", exercises: [] };
    startWorkout(freePass, null, date, false);
}

// --- PROGRAM LOGIK ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `<h4>${pass.name}</h4>`;
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
    list.innerHTML = `<h3>${pass.name}</h3>
    <button class="mode-btn blue" onclick="openEditProgramModal(${idx})">Redigera Program</button>
    ${pass.exercises.map(e => `<div style="padding:10px 0; border-bottom:1px solid var(--glass-border);">${e.name}</div>`).join("")}`;
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>Redigera ${pass.name}</h3>
    <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
    <div id="edit-pass-exercises" style="margin-bottom:20px;">
        ${pass.exercises.map((ex, i) => `
            <div class="edit-item-row">
                <span>${ex.name}</span>
                <button onclick="removeExFromProgram(${idx}, ${i})">✖</button>
            </div>
        `).join("")}
    </div>
    <select id="add-ex-prog-select" class="log-input">
        <option value="">-- Lägg till övning --</option>
        ${masterExercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join("")}
    </select>
    <button class="mode-btn green" style="margin-top:10px;" onclick="addExToProgram(${idx})">Lägg till övning</button>
    <button class="mode-btn blue" style="margin-top:20px;" onclick="saveProgramEdit(${idx})">Spara Ändringar</button>`;
    openModal();
}

function addExToProgram(idx) {
    const select = document.getElementById("add-ex-prog-select");
    const exId = select.value;
    if(!exId) return;
    const ex = masterExercises.find(e => e.id == exId);
    programData.routine[idx].exercises.push(ex);
    openEditProgramModal(idx);
}

function removeExFromProgram(progIdx, exIdx) {
    programData.routine[progIdx].exercises.splice(exIdx, 1);
    openEditProgramModal(progIdx);
}

function saveProgramEdit(idx) {
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll(); closeModal(); renderProgramView(idx);
}

// --- STATS & NAV ---
function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const months = {};
    workoutHistory.forEach(w => { const m = w.date.substring(0, 7); months[m] = (months[m] || 0) + 1; });
    Object.entries(months).sort().forEach(([m, val]) => {
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = (val * 20) + "px";
        container.appendChild(bar);
    });
    showView("stats-view");
}

document.getElementById("global-home").onclick = () => { pauseTimer(); location.reload(); }
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("stats-mode").onclick = renderStats;

function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
}

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date, false); }
