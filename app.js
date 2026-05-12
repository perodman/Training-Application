// --- INITIALISERING & DATA ---
let masterExercises = JSON.parse(localStorage.getItem("masterExercises")) || [
    { id: 1, name: "Knäböj", target: "Ben", video: "https://www.w3schools.com/html/mov_bbb.mp4" },
    { id: 2, name: "Bänkpress", target: "Bröst", video: "" },
    { id: 3, name: "Marklyft", target: "Rygg", video: "" },
    { id: 4, name: "Militärpress", target: "Axlar", video: "" },
    { id: 5, name: "Latsdrag", target: "Rygg", video: "" },
    { id: 6, name: "Triceps Pushdown", target: "Armar", video: "" },
    { id: 7, name: "Bicepscurl", target: "Armar", video: "" },
    { id: 8, name: "Plankan", target: "Bål", video: "" }
];

let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory")) || [];

let programData = JSON.parse(localStorage.getItem("programData")) || {
    routine: [
        { id: 1, name: "Pass A", exercises: [{ name: "Knäböj", target: "Ben" }, { name: "Bänkpress", target: "Bröst" }] },
        { id: 2, name: "Pass B", exercises: [{ name: "Marklyft", target: "Rygg" }, { name: "Militärpress", target: "Axlar" }] }
    ]
};

let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides")) || {};
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft")) || null;

// Variabler för punkt 2 (Låst tid vid redigering)
let isEditingHistory = false;
let originalEditTime = "";

function saveAll() {
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("programData", JSON.stringify(programData));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

// --- TIMER LOGIK ---
let timerInterval = null;
let secondsElapsed = 0;

function startTimer() {
    if (timerInterval || isEditingHistory) return; // Punkt 2: Timern startar ej om vi redigerar historik
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
    clearInterval(timerInterval);
    timerInterval = null;
}

function updateTimerDisplay() {
    const hrs = Math.floor(secondsElapsed / 3600);
    const mins = Math.floor((secondsElapsed % 3600) / 60);
    const secs = secondsElapsed % 60;
    const timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    document.getElementById("workout-timer").textContent = timeStr;
}

// --- MODAL & UI ---
function openModal() { document.getElementById("modal-overlay").classList.remove("hidden"); }
function closeModal() { document.getElementById("modal-overlay").classList.add("hidden"); }

function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");
    window.scrollTo(0, 0);
}

// --- ÖVNINGS-BANK ---
let currentExerciseCategory = "Ben";

function filterExercises(category) {
    currentExerciseCategory = category;
    const list = document.getElementById("exercise-bank-list");
    list.innerHTML = "";
    
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.textContent === category);
    });

    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps" || ex.target === "Armar") : ex.target === category);
    
    filtered.forEach(ex => {
        const card = document.createElement("div");
        card.className = "card glass";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="font-size:16px;">${ex.name}</strong><br>
                    <small style="color:var(--primary)">${ex.target}</small>
                </div>
                <div style="display:flex; gap:10px;">
                    ${ex.video ? `<button class="mode-btn blue" onclick="previewExercise('${ex.video}')">Video</button>` : ''}
                    <button class="mode-btn" onclick="openEditExerciseModal(${ex.id})">Redigera</button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function previewExercise(url) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <video width="100%" controls autoplay style="border-radius:15px; margin-bottom:15px;">
            <source src="${url}" type="video/mp4">
        </video>
        <button class="mode-btn glass-border" onclick="closeModal()">Stäng</button>
    `;
    openModal();
}

function openCreateExerciseModal(callback) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Namn (t.ex. Knäböj)">
        <select id="new-ex-target" class="log-input">
            <option>Ben</option><option>Bröst</option><option>Rygg</option><option>Axlar</option><option>Armar</option><option>Bål</option>
        </select>
        <input type="text" id="new-ex-video" class="log-input" placeholder="Video URL (valfritt)">
        <button class="mode-btn green" id="save-new-ex">Spara Övning</button>
    `;
    document.getElementById("save-new-ex").onclick = () => {
        const name = document.getElementById("new-ex-name").value;
        const target = document.getElementById("new-ex-target").value;
        const video = document.getElementById("new-ex-video").value;
        if(!name) return alert("Ange namn!");
        const newEx = { id: Date.now(), name, target, video };
        masterExercises.push(newEx);
        saveAll();
        if(callback) callback(newEx);
        else { closeModal(); filterExercises(currentExerciseCategory); }
    };
    openModal();
}

function openEditExerciseModal(id) {
    const ex = masterExercises.find(e => e.id === id);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
        <select id="edit-ex-target" class="log-input">
            <option ${ex.target==='Ben'?'selected':''}>Ben</option>
            <option ${ex.target==='Bröst'?'selected':''}>Bröst</option>
            <option ${ex.target==='Rygg'?'selected':''}>Rygg</option>
            <option ${ex.target==='Axlar'?'selected':''}>Axlar</option>
            <option ${ex.target==='Armar'?'selected':''}>Armar</option>
            <option ${ex.target==='Bål'?'selected':''}>Bål</option>
        </select>
        <input type="text" id="edit-ex-video" class="log-input" value="${ex.video || ''}">
        <button class="mode-btn green" onclick="saveExerciseEdit(${id})">Spara</button>
        <button class="mode-btn" style="background:var(--danger); margin-top:10px;" onclick="deleteExercise(${id})">Radera Övning</button>
    `;
    openModal();
}

function saveExerciseEdit(id) {
    const ex = masterExercises.find(e => e.id === id);
    ex.name = document.getElementById("edit-ex-name").value;
    ex.target = document.getElementById("edit-ex-target").value;
    ex.video = document.getElementById("edit-ex-video").value;
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function deleteExercise(id) {
    if(confirm("Vill du radera övningen från banken?")) {
        masterExercises = masterExercises.filter(e => e.id !== id);
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
}

// --- KALENDER ---
let currentViewDate = new Date();

function renderCalendar(isSelectingForStart = false) {
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    document.getElementById("current-month").textContent = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(currentViewDate);
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement("div"));

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const dayEl = document.createElement("div");
        dayEl.className = "calendar-day glass";
        dayEl.innerHTML = `<span>${d}</span>`;
        
        const workouts = workoutHistory.filter(w => w.date === dateStr);
        if (workouts.length > 0) {
            dayEl.classList.add("has-workout");
            workouts.forEach(() => {
                const dot = document.createElement("div");
                dot.className = "workout-dot";
                dayEl.appendChild(dot);
            });
        }
        
        if (calendarOverrides[dateStr] === "rest") {
            dayEl.classList.add("rest-day");
            dayEl.innerHTML += `<div style="font-size:10px; margin-top:2px;">Vila</div>`;
        }

        dayEl.onclick = () => isSelectingForStart ? openStartPicker(dateStr) : showDayDetails(dateStr);
        grid.appendChild(dayEl);
    }
    showView("calendar-view");
}

function showDayDetails(date) {
    const body = document.getElementById("modal-body");
    const workouts = workoutHistory.filter(w => w.date === date);
    const isRest = calendarOverrides[date] === "rest";
    
    let html = `<h3>${date}</h3>`;
    
    if (workouts.length > 0) {
        workouts.forEach((w, idx) => {
            html += `
                <div class="card" style="background:rgba(255,255,255,0.05); text-align:left; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${w.programName}</strong>
                        <small>${w.totalTime || ''}</small>
                    </div>
                    <ul style="font-size:12px; margin-top:5px; color:var(--text-light); padding-left:15px;">
                        ${w.exercises.map(ex => `<li>${ex.name}</li>`).join('')}
                    </ul>
                    <div style="display:flex; gap:5px; margin-top:10px;">
                        <button class="mode-btn blue" style="padding:5px 10px; font-size:11px;" onclick="editLoggedWorkout('${date}', ${idx})">Redigera</button>
                        <button class="mode-btn" style="padding:5px 10px; font-size:11px; background:var(--danger);" onclick="confirmDeleteWorkout('${date}', ${idx})">Radera</button>
                    </div>
                </div>`;
        });
    } else {
        html += `<p style="color:var(--text-light); margin-bottom:15px;">Ingen träning registrerad.</p>`;
    }

    html += `
        <div class="separator"></div>
        <button class="mode-btn ${isRest ? 'blue' : 'glass-border'}" onclick="setOverride('${date}', ${isRest ? 'null' : 'rest'})">
            ${isRest ? 'Ta bort vilodag' : 'Markera som vilodag 😴'}
        </button>
        <button class="mode-btn green" onclick="openStartPicker('${date}')">Registrera träning i efterhand</button>
        <button class="mode-btn glass-border" onclick="closeModal()">Stäng</button>
    `;
    body.innerHTML = html;
    openModal();
}

function openStartPicker(date) {
    const body = document.getElementById("modal-body");
    let html = `<h3>Välj pass för ${date}</h3>`;
    programData.routine.forEach(p => {
        html += `<button class="mode-btn glass-border" onclick="prepareStart('${date}', '${p.id}')">${p.name}</button>`;
    });
    html += `
        <div class="separator"></div>
        <button class="mode-btn blue" onclick="prepareStart('${date}', 'free-workout')">Fritt pass (tomt)</button>
        <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
    `;
    body.innerHTML = html;
    openModal();
}

// --- PROGRAM-VY ---
function renderProgramView() {
    const list = document.getElementById("program-list");
    list.innerHTML = "";
    programData.routine.forEach((p, idx) => {
        const card = document.createElement("div");
        card.className = "card glass";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="font-size:18px;">${p.name}</strong>
                    <div style="font-size:12px; color:var(--text-light);">${p.exercises.length} övningar</div>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="mode-btn blue" onclick="openEditProgramModal(${idx})">Ändra</button>
                    <button class="mode-btn green" onclick="startWorkout(programData.routine[${idx}])">Starta</button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
    showView("programs-view");
}

function openEditProgramModal(idx) {
    const p = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3 style="margin-bottom:5px;">Redigera Pass</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN PÅ PASS</label>
        <input type="text" id="edit-pass-name" class="log-input" value="${p.name}">
        <div id="edit-ex-list" style="margin:15px 0; max-height:300px; overflow-y:auto;"></div>
        <button class="mode-btn blue" onclick="createNewExForPass(${idx})">+ Skapa & lägg till ny övning</button>
        <button class="mode-btn green" onclick="saveProgramEdit(${idx})">Spara Ändringar</button>
        <button class="mode-btn" style="background:var(--danger); margin-top:20px; font-size:12px; opacity:0.8;" onclick="deleteProgram(${idx})">Radera hela träningspasset</button>
    `;
    const list = document.getElementById("edit-ex-list");
    p.exercises.forEach((ex, eIdx) => {
        const d = document.createElement("div");
        d.className = "card";
        d.style.background = "rgba(255,255,255,0.05)";
        d.style.padding = "10px";
        d.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <button class="reorder-btn" onclick="moveExercise(${idx}, ${eIdx}, -1)">▲</button>
                        <button class="reorder-btn" onclick="moveExercise(${idx}, ${eIdx}, 1)">▼</button>
                    </div>
                    <span>${ex.name}</span>
                </div>
                <button onclick="removeExFromPass(${idx}, ${eIdx})" style="background:none; border:none; color:var(--danger); font-size:18px;">✖</button>
            </div>
        `;
        list.appendChild(d);
    });
    openModal();
}

function createNewExForPass(pIdx) {
    openCreateExerciseModal((newEx) => {
        programData.routine[pIdx].exercises.push({ name: newEx.name, target: newEx.target, defaultSets: 3 });
        openEditProgramModal(pIdx);
    });
}

function moveExercise(pIdx, eIdx, dir) {
    const exercises = programData.routine[pIdx].exercises;
    const newIdx = eIdx + dir;
    if(newIdx < 0 || newIdx >= exercises.length) return;
    [exercises[eIdx], exercises[newIdx]] = [exercises[newIdx], exercises[eIdx]];
    openEditProgramModal(pIdx);
}

function removeExFromPass(pIdx, eIdx) {
    programData.routine[pIdx].exercises.splice(eIdx, 1);
    openEditProgramModal(pIdx);
}

function saveProgramEdit(idx) {
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll(); closeModal(); renderProgramView(idx);
}

function openCreateProgramModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Nytt Pass</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN PÅ PASS</label>
        <input type="text" id="new-pass-name" class="log-input" placeholder="T.ex. Överkropp Deluxe">
        <button class="mode-btn blue" onclick="saveNewProgram()">Spara och Redigera</button>
    `;
    openModal();
}

function saveNewProgram() {
    const name = document.getElementById("new-pass-name").value.trim();
    if(!name) return alert("Ange ett namn!");
    const newPass = { id: "pass-" + Date.now(), name, exercises: [] };
    programData.routine.push(newPass);
    saveAll();
    const newIdx = programData.routine.length - 1;
    openEditProgramModal(newIdx);
}

// --- LOGIK FÖR HISTORIK ---
function getExerciseHistory(exerciseName) {
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
        const workout = workoutHistory[i];
        const exMatch = workout.exercises.find(e => e.name === exerciseName);
        if (exMatch) {
            if (!exMatch.sets_data) {
                return Array(parseInt(exMatch.sets || 3)).fill({ weight: exMatch.weight, reps: exMatch.reps });
            }
            return exMatch.sets_data;
        }
    }
    return null;
}

// --- AKTIVT PASS ---
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    // Punkt 2: Om vi inte redigerar historik, hantera timer som vanligt
    if(!isEditingHistory) {
        secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    }
    
    if(!data) {
        data = workout.exercises.map(ex => {
            const history = getExerciseHistory(ex.name);
            if (history) {
                return { sets_data: JSON.parse(JSON.stringify(history)), isCompleted: false };
            }
            return { sets_data: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }], isCompleted: false };
        });
    }

    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: data, 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: secondsElapsed,
        isStarted: isImmediateStart || (activeDraft ? activeDraft.isStarted : false),
        timerActive: isImmediateStart ? true : (activeDraft ? activeDraft.timerActive : false)
    };
    
    renderActiveWorkout();
    updateTimerDisplay();

    if(activeDraft.isStarted && activeDraft.timerActive !== false && !isEditingHistory) {
        startTimer();
    } else {
        pauseTimer();
    }
}

function renderActiveWorkout() {
    // Punkt 4: Flyttat kasta-knappen till toppen vid rubriken
    const titleContainer = document.getElementById("active-title-container");
    if(titleContainer) {
        titleContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <h2 id="active-title" style="margin:0;">${activeDraft.workout.name}</h2>
                ${activeDraft.isStarted ? `<button onclick="confirmDiscardActiveWorkout()" style="background:none; border:none; font-size:20px; cursor:pointer;">🗑️</button>` : ''}
            </div>
        `;
    } else {
        document.getElementById("active-title").textContent = activeDraft.workout.name;
    }

    const list = document.getElementById("exercise-list");
    const footer = document.querySelector(".workout-footer");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        footer.classList.add("hidden");
        // Punkt 3: Flyttat knappen till mellan Rubrik och Timer
        list.innerHTML = `
            <div style="text-align:center; padding:10px 0;">
                <button class="mode-btn green" style="width:100%; padding:20px; font-size:18px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>
            </div>
            <p style="color:var(--text-light); font-size:13px; text-align:center; margin-bottom:20px;">Klicka på knappen ovan för att starta klockan.</p>
        `;
        document.getElementById("workout-timer").textContent = "00:00:00";
        showView("workout-view");
        return;
    }

    footer.classList.remove("hidden");

    // Punkt 4: Vi döljer den gamla stora kasta-knappen i footern genom att göra den osynlig
    const oldPauseBtn = document.getElementById("pause-workout-btn");
    if(oldPauseBtn) oldPauseBtn.style.display = "none";

    activeDraft.workout.exercises.forEach((ex, i) => {
        const exerciseData = activeDraft.data[i];
        const isDone = exerciseData.isCompleted;
        const div = document.createElement("div");
        div.className = "card glass" + (isDone ? " exercise-done" : "");
        
        let setsHtml = `<div style="margin-top:10px;">
            <div style="display:grid; grid-template-columns: 35px 1fr 1fr 30px; gap:8px; margin-bottom:5px; align-items:center;">
                <span></span>
                <small style="text-align:center; color:var(--text-light); font-size:9px;">KG</small>
                <small style="text-align:center; color:var(--text-light); font-size:9px;">REPS</small>
                <span></span>
            </div>`;

        exerciseData.sets_data.forEach((set, sIdx) => {
            setsHtml += `
            <div style="display:grid; grid-template-columns: 35px 1fr 1fr 30px; gap:8px; margin-bottom:8px; align-items:center;">
                <span style="font-size:12px; font-weight:800; color:var(--primary)">#${sIdx + 1}</span>
                <input type="number" id="w-${i}-${sIdx}" class="log-input" style="margin:0; padding:8px;" placeholder="0" value="${set.weight}" onchange="updateSetData(${i}, ${sIdx})">
                <input type="number" id="r-${i}-${sIdx}" class="log-input" style="margin:0; padding:8px;" placeholder="0" value="${set.reps}" onchange="updateSetData(${i}, ${sIdx})">
                <button onclick="removeSetFromExercise(${i}, ${sIdx})" style="background:none; border:none; color:var(--danger); font-size:16px;" ${isDone ? 'disabled' : ''}>×</button>
            </div>`;
        });

        setsHtml += `
            <button class="mode-btn glass-border" style="padding:8px; font-size:11px; margin-top:5px; border-style:dashed;" onclick="addSetToExercise(${i})" ${isDone ? 'disabled' : ''}>+ Lägg till set</button>
            <button class="mode-btn ${isDone ? 'blue' : 'green'}" style="padding:10px; font-size:13px; margin-top:10px;" onclick="toggleExerciseDone(${i})">
                ${isDone ? 'Ångra Klar ↩️' : 'Marker som klar ✅'}
            </button>
        </div>`;

        div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <div style="display:flex; gap:8px;">
                <button class="reorder-btn" onclick="moveActiveExercise(${i}, -1)" ${isDone ? 'disabled' : ''}>▲</button>
                <button class="reorder-btn" onclick="moveActiveExercise(${i}, 1)" ${isDone ? 'disabled' : ''}>▼</button>
            </div>
            <strong style="font-size:16px;">${ex.name}</strong>
            <button onclick="handleExerciseOptions(${i})" style="color:var(--danger); background:none; border:none; font-size:20px;" ${isDone ? 'disabled' : ''}> ✖ </button>
        </div>
        ${setsHtml}`;
        
        list.appendChild(div);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "mode-btn glass-border";
    addBtn.style.marginTop = "10px";
    addBtn.innerHTML = "➕ Lägg till övning";
    addBtn.onclick = openAddExerciseToWorkoutModal;
    list.appendChild(addBtn);

    showView("workout-view");
}

function confirmDiscardActiveWorkout() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Kasta passet?</h3>
        <p style="text-align:center; color:var(--text-light); margin-bottom:20px;">Är du säker på att du vill kasta passet? Ingen data kommer att sparas.</p>
        <button class="mode-btn" style="background:var(--danger); color:white; font-weight:800;" onclick="discardActiveWorkout()">Ja, kasta passet</button>
        <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
    `;
    openModal();
}

function discardActiveWorkout() {
    pauseTimer();
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    secondsElapsed = 0;
    isEditingHistory = false;
    location.reload();
}

function handleExerciseOptions(idx) {
    const ex = activeDraft.workout.exercises[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Hantera övning</h3>
        <p style="text-align:center; font-weight:700; color:var(--primary);">${ex.name}</p>
        <div style="margin-top:20px;">
            <button class="mode-btn blue" onclick="openSwapExercisePicker(${idx})">Byt ut övning 🔄</button>
            <button class="mode-btn" style="background:var(--danger); color:white;" onclick="removeActiveExercise(${idx}); closeModal();">Ta bort från passet ✖</button>
            <button class="mode-btn glass-border" style="margin-top:10px;" onclick="closeModal()">Avbryt</button>
        </div>
    `;
    openModal();
}

function openSwapExercisePicker(oldIdx) { renderSwapPicker("Ben", oldIdx); }

function renderSwapPicker(category, oldIdx) {
    const body = document.getElementById("modal-body");
    const categories = ["Ben", "Bröst", "Rygg", "Axlar", "Armar", "Bål"];
    
    let html = `<h3>Välj ny övning</h3>`;
    html += `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px; margin-bottom:15px;">`;
    categories.forEach(cat => {
        const isActive = cat === category;
        html += `<button onclick="renderSwapPicker('${cat}', ${oldIdx})" 
            style="padding:8px 5px; font-size:10px; border-radius:8px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; 
            background:${isActive ? 'rgba(56,189,248,0.1)' : 'none'}; color:${isActive ? 'var(--primary)' : 'white'}; cursor:pointer;">
            ${cat}
        </button>`;
    });
    html += `</div>`;
    
    html += `<div style="max-height:250px; overflow-y:auto; padding-right:5px; margin-bottom:15px;">`;
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    
    filtered.forEach(ex => {
        html += `
        <div class="card glass" style="padding:12px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="confirmSwapExercise(${oldIdx}, ${ex.id})">
            <span style="font-size:14px; font-weight:600;">${ex.name}</span>
            <span style="color:var(--primary); font-size:14px;">Välj</span>
        </div>`;
    });
    html += `</div>`;
    html += `<button class="mode-btn glass-border" onclick="handleExerciseOptions(${oldIdx})">Tillbaka</button>`;
    
    body.innerHTML = html;
}

function confirmSwapExercise(oldIdx, newExId) {
    const newEx = masterExercises.find(e => e.id == newExId);
    activeDraft.workout.exercises[oldIdx] = { name: newEx.name, target: newEx.target };
    
    const history = getExerciseHistory(newEx.name);
    if(history) {
        activeDraft.data[oldIdx] = { sets_data: JSON.parse(JSON.stringify(history)), isCompleted: false };
    } else {
        activeDraft.data[oldIdx] = { sets_data: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }], isCompleted: false };
    }
    
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    closeModal();
    renderActiveWorkout();
}

function updateSetData(exIdx, setIdx) {
    const wVal = document.getElementById(`w-${exIdx}-${setIdx}`).value;
    const rVal = document.getElementById(`r-${exIdx}-${setIdx}`).value;
    activeDraft.data[exIdx].sets_data[setIdx] = { weight: wVal, reps: rVal };
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function addSetToExercise(exIdx) {
    const scrollPos = window.scrollY;
    const lastSet = activeDraft.data[exIdx].sets_data[activeDraft.data[exIdx].sets_data.length - 1];
    const newWeight = lastSet ? lastSet.weight : "";
    const newReps = lastSet ? lastSet.reps : "";
    activeDraft.data[exIdx].sets_data.push({ weight: newWeight, reps: newReps });
    renderActiveWorkout();
    window.scrollTo(0, scrollPos);
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function removeSetFromExercise(exIdx, setIdx) {
    const scrollPos = window.scrollY;
    activeDraft.data[exIdx].sets_data.splice(setIdx, 1);
    renderActiveWorkout();
    window.scrollTo(0, scrollPos);
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function toggleExerciseDone(exIdx) {
    const scrollPos = window.scrollY;
    activeDraft.data[exIdx].isCompleted = !activeDraft.data[exIdx].isCompleted;
    renderActiveWorkout();
    window.scrollTo(0, scrollPos);
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function actuallyStartWorkout() {
    activeDraft.isStarted = true;
    activeDraft.timerActive = true;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    startTimer();
}

function openAddExerciseToWorkoutModal() {
    renderExercisePicker("Ben");
    openModal();
}

function renderExercisePicker(category) {
    const body = document.getElementById("modal-body");
    const categories = ["Ben", "Bröst", "Rygg", "Axlar", "Armar", "Bål"];
    
    let html = `<h3>Välj Övning</h3>`;
    html += `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px; margin-bottom:15px;">`;
    categories.forEach(cat => {
        const isActive = cat === category;
        html += `<button onclick="renderExercisePicker('${cat}')" 
            style="padding:8px 5px; font-size:10px; border-radius:8px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; 
            background:${isActive ? 'rgba(56,189,248,0.1)' : 'none'}; color:${isActive ? 'var(--primary)' : 'white'}; cursor:pointer;">
            ${cat}
        </button>`;
    });
    html += `</div>`;
    
    html += `<div style="max-height:250px; overflow-y:auto; padding-right:5px; margin-bottom:15px;">`;
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    
    filtered.forEach(ex => {
        html += `
        <div class="card glass" style="padding:12px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="confirmAddExerciseToActive(${ex.id})">
            <span style="font-size:14px; font-weight:600;">${ex.name}</span>
            <span style="color:var(--primary); font-size:18px;">+</span>
        </div>`;
    });
    html += `</div>`;

    html += `
        <div class="separator" style="margin:15px 0;"></div>
        <button class="mode-btn glass-border" style="font-size:13px;" onclick="openCreateExerciseModal(handleInstantExerciseCreated)">+ Skapa ny övning som inte finns</button>
    `;
    
    body.innerHTML = html;
}

function handleInstantExerciseCreated(newEx) {
    confirmAddExerciseToActive(newEx.id);
}

function confirmAddExerciseToActive(exId) {
    const ex = masterExercises.find(e => e.id == exId);
    activeDraft.workout.exercises.push({ name: ex.name, target: ex.target });
    
    const history = getExerciseHistory(ex.name);
    if(history) {
        activeDraft.data.push({ sets_data: JSON.parse(JSON.stringify(history)), isCompleted: false });
    } else {
        activeDraft.data.push({ sets_data: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }], isCompleted: false });
    }
    
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    closeModal();
    renderActiveWorkout();
}

function moveActiveExercise(i, dir) {
    const newIdx = i + dir;
    if(newIdx < 0 || newIdx >= activeDraft.workout.exercises.length) return;
    [activeDraft.workout.exercises[i], activeDraft.workout.exercises[newIdx]] = [activeDraft.workout.exercises[newIdx], activeDraft.workout.exercises[i]];
    [activeDraft.data[i], activeDraft.data[newIdx]] = [activeDraft.data[newIdx], activeDraft.data[i]];
    renderActiveWorkout();
}

function removeActiveExercise(i) {
    activeDraft.workout.exercises.splice(i, 1);
    activeDraft.data.splice(i, 1);
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
}

// --- STANDARD-LOGIK & STARTVY ---
const homeBtn = document.getElementById("global-home");
if(homeBtn) {
    homeBtn.onclick = () => {
        showView("home-view");
        renderHome();
    }
}

const startNewBtn = document.getElementById("start-new-btn");
if(startNewBtn) startNewBtn.onclick = () => renderCalendar(true);

const calMode = document.getElementById("calendar-mode");
if(calMode) calMode.onclick = () => renderCalendar();

const exBtn = document.getElementById("view-exercises-btn");
if(exBtn) exBtn.onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };

const progBtn = document.getElementById("view-programs-btn");
if(progBtn) progBtn.onclick = () => renderProgramView();

const statMode = document.getElementById("stats-mode");
if(statMode) statMode.onclick = renderStats;

const addPassBtn = document.getElementById("add-custom-pass-btn");
if(addPassBtn) addPassBtn.onclick = openCreateProgramModal;

function renderHome() {
    showView("home-view");
    // Punkt 1: Kontrollera att utkastet faktiskt existerar
    const savedDraft = localStorage.getItem("activeWorkoutDraft");
    if(savedDraft && activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    } else {
        document.getElementById("draft-alert").classList.add("hidden");
        document.getElementById("start-new-btn").classList.remove("hidden");
    }
}

const saveWorkoutBtn = document.getElementById("save-workout-btn");
if(saveWorkoutBtn) {
    saveWorkoutBtn.onclick = () => {
        if(!activeDraft.isStarted) {
            const body = document.getElementById("modal-body");
            body.innerHTML = `
                <h3>Kasta träningspass?</h3>
                <p style="text-align:center; color:var(--text-light); margin-bottom:20px;">Du har inte startat passet än. Vill du kasta utkastet?</p>
                <button class="mode-btn" style="background:var(--danger); color:white;" onclick="localStorage.removeItem('activeWorkoutDraft'); location.reload();">Kasta pass</button>
                <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
            `;
            openModal();
            return;
        }

        pauseTimer();
        // Punkt 2: Använd ursprunglig tid om vi redigerar historik, annars klockans tid
        const finalTime = isEditingHistory ? originalEditTime : document.getElementById("workout-timer").textContent;
        
        const log = {
            date: activeDraft.date,
            programName: activeDraft.workout.name,
            totalTime: finalTime,
            exercises: activeDraft.workout.exercises.map((ex, i) => {
                return {
                    name: ex.name,
                    sets_data: activeDraft.data[i].sets_data 
                };
            })
        };
        
        if (activeDraft.workout.id && activeDraft.workout.id.toString().startsWith("free-")) {
            if (confirm("Vill du spara detta som ett nytt träningsprogram?")) {
                const newName = prompt("Namnge passet:", "Mitt nya pass");
                if (newName) {
                    programData.routine.push({
                        id: "pass-" + Date.now(),
                        name: newName,
                        exercises: JSON.parse(JSON.stringify(activeDraft.workout.exercises))
                    });
                }
            }
        }

        workoutHistory.push(log);
        saveAll();
        localStorage.removeItem("activeWorkoutDraft");
        activeDraft = null; 
        secondsElapsed = 0;
        isEditingHistory = false; // Återställ flaggan
        
        // Punkt 1: Uppdatera hemvyn direkt så "Fortsätt" försvinner
        renderHome();
        renderCalendar();
    };
}

const pauseWorkoutBtn = document.getElementById("pause-workout-btn");
if(pauseWorkoutBtn && !activeDraft?.isStarted) {
    pauseWorkoutBtn.onclick = () => { 
        location.reload(); 
    };
}

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

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { 
    let p;
    if(id === 'free-workout') {
        p = { id: 'free-' + Date.now(), name: 'Fritt pass', exercises: [] };
    } else {
        p = programData.routine.find(x => x.id.toString() === id.toString());
    }
    closeModal(); 
    startWorkout(p, null, date, false); 
}

function confirmDeleteWorkout(date, idx) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3 style="color:var(--danger);">Radera passet?</h3>
        <p style="text-align:center; color:var(--text-light); margin-bottom:20px;">Detta träningspass kommer att tas bort permanent från din historik.</p>
        <button class="mode-btn" style="background:var(--danger); color:white; font-weight:800;" onclick="deleteLoggedWorkout('${date}', ${idx})">Radera permanent</button>
        <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
    `;
    openModal();
}

function deleteLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    workoutHistory = workoutHistory.filter(w => w !== item);
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null; 
    saveAll(); closeModal(); renderCalendar();
}

function editLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    
    // Punkt 2: Markera redigeringsläge och spara tiden
    isEditingHistory = true;
    originalEditTime = item.totalTime || "00:00:00";
    
    const workoutObj = { id: "edit-" + Date.now(), name: item.programName, exercises: item.exercises.map(ex => ({ name: ex.name })) };
    
    const dataObj = item.exercises.map(ex => {
        return { sets_data: ex.sets_data, isCompleted: true };
    });

    const timeParts = originalEditTime.split(":");
    secondsElapsed = (parseInt(timeParts[0]) * 3600) + (parseInt(timeParts[1]) * 60) + parseInt(timeParts[2]);

    workoutHistory = workoutHistory.filter(w => w !== item);
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    closeModal();
    
    startWorkout(workoutObj, dataObj, date, true); 
    pauseTimer(); // Punkt 2: Tiden ska stå stilla vid redigering
}

// Starta appen
renderHome();
