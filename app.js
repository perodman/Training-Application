// --- INITIALISERING & STATE ---
let masterExercises = [];
let programData = { routine: [] };
let workoutHistory = [];
let calendarOverrides = {};
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft")) || null;

let secondsElapsed = activeDraft ? (activeDraft.secondsElapsed || 0) : 0;
let timerInterval = null;
let currentExerciseCategory = "Ben";
let currentViewDate = new Date();

async function init() {
    try {
        const res = await fetch('program.json');
        const defaultData = await res.json();
        
        const savedExercises = localStorage.getItem("masterExercises");
        masterExercises = savedExercises ? JSON.parse(savedExercises) : defaultData.exercises;
        
        const savedProgram = localStorage.getItem("programData");
        programData = savedProgram ? JSON.parse(savedProgram) : { routine: defaultData.routine };
        
        const savedHistory = localStorage.getItem("workoutHistory");
        workoutHistory = savedHistory ? JSON.parse(savedHistory) : [];
        
        const savedOverrides = localStorage.getItem("calendarOverrides");
        calendarOverrides = savedOverrides ? JSON.parse(savedOverrides) : {};

        renderHome();
    } catch (e) {
        console.error("Init misslyckades", e);
    }
}

function saveAll() {
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("programData", JSON.stringify(programData));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

// --- TIMER LOGIK ---
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        secondsElapsed++;
        if (activeDraft) {
            activeDraft.secondsElapsed = secondsElapsed;
            localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
        }
        updateTimerDisplay();
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
    const display = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const timerEl = document.getElementById("workout-timer");
    if (timerEl) timerEl.textContent = display;
}

// --- MODAL & NAVIGATION ---
function openModal() {
    document.getElementById("modal").classList.add("active");
}

function closeModal() {
    document.getElementById("modal").classList.remove("active");
}

function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(viewId).classList.add("active");
    window.scrollTo(0,0);
}

// --- ÖVNINGSHANTERING ---
function filterExercises(cat) {
    currentExerciseCategory = cat;
    const container = document.getElementById("exercises-grid");
    container.innerHTML = "";
    
    const filtered = masterExercises.filter(ex => 
        cat === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === cat
    );

    filtered.forEach(ex => {
        const card = document.createElement("div");
        card.className = "card glass";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <strong style="display:block; font-size:16px;">${ex.name}</strong>
                    <small style="color:var(--primary);">${ex.target}</small>
                </div>
                <button onclick="editExercise(${ex.id})" style="background:none; border:none; color:var(--text-light);">Redigera</button>
            </div>
            <button class="mode-btn glass-border" style="margin-top:10px; padding:8px;" onclick="showAnimation('${ex.anim}')">Se animation 👁️</button>
        `;
        container.appendChild(card);
    });
}

function showAnimation(url) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Animation</h3>
        <img src="${url}" style="width:100%; border-radius:15px; margin-top:10px;">
        <button class="mode-btn" onclick="closeModal()">Stäng</button>
    `;
    openModal();
}

function editExercise(id) {
    const ex = masterExercises.find(e => e.id === id);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
        <button class="mode-btn blue" onclick="saveExEdit(${id})">Spara</button>
    `;
    openModal();
}

function saveExEdit(id) {
    const newName = document.getElementById("edit-ex-name").value;
    const ex = masterExercises.find(e => e.id === id);
    ex.name = newName;
    saveAll();
    closeModal();
    filterExercises(currentExerciseCategory);
}

function openCreateExerciseModal(callback) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa ny övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Namn på övning">
        <select id="new-ex-target" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn green" id="confirm-new-ex">Skapa övning</button>
    `;
    document.getElementById("confirm-new-ex").onclick = () => {
        const name = document.getElementById("new-ex-name").value;
        const target = document.getElementById("new-ex-target").value;
        if(!name) return alert("Fyll i namn!");
        const newEx = { 
            id: Date.now(), 
            name, 
            target, 
            anim: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJueXlpZ3M0eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxxcaOlfKTu/giphy.gif" 
        };
        masterExercises.push(newEx);
        saveAll();
        if(callback) {
            callback(newEx);
        } else {
            closeModal();
            filterExercises(currentExerciseCategory);
        }
    };
    openModal();
}

// --- KALENDER-VY ---
function renderCalendar(isSelecting = false) {
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = "";
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    document.getElementById("current-month").textContent = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(currentViewDate);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) {
        grid.appendChild(document.createElement("div"));
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
        const dayEl = document.createElement("div");
        dayEl.className = "calendar-day";
        dayEl.innerHTML = `<span>${d}</span>`;
        
        const hasWorkout = workoutHistory.some(w => w.date === dateStr);
        const override = calendarOverrides[dateStr];

        if (hasWorkout) {
            const dot = document.createElement("div");
            dot.className = "workout-dot";
            dayEl.appendChild(dot);
        } else if (override && override !== "Vila") {
            const plan = document.createElement("div");
            plan.className = "planned-dot";
            dayEl.appendChild(plan);
        }

        dayEl.onclick = () => {
            if(isSelecting) {
                selectProgramForDate(dateStr);
            } else {
                showDayDetails(dateStr);
            }
        };
        grid.appendChild(dayEl);
    }
    showView("calendar-view");
}

function showDayDetails(date) {
    const body = document.getElementById("modal-body");
    const history = workoutHistory.filter(w => w.date === date);
    const override = calendarOverrides[date];

    let html = `<h3>${date}</h3>`;
    
    if (history.length > 0) {
        html += `<div style="margin-bottom:15px;"><strong>Genomförda pass:</strong></div>`;
        history.forEach((w, idx) => {
            html += `
                <div class="card glass" style="text-align:left; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>${w.programName}</strong>
                        <span style="font-size:12px; color:var(--primary);">${w.totalTime || ""}</span>
                    </div>
                    <div style="display:flex; gap:10px; margin-top:10px;">
                        <button class="mode-btn blue" style="padding:5px; font-size:11px;" onclick="editLoggedWorkout('${date}', ${idx})">Redigera</button>
                        <button class="mode-btn" style="padding:5px; font-size:11px; background:var(--danger);" onclick="confirmDeleteWorkout('${date}', ${idx})">Radera</button>
                    </div>
                </div>`;
        });
    }

    html += `<div class="separator"></div><p>Planerat: <strong>${override || "Inget planerat"}</strong></p>`;
    html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;">`;
    programData.routine.forEach(p => {
        html += `<button class="mode-btn glass-border" style="font-size:11px;" onclick="setOverride('${date}', '${p.name}')">${p.name}</button>`;
    });
    html += `<button class="mode-btn" style="font-size:11px; background:var(--danger);" onclick="setOverride('${date}', 'Vila')">Vila</button>`;
    html += `</div><button class="mode-btn blue" style="margin-top:15px;" onclick="prepareStart('${date}')">Starta pass denna dag</button>`;
    
    body.innerHTML = html;
    openModal();
}

function selectProgramForDate(date) {
    const body = document.getElementById("modal-body");
    let html = `<h3>Välj pass för ${date}</h3>`;
    programData.routine.forEach(p => {
        html += `<button class="mode-btn blue" style="margin-bottom:10px;" onclick="closeModal(); startWorkout(programData.routine.find(x=>x.id==='${p.id}'), null, '${date}')">${p.name}</button>`;
    });
    html += `<button class="mode-btn glass-border" onclick="closeModal(); startWorkout({id:'free-'+Date.now(), name:'Fritt pass', exercises:[]}, null, '${date}')">Fritt Pass (Tomt)</button>`;
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
                <strong style="font-size:18px;">${p.name}</strong>
                <span style="color:var(--text-light); font-size:12px;">${p.exercises.length} övningar</span>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px;">
                <button class="mode-btn green" onclick="startWorkout(programData.routine[${idx}])">Starta Pass</button>
                <button class="mode-btn glass-border" onclick="showProgramDetails(${idx})">Visa/Redigera</button>
            </div>
        `;
        list.appendChild(card);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const p = programData.routine[idx];
    const body = document.getElementById("modal-body");
    let html = `<h3>${p.name}</h3><div style="text-align:left; max-height:300px; overflow-y:auto;">`;
    p.exercises.forEach(ex => { 
        html += `<div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.1); font-size:14px;">• ${ex.name}</div>`; 
    });
    html += `</div><div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:20px;">
        <button class="mode-btn blue" onclick="openEditProgramModal(${idx})">Redigera</button>
        <button class="mode-btn" style="background:var(--danger);" onclick="deleteProgram(${idx})">Radera</button>
    </div>`;
    body.innerHTML = html;
    openModal();
}

function deleteProgram(idx) {
    if(confirm("Radera programmet?")) {
        programData.routine.splice(idx, 1);
        saveAll();
        closeModal();
        renderProgramView();
    }
}

function openEditProgramModal(pIdx) {
    const p = programData.routine[pIdx];
    const body = document.getElementById("modal-body");
    let html = `<h3>Redigera ${p.name}</h3>`;
    html += `<input type="text" id="edit-pass-name" class="log-input" value="${p.name}">`;
    html += `<div style="max-height:250px; overflow-y:auto; margin-bottom:15px;">`;
    p.exercises.forEach((ex, eIdx) => {
        html += `
            <div class="card glass" style="margin-bottom:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px;">${ex.name}</span>
                <div style="display:flex; gap:5px;">
                    <button class="reorder-btn" onclick="moveExercise(${pIdx}, ${eIdx}, -1)">▲</button>
                    <button class="reorder-btn" onclick="moveExercise(${pIdx}, ${eIdx}, 1)">▼</button>
                    <button onclick="removeExFromPass(${pIdx}, ${eIdx})" style="color:var(--danger); background:none; border:none; margin-left:5px;">✕</button>
                </div>
            </div>`;
    });
    html += `</div><button class="mode-btn glass-border" onclick="openAddExToProgram(${pIdx})">+ Lägg till övning</button>
             <button class="mode-btn green" onclick="saveProgramEdit(${pIdx})">Spara Ändringar</button>`;
    body.innerHTML = html;
    openModal();
}

function openAddExToProgram(pIdx) {
    const body = document.getElementById("modal-body");
    let html = `<h3>Välj övning</h3><div style="max-height:300px; overflow-y:auto;">`;
    masterExercises.forEach(ex => {
        html += `<div class="card glass" style="padding:10px; margin-bottom:5px; cursor:pointer;" onclick="addExToProg(${pIdx}, ${ex.id})">${ex.name}</div>`;
    });
    html += `</div><button class="mode-btn glass-border" onclick="openEditProgramModal(${pIdx})">Tillbaka</button>`;
    body.innerHTML = html;
}

function addExToProg(pIdx, exId) {
    const ex = masterExercises.find(e => e.id === exId);
    programData.routine[pIdx].exercises.push({ name: ex.name, target: ex.target });
    openEditProgramModal(pIdx);
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
    saveAll();
    closeModal();
    renderProgramView();
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
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    
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
        timerActive: isImmediateStart ? true : (activeDraft ? activeDraft.timerActive : false),
        lockedTime: activeDraft ? activeDraft.lockedTime : null
    };
    
    renderActiveWorkout();
    updateTimerDisplay();

    if(activeDraft.isStarted && activeDraft.timerActive !== false) {
        startTimer();
    } else {
        pauseTimer();
    }
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    const footer = document.querySelector(".workout-footer");
    
    // Punkt 4: Skapa område för kasta-knapp i toppen
    const topActionArea = document.getElementById("workout-top-actions") || document.createElement("div");
    topActionArea.id = "workout-top-actions";
    topActionArea.style.textAlign = "right";
    topActionArea.style.marginBottom = "10px";
    
    list.innerHTML = "";
    list.appendChild(topActionArea);

    if(!activeDraft.isStarted) {
        footer.classList.add("hidden");
        topActionArea.innerHTML = "";
        
        // Punkt 3: Flytta knappen ovanför timern
        list.innerHTML += `
            <div style="text-align:center; padding:20px 0;">
                <button class="mode-btn green" style="width:100%; padding:20px; font-size:18px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); margin-bottom:20px;" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>
                <div id="workout-timer" style="font-size:32px; font-weight:800; font-family:monospace; color:var(--primary); margin:10px 0;">00:00:00</div>
            </div>
            <p style="color:var(--text-light); font-size:13px; text-align:center; margin-top:10px;">Klicka på knappen ovan för att starta klockan.</p>
        `;
        showView("workout-view");
        return;
    }

    footer.classList.remove("hidden");
    
    // Punkt 4: "Kasta pass" i toppen
    topActionArea.innerHTML = `<button class="mode-btn" style="background:var(--danger); font-size:12px; width:auto; padding:8px 15px;" onclick="confirmDiscardActiveWorkout()">Kasta pass 🗑️</button>`;

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

function openSwapExercisePicker(oldIdx) { 
    renderSwapPicker("Ben", oldIdx); 
}

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

// --- STANDARD-LOGIK ---
const homeBtn = document.getElementById("global-home");
if(homeBtn) {
    homeBtn.onclick = () => {
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

// Punkt 1: Fix för Hem-vyn
function renderHome() {
    showView("home-view");
    const draftAlert = document.getElementById("draft-alert");
    const startNew = document.getElementById("start-new-btn");

    if(activeDraft) {
        draftAlert.classList.remove("hidden");
        startNew.classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    } else {
        draftAlert.classList.add("hidden");
        startNew.classList.remove("hidden");
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
                <button class="mode-btn" style="background:var(--danger); color:white;" onclick="localStorage.removeItem('activeWorkoutDraft'); activeDraft=null; renderHome(); closeModal();">Kasta pass</button>
                <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
            `;
            openModal();
            return;
        }

        pauseTimer();
        
        // Punkt 2: Använd lockedTime om den finns
        const finalTime = activeDraft.lockedTime ? activeDraft.lockedTime : document.getElementById("workout-timer").textContent;
        
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
        
        workoutHistory.push(log);
        saveAll();
        localStorage.removeItem("activeWorkoutDraft");
        activeDraft = null; 
        secondsElapsed = 0;
        renderCalendar();
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
    saveAll(); 
    closeModal(); 
    renderCalendar();
}

function editLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    const workoutObj = { id: "edit-" + Date.now(), name: item.programName, exercises: item.exercises.map(ex => ({ name: ex.name })) };
    
    const dataObj = item.exercises.map(ex => {
        return { sets_data: ex.sets_data, isCompleted: true };
    });

    // Punkt 2: Spara originaltiden för att låsa den
    const originalTime = item.totalTime || "00:00:00";

    workoutHistory = workoutHistory.filter(w => w !== item);
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    closeModal();
    
    startWorkout(workoutObj, dataObj, date, true); 
    activeDraft.lockedTime = originalTime; // Punkt 2: Lås tiden
    pauseTimer();
}

init();
