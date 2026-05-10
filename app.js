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
    // Om banken är tom, ladda in övningar från standardprogrammet
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
    const target = document.getElementById(id);
    if(!target) return;
    
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    target.classList.remove("hidden");
    
    // Trigga om animationen
    target.style.animation = 'none';
    target.offsetHeight; 
    target.style.animation = null;
    
    window.scrollTo(0, 0);
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

// --- ÖVNINGAR & BANKEN ---
function filterExercises(category) {
    currentExerciseCategory = category;
    
    // Uppdatera knapparnas utseende
    document.querySelectorAll(".cat-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.cat === category);
    });

    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    
    // Filtrera övningar (Armar inkluderar både Biceps och Triceps)
    const filtered = masterExercises.filter(ex => 
        category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category
    );

    if(filtered.length === 0) {
        results.innerHTML = `<p style="text-align:center; color:var(--text-light); margin-top:20px; font-size:14px;">Inga övningar sparade i kategorin ${category}.</p>`;
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
            <button style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="openEditExerciseModal(${ex.id})">  ⚙️  </button>
        `;
        results.appendChild(div);
    });
}

function openCreateExerciseModal(callback = null) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN</label>
        <input type="text" id="new-ex-name" class="log-input" placeholder="T.ex. Knäböj">
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">KATEGORI</label>
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
    if(!ex) return;
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <div style="text-align:left;">
            <label style="font-size:12px; color:var(--text-light); margin-left:10px;">NAMN PÅ ÖVNING</label>
            <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
            <label style="font-size:12px; color:var(--text-light); margin-left:10px;">KATEGORI</label>
            <select id="edit-ex-cat" class="log-input">
                <option value="Ben" ${ex.target==='Ben'?'selected':''}>Ben</option>
                <option value="Bröst" ${ex.target==='Bröst'?'selected':''}>Bröst</option>
                <option value="Rygg" ${ex.target==='Rygg'?'selected':''}>Rygg</option>
                <option value="Axlar" ${ex.target==='Axlar'?'selected':''}>Axlar</option>
                <option value="Biceps" ${ex.target==='Biceps'?'selected':''}>Biceps</option>
                <option value="Triceps" ${ex.target==='Triceps'?'selected':''}>Triceps</option>
                <option value="Bål" ${ex.target==='Bål'?'selected':''}>Bål</option>
            </select>
        </div>
        <button class="mode-btn blue" style="margin-top:20px;" onclick="updateExercise(${id})">Uppdatera</button>
        <button class="mode-btn" style="color:var(--danger); background:none; font-size:14px;" onclick="deleteMasterExercise(${id})">Radera övning permanent</button>
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
    if(confirm("Vill du radera denna övning permanent från banken?")) {
        masterExercises = masterExercises.filter(e => e.id != id);
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
}

// --- KALENDER & PLANERING ---
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
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            displayPass = programData.routine[d % programData.routine.length];
        }
        
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
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${w.programName}</strong>
                    <div style="font-size:10px; color:var(--text-light)">⏱️ ${w.totalTime || ""}</div>
                    <div>
                        <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer;"> ✖ </button>
                    </div>
                </div>`;
            w.exercises.forEach(ex => {
                html += `<div style="font-size:11px; margin-top:5px; color:var(--text-light)">${ex.name}: ${ex.weight}kg x ${ex.reps} x ${ex.sets}</div>`;
            });
            html += `</div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p style="text-align:center;">Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name} 🔥</button>`;
        html += `<button class="mode-btn glass-border" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')">Starta Fritt Pass ➕</button>`;
        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Ändra planering:</p>`;
        programData.routine.forEach(p => {
            html += `<button class="mode-btn glass-border" style="font-size:14px;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>`;
        });
        html += `<button class="mode-btn" style="color:var(--danger); background:none; font-size:14px;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    openModal();
}

// --- PROGRAMHANTERING ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `<div style="font-size:24px;">${['⚡','🔥','🏆','💎'][i % 4]}</div><h4>${pass.name}</h4><div style="font-size:10px; color:var(--primary); margin-top:5px; font-weight:800;">${pass.exercises.length} ÖVNINGAR</div>`;
        div.onclick = () => { 
            document.querySelectorAll(".prog-card").forEach(c => c.classList.remove("active"));
            div.classList.add("active");
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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid var(--glass-border);">
            <h3 style="margin:0; text-align:left; font-size:18px;">${pass.name}</h3>
            <button class="order-btn" style="background:var(--primary); color:#0f172a; padding:8px 15px; border-radius:10px; font-weight:800; border:none; cursor:pointer; font-size:12px;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.03);"><span>${e.name}</span><small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:9px;">${e.target}</small></div>`).join("")}
    `;
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
                    <span style="flex-grow:1; font-size:14px; font-weight:600;">${ex.name}</span>
                    <button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none; font-size:18px;"> ✖ </button>
                </div>`).join("")}
        </div>
        <select id="add-ex-select" class="log-input">
            <option value="">+ Lägg till från banken...</option>
            ${masterExercises.map(ex => `<option value="${ex.id}">${ex.name} (${ex.target})</option>`).join("")}
        </select>
        <button class="mode-btn blue" style="margin-top:20px;" onclick="saveProgramEdit(${idx})">Spara Ändringar</button>
    `;
    document.getElementById("add-ex-select").onchange = (e) => {
        if(!e.target.value) return;
        const ex = masterExercises.find(m => m.id == e.target.value);
        programData.routine[idx].exercises.push({ name: ex.name, target: ex.target });
        openEditProgramModal(idx);
    };
    openModal();
}

function saveProgramEdit(idx) {
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll(); closeModal(); renderProgramView(idx); showProgramDetails(idx);
}

// --- TRÄNINGS-LOGIK ---
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: data || workout.exercises.map(()=>({weight:"", reps:"", sets:3})), 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: secondsElapsed,
        isStarted: isImmediateStart
    };
    renderActiveWorkout();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        list.innerHTML = `<div style="text-align:center; padding:20px 0;"><button class="mode-btn green" style="padding:20px; font-size:18px;" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button></div>`;
        showView("workout-view");
        return;
    }

    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <strong>${ex.name}</strong>
                <button onclick="removeActiveExercise(${i})" style="color:var(--danger); background:none; border:none;"> ✖ </button>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                <input type="number" id="w-${i}" class="log-input" placeholder="kg" value="${val.weight}" onchange="updateDraftData(${i})">
                <input type="number" id="r-${i}" class="log-input" placeholder="reps" value="${val.reps}" onchange="updateDraftData(${i})">
                <input type="number" id="s-${i}" class="log-input" placeholder="set" value="${val.sets}" onchange="updateDraftData(${i})">
            </div>`;
        list.appendChild(div);
    });
    showView("workout-view");
    startTimer();
}

function actuallyStartWorkout() {
    activeDraft.isStarted = true;
    saveAll();
    renderActiveWorkout();
}

function updateDraftData(idx) {
    activeDraft.data[idx] = {
        weight: document.getElementById(`w-${idx}`).value,
        reps: document.getElementById(`r-${idx}`).value,
        sets: document.getElementById(`s-${idx}`).value
    };
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

// --- KNAPPAR & NAVIGERING ---
document.getElementById("global-home").onclick = () => { pauseTimer(); location.reload(); };
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { 
    showView("exercises-view"); 
    filterExercises(currentExerciseCategory); 
};
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("start-free-btn").onclick = () => startFreeWorkoutOnDate(null);
document.getElementById("stats-mode").onclick = renderStats;

function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => renderActiveWorkout();
    }
}

document.getElementById("save-workout-btn").onclick = () => {
    const finalTime = document.getElementById("workout-timer").textContent;
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: finalTime,
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
        bar.innerHTML = `<span style="position:absolute; top:-20px; width:100%; text-align:center; font-size:10px;">${val}</span>`;
        container.appendChild(bar);
    });
    showView("stats-view");
}

// Hjälpfunktioner
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date, false); }
function removeExFromPass(pIdx, eIdx) { programData.routine[pIdx].exercises.splice(eIdx, 1); openEditProgramModal(pIdx); }
function startFreeWorkoutOnDate(date) { startWorkout({id:"free", name:"Fritt Pass", exercises:[]}, null, date, true); }
function removeActiveExercise(i) { activeDraft.workout.exercises.splice(i, 1); activeDraft.data.splice(i, 1); renderActiveWorkout(); }
function deleteLoggedWorkout(date, idx) { if(confirm("Radera passet?")) { workoutHistory = workoutHistory.filter(w => w.date !== date); saveAll(); closeModal(); renderCalendar(); } }
