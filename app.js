let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

// Timer-variabler
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

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
}

function openModal() {
    document.getElementById("workout-modal").classList.remove("hidden");
}

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
    if (isTimerRunning) pauseTimer();
    else startTimer();
};

// --- KALENDER (UPPDATERAD DESIGN) ---
function renderCalendar() {
    const container = document.getElementById("calendar-view");
    container.innerHTML = ""; // Rensa allt för att bygga upp strukturen rätt

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthText = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    const formattedMonth = monthText.charAt(0).toUpperCase() + monthText.slice(1);

    // 1. Skapa Header med pilarna på samma rad
    const header = document.createElement("div");
    header.className = "calendar-header";
    header.innerHTML = `
        <button onclick="changeMonth(-1)"> ❮ </button>
        <h2 id="month-label">${formattedMonth}</h2>
        <button onclick="changeMonth(1)"> ❯ </button>
    `;
    container.appendChild(header);

    // 2. Skapa Veckodags-raden
    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "calendar-weekdays";
    ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].forEach(day => {
        weekdaysRow.innerHTML += `<div>${day}</div>`;
    });
    container.appendChild(weekdaysRow);

    // 3. Skapa själva Grid-nätet
    const grid = document.createElement("div");
    grid.id = "calendar-grid";
    grid.className = "calendar-grid";
    container.appendChild(grid);

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div class="calendar-cell empty"></div>`;
    
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
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            displayPass = programData.routine[d % programData.routine.length];
        }
        
        let info = "";
        if (hasWorkouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = "⏱️"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
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
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${w.programName}</strong>
                    <div style="font-size:10px; color:var(--text-light)">⏱️ ${w.totalTime || ""}</div>
                    <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer;"> ✖ </button>
                </div>`;
            w.exercises.forEach(ex => {
                html += `<div style="font-size:11px; margin-top:5px; color:var(--text-light)">${ex.name}: ${ex.weight}kg x ${ex.reps} x ${ex.sets}</div>`;
            });
            html += `</div>`;
        });
    } else {
        html += `<p style="text-align:center;">Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name} 🔥</button>`;
        html += `<button class="mode-btn glass-border" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')">Starta Fritt Pass ➕</button>`;
        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Ändra planering:</p>`;
        
        // Snyggare rullista för att välja pass
        html += `<select id="override-select" class="log-input" onchange="setOverride('${dateStr}', this.value)">
            <option value="">Byt pass för denna dag...</option>
            ${programData.routine.map(p => `<option value="${p.id}">${p.name}</option>`).join("")}
            <option value="none">Vila</option>
        </select>`;
    }
    body.innerHTML = html;
    openModal();
}

// --- ÖVNINGS-VY (FIXAD DESIGN) ---
function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.cat === category);
    });

    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    
    const filtered = masterExercises.filter(ex => 
        category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category
    );

    if(filtered.length === 0) {
        results.innerHTML = `<p style="text-align:center; color:var(--text-light); margin-top:20px;">Inga övningar i denna kategori.</p>`;
    }

    filtered.forEach(ex => {
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.cssText = "padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
        div.innerHTML = `
            <div>
                <strong style="font-size:16px;">${ex.name}</strong><br>
                <small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:10px;">${ex.target}</small>
            </div>
            <button class="circle-ctrl" style="width:35px; height:35px; font-size:14px;" onclick="openEditExerciseModal(${ex.id})"> ⚙️ </button>
        `;
        results.appendChild(div);
    });
}

function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Namn på övning">
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" id="save-new-ex-btn">Spara i banken</button>
    `;
    
    document.getElementById("save-new-ex-btn").onclick = () => {
        const name = document.getElementById("new-ex-name").value.trim();
        const target = document.getElementById("new-ex-cat").value;
        if(!name) return;
        masterExercises.push({ id: Date.now(), name, target });
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
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

// --- PROGRAMHANTERING ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `<h4>${pass.name}</h4><small>${pass.exercises.length} övningar</small>`;
        div.onclick = () => { showProgramDetails(i); };
        selector.appendChild(div);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    const area = document.getElementById("program-details-area");
    const list = document.getElementById("program-exercise-list");
    area.classList.remove("hidden");
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <h3>${pass.name}</h3>
            <button class="mode-btn blue" style="width:auto; padding:5px 15px;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `<div class="card glass" style="margin-bottom:5px; padding:10px;">${e.name}</div>`).join("")}
    `;
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `<div class="card glass" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${ex.name}</span><button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none;">✖</button></div>`).join("")}
        </div>
        <select id="add-ex-select" class="log-input" onchange="addExToPass(${idx}, this.value)">
            <option value="">+ Lägg till övning...</option>
            ${masterExercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join("")}
        </select>
        <button class="mode-btn blue" onclick="saveProgramEdit(${idx})">Spara program</button>
    `;
    openModal();
}

// --- TRÄNINGS-FLÖDE ---
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: data || workout.exercises.map(()=>({weight:"", reps:"", sets:3})), 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0,
        isStarted: isImmediateStart
    };
    renderActiveWorkout();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        list.innerHTML = `<button class="mode-btn green" style="padding:30px;" onclick="actuallyStartWorkout()">STARTA NU 🔥</button>`;
        showView("workout-view");
        return;
    }

    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;"><strong>${ex.name}</strong></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:5px;">
                <input type="number" id="w-${i}" class="log-input" placeholder="kg" value="${val.weight}" onchange="updateDraftData(${i})">
                <input type="number" id="r-${i}" class="log-input" placeholder="reps" value="${val.reps}" onchange="updateDraftData(${i})">
                <input type="number" id="s-${i}" class="log-input" placeholder="set" value="${val.sets}" onchange="updateDraftData(${i})">
            </div>`;
        list.appendChild(div);
    });
    showView("workout-view");
    startTimer();
}

function actuallyStartWorkout() { activeDraft.isStarted = true; saveAll(); renderActiveWorkout(); }

function updateDraftData(idx) {
    activeDraft.data[idx] = {
        weight: document.getElementById(`w-${idx}`).value,
        reps: document.getElementById(`r-${idx}`).value,
        sets: document.getElementById(`s-${idx}`).value
    };
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

// --- EVENTS ---
document.getElementById("global-home").onclick = () => { pauseTimer(); location.reload(); };
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("stats-mode").onclick = renderStats;
document.getElementById("add-master-ex-btn").onclick = openCreateExerciseModal;

document.getElementById("save-workout-btn").onclick = () => {
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: document.getElementById("workout-timer").textContent,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name,
            weight: document.getElementById(`w-${i}`).value || "0",
            reps: document.getElementById(`r-${i}`).value || "0",
            sets: document.getElementById(`s-${i}`).value || "0"
        }))
    };
    workoutHistory.push(log);
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    saveAll();
    renderCalendar();
};

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

function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => renderActiveWorkout();
    }
}

// Hjälpfunktioner
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { if(!val) return; calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date, false); }
function startFreeWorkoutOnDate(date) { startWorkout({id:"free", name:"Fritt Pass", exercises:[]}, null, date, true); }
function addExToPass(pIdx, exId) { if(!exId) return; const ex = masterExercises.find(m => m.id == exId); programData.routine[pIdx].exercises.push({name:ex.name, target:ex.target}); openEditProgramModal(pIdx); }
function removeExFromPass(pIdx, eIdx) { programData.routine[pIdx].exercises.splice(eIdx, 1); openEditProgramModal(pIdx); }
function saveProgramEdit(idx) { programData.routine[idx].name = document.getElementById("edit-pass-name").value; saveAll(); closeModal(); renderProgramView(idx); }
function updateExercise(id) { const ex = masterExercises.find(e => e.id == id); ex.name = document.getElementById("edit-ex-name").value; ex.target = document.getElementById("edit-ex-cat").value; saveAll(); closeModal(); filterExercises(currentExerciseCategory); }
function deleteMasterExercise(id) { if(confirm("Radera?")) { masterExercises = masterExercises.filter(e => e.id != id); saveAll(); closeModal(); filterExercises(currentExerciseCategory); } }
function deleteLoggedWorkout(date, idx) { if(confirm("Radera passet?")) { workoutHistory = workoutHistory.filter((w, i) => !(w.date === date && i === idx)); saveAll(); closeModal(); renderCalendar(); } }
