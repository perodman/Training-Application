// --- INITIALISERING OCH DATA ---
let programData = { routine: [] };
let masterExercises = [];
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory")) || [];
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides")) || {};
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft")) || null;

let timerInterval = null;
let secondsElapsed = 0;
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

async function init() {
    try {
        const res = await fetch('program.json');
        const data = await res.json();
        programData = JSON.parse(localStorage.getItem("programData")) || { routine: data.routine };
        masterExercises = JSON.parse(localStorage.getItem("masterExercises")) || data.exercises;
        
        if (!localStorage.getItem("programData")) saveAll();
        
        renderHome();
    } catch (e) {
        console.error("Kunde inte ladda data", e);
    }
}
init();

function saveAll() {
    localStorage.setItem("programData", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

// --- MODAL HANTERING ---
function openModal() { document.getElementById("modal-overlay").classList.remove("hidden"); }
function closeModal() { document.getElementById("modal-overlay").classList.add("hidden"); }

// --- TIMER LOGIK ---
function startTimer() {
    if (timerInterval) return;
    activeDraft.startTime = Date.now() - (secondsElapsed * 1000);
    timerInterval = setInterval(() => {
        secondsElapsed = Math.floor((Date.now() - activeDraft.startTime) / 1000);
        activeDraft.secondsElapsed = secondsElapsed;
        updateTimerDisplay();
        localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
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
    document.getElementById("workout-timer").textContent = 
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// --- VY-HANTERING ---
function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    window.scrollTo(0,0);
}

// --- ÖVNINGSBANK ---
function filterExercises(category) {
    currentExerciseCategory = category;
    const container = document.getElementById("exercise-bank-content");
    container.innerHTML = "";
    
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.innerText === category);
    });

    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);

    filtered.forEach(ex => {
        const card = document.createElement("div");
        card.className = "card glass";
        let videoHtml = ex.animation ? `
            <div style="border-radius:12px; overflow:hidden; margin-top:10px; background:#000; border:1px solid var(--glass-border);">
                <video src="${ex.animation}" autoplay loop muted playsinline style="width:100%; display:block;"></video>
            </div>` : "";
            
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${ex.name}</strong>
                <button class="reorder-btn" onclick="openEditExModal(${ex.id})">Redigera</button>
            </div>
            ${videoHtml}
        `;
        container.appendChild(card);
    });
}

function openCreateExerciseModal(callback = null) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa ny övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Övningens namn">
        <select id="new-ex-target" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <input type="text" id="new-ex-anim" class="log-input" placeholder="Video-URL (valfritt)">
        <button class="mode-btn blue" id="save-ex-btn">Spara övning</button>
    `;
    document.getElementById("save-ex-btn").onclick = () => {
        const name = document.getElementById("new-ex-name").value;
        const target = document.getElementById("new-ex-target").value;
        const anim = document.getElementById("new-ex-anim").value;
        if(!name) return alert("Namn krävs");
        const newEx = { id: Date.now(), name, target, animation: anim };
        masterExercises.push(newEx);
        saveAll();
        if(callback) callback(newEx);
        else { closeModal(); filterExercises(currentExerciseCategory); }
    };
    openModal();
}

function openEditExModal(id) {
    const ex = masterExercises.find(e => e.id === id);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
        <input type="text" id="edit-ex-anim" class="log-input" value="${ex.animation || ''}" placeholder="Video-URL">
        <button class="mode-btn blue" onclick="saveExEdit(${id})">Spara ändringar</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteEx(${id})">Radera övning</button>
    `;
    openModal();
}

function saveExEdit(id) {
    const ex = masterExercises.find(e => e.id === id);
    ex.name = document.getElementById("edit-ex-name").value;
    ex.animation = document.getElementById("edit-ex-anim").value;
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function deleteEx(id) {
    if(confirm("Radera övningen permanent?")) {
        masterExercises = masterExercises.filter(e => e.id !== id);
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
}

// --- KALENDER ---
function renderCalendar(isPickMode = false) {
    showView("calendar-view");
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = "";
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    document.getElementById("calendar-month-year").textContent = 
        new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(currentViewDate).toUpperCase();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay === 0 ? 7 : firstDay) - 1;

    for (let i = 0; i < startOffset; i++) {
        grid.appendChild(document.createElement("div"));
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const dayDiv = document.createElement("div");
        dayDiv.className = "calendar-day glass";
        
        const dayNum = document.createElement("span");
        dayNum.textContent = d;
        dayDiv.appendChild(dayNum);

        const workout = workoutHistory.filter(w => w.date === dateStr);
        workout.forEach(() => {
            const dot = document.createElement("div");
            dot.className = "workout-dot";
            dayDiv.appendChild(dot);
        });

        const override = calendarOverrides[dateStr];
        if (override && override !== "Vila") {
            const planLabel = document.createElement("div");
            planLabel.style.fontSize = "8px";
            planLabel.style.color = "var(--primary)";
            planLabel.style.marginTop = "2px";
            planLabel.textContent = "PLAN";
            dayDiv.appendChild(planLabel);
        }

        dayDiv.onclick = () => isPickMode ? startWorkout({name: "Fritt pass", id: "free-"+Date.now(), exercises: []}, null, dateStr) : openDayModal(dateStr);
        grid.appendChild(dayDiv);
    }
}

function openDayModal(date) {
    const body = document.getElementById("modal-body");
    const workouts = workoutHistory.filter(w => w.date === date);
    const plannedId = calendarOverrides[date];
    
    let html = `<h3>${date}</h3>`;
    
    if (workouts.length > 0) {
        html += `<h4>Genomförda pass:</h4>`;
        workouts.forEach((w, idx) => {
            html += `
                <div class="card glass" style="text-align:left; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${w.programName}</strong>
                        <span style="color:var(--primary)">${w.totalTime}</span>
                    </div>
                    <div style="margin-top:10px; display:flex; gap:10px;">
                        <button class="reorder-btn" onclick="editLoggedWorkout('${date}', ${idx})">Redigera</button>
                        <button class="reorder-btn" style="color:var(--danger)" onclick="confirmDeleteLoggedWorkout('${date}', ${idx})">Radera</button>
                    </div>
                </div>
            `;
        });
    }

    const currentPlanned = programData.routine.find(p => p.id === plannedId);
    html += `<div class="separator"></div>`;
    
    if (currentPlanned) {
        html += `
            <p style="font-size:14px; margin-bottom:10px;">Planerat: <strong>${currentPlanned.name}</strong></p>
            <button class="mode-btn green" id="dynamic-start-btn" onclick="prepareStart('${date}', '${currentPlanned.id}')">Starta ${currentPlanned.name} 🔥</button>
        `;
    } else if (plannedId === "Vila") {
        html += `<p style="color:var(--text-light); margin-bottom:10px;">Planerat: <strong>Vila 😴</strong></p>`;
    } else {
        html += `<button class="mode-btn blue" onclick="startWorkout({name: 'Fritt pass', id: 'free-'+Date.now(), exercises: []}, null, '${date}')">Starta ett fritt pass</button>`;
    }

    html += `
        <button class="mode-btn glass-border" onclick="showOverrideOptions('${date}')" style="margin-top:10px;">ÄNDRA PLANERING</button>
        <button class="mode-btn" onclick="closeModal()">Stäng</button>
    `;
    
    body.innerHTML = html;
    openModal();
}

function showOverrideOptions(date) {
    const body = document.getElementById("modal-body");
    let html = `<h3>Planera för ${date}</h3>`;
    
    // Träningspassen
    programData.routine.forEach(p => {
        html += `<button class="mode-btn glass-border" onclick="updatePlannedButton('${date}', '${p.id}', '${p.name}')">${p.name}</button>`;
    });

    // Separera VILA på egen rad med unik stil
    html += `
        <div style="margin-top:15px; border-top: 1px solid var(--glass-border); padding-top:15px;">
            <button class="mode-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--text-light); color: var(--text-light);" onclick="setOverride('${date}', 'Vila')">Markera som Vila 😴</button>
        </div>
        <button class="mode-btn" style="margin-top:10px;" onclick="openDayModal('${date}')">Tillbaka</button>
    `;
    body.innerHTML = html;
}

// Hjälpfunktion för att uppdatera startknappen dynamiskt i modalen
function updatePlannedButton(date, id, name) {
    calendarOverrides[date] = id;
    saveAll();
    openDayModal(date);
}

// --- PROGRAM-VY ---
function renderProgramView(highlightIdx = null) {
    showView("programs-view");
    const container = document.getElementById("programs-list");
    container.innerHTML = "";
    
    programData.routine.forEach((pass, idx) => {
        const card = document.createElement("div");
        card.className = "card glass";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">${pass.name}</h3>
                <div style="display:flex; gap:10px;">
                    <button class="reorder-btn" onclick="showProgramDetails(${idx})">Övningar</button>
                    <button class="reorder-btn" onclick="openEditProgramModal(${idx})">Inställningar</button>
                </div>
            </div>
            <div id="details-${idx}" class="hidden" style="margin-top:15px; border-top:1px solid var(--glass-border); padding-top:10px;"></div>
        `;
        container.appendChild(card);
    });
}

function showProgramDetails(idx) {
    const det = document.getElementById(`details-${idx}`);
    const isHidden = det.classList.contains("hidden");
    document.querySelectorAll('[id^="details-"]').forEach(d => d.classList.add("hidden"));
    
    if (isHidden) {
        det.classList.remove("hidden");
        const pass = programData.routine[idx];
        det.innerHTML = pass.exercises.map(ex => `
            <div style="display:flex; justify-content:space-between; font-size:14px; margin-bottom:5px; color:var(--text-light);">
                <span>${ex.name}</span>
                <span>${ex.defaultSets || 3} set</span>
            </div>
        `).join('') + `<button class="mode-btn green" style="margin-top:10px;" onclick="startWorkout(programData.routine[${idx}])">STARTA PASS</button>`;
    }
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    
    let exercisesHtml = pass.exercises.map((ex, eIdx) => `
        <div class="card glass" style="margin-bottom:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:14px;">${ex.name}</div>
            <div style="display:flex; gap:5px;">
                <button class="reorder-btn" onclick="moveExercise(${idx}, ${eIdx}, -1)">↑</button>
                <button class="reorder-btn" onclick="moveExercise(${idx}, ${eIdx}, 1)">↓</button>
                <button class="reorder-btn" style="color:var(--danger)" onclick="removeExFromPass(${idx}, ${eIdx})">✕</button>
            </div>
        </div>
    `).join('');

    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN PÅ PASS</label>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        
        <div style="margin:15px 0;">
            <h4 style="text-align:left; margin-left:10px; margin-bottom:10px;">Övningar</h4>
            ${exercisesHtml}
        </div>

        <div class="separator"></div>
        <select id="add-ex-select" class="log-input">
            <option value="">-- Välj övning att lägga till --</option>
            ${masterExercises.map(ex => `<option value="${ex.id}">${ex.name}</option>`).join('')}
        </select>
        <button class="mode-btn glass-border" style="font-size:13px;" onclick="addExerciseToPass(${idx})">+ Lägg till vald övning</button>
        <button class="mode-btn glass-border" style="font-size:13px; margin-top:5px;" onclick="createNewExForPass(${idx})">+ Skapa & lägg till ny övning</button>
        
        <div class="separator"></div>
        <button class="mode-btn blue" onclick="saveProgramEdit(${idx})">Spara ändringar</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteEntireProgram(${idx})">Radera hela passet</button>
    `;
    openModal();
}

function deleteEntireProgram(idx) {
    if(confirm("Radera hela passet permanent?")) {
        programData.routine.splice(idx, 1);
        saveAll(); closeModal(); renderProgramView();
    }
}

function addExerciseToPass(pIdx) {
    const exId = document.getElementById("add-ex-select").value;
    if(!exId) return;
    const ex = masterExercises.find(e => e.id == exId);
    programData.routine[pIdx].exercises.push({ name: ex.name, target: ex.target, defaultSets: 3 });
    openEditProgramModal(pIdx);
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
    saveAll(); closeModal(); renderProgramView(idx); showProgramDetails(idx);
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
    if(!data) {
        data = workout.exercises.map(ex => {
            const history = getExerciseHistory(ex.name);
            if (history) {
                return { sets_data: JSON.parse(JSON.stringify(history)), isCompleted: false };
            }
            return { sets_data: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }], isCompleted: false };
        });
    }

    if(!activeDraft || activeDraft.workout.name !== workout.name || date !== activeDraft.date) {
        activeDraft = { 
            workout: JSON.parse(JSON.stringify(workout)), 
            data: data, 
            date: date || new Date().toISOString().split('T')[0],
            secondsElapsed: 0,
            pausedSeconds: 0,
            startTime: null,
            isStarted: isImmediateStart
        };
    }
    
    secondsElapsed = activeDraft.secondsElapsed || 0;

    renderActiveWorkout();
    updateTimerDisplay();
    
    if(activeDraft.isStarted && !activeDraft.isEditing) startTimer();
    else pauseTimer();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    const footer = document.querySelector(".workout-footer");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        footer.classList.add("hidden");
        list.innerHTML = `
            <div style="text-align:center; padding:20px 0;">
                <button class="mode-btn green" style="width:100%; padding:20px; font-size:18px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>
            </div>
            <p style="color:var(--text-light); font-size:13px; text-align:center; margin-top:10px;">Klicka på knappen ovan för att starta klockan.</p>
        `;
        document.getElementById("workout-timer").textContent = "00:00:00";
        showView("workout-view");
        return;
    }

    footer.classList.remove("hidden");

    // Spara utkast-knapp (Klockan fortsätter ticka fram till reload)
    const pauseBtn = document.getElementById("pause-workout-btn");
    pauseBtn.innerHTML = `Spara utkast 💾`;
    pauseBtn.className = "mode-btn save-draft-btn";
    pauseBtn.onclick = () => { 
        location.reload(); 
    };

    let discardBtn = document.getElementById("discard-workout-btn");
    if(!discardBtn) {
        discardBtn = document.createElement("button");
        discardBtn.id = "discard-workout-btn";
        discardBtn.className = "mode-btn";
        discardBtn.style.cssText = "background:none; color:var(--danger); border:1px solid var(--danger); font-size:13px; margin-top:10px;";
        discardBtn.textContent = "Kasta träningspass 🗑️";
        discardBtn.onclick = discardWorkout;
        footer.appendChild(discardBtn);
    }

    activeDraft.workout.exercises.forEach((ex, i) => {
        const exerciseData = activeDraft.data[i];
        const isDone = exerciseData.isCompleted;
        const div = document.createElement("div");
        div.className = "card glass" + (isDone ? " exercise-done" : "");
        
        // ANIMATIONER BORTTAGNA HÄR ENLIGT ÖNSKEMÅL (PUNKT 3)

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
            <button onclick="openExerciseOptions(${i})" style="color:var(--danger); background:none; border:none; font-size:20px;" ${isDone ? 'disabled' : ''}> ✖ </button>
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

function discardWorkout() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Kasta träningspass?</h3>
        <p style="text-align:center; color:var(--text-light); margin-bottom:20px;">Är du säker på att du vill kasta passet? Ingen data kommer att sparas.</p>
        <button class="mode-btn" style="background:var(--danger); color:white;" onclick="confirmDiscard()">Ja, kasta passet 🗑️</button>
        <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
    `;
    openModal();
}

function confirmDiscard() {
    pauseTimer();
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    location.reload();
}

function openExerciseOptions(i) {
    const ex = activeDraft.workout.exercises[i];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Hantera övning</h3>
        <p style="text-align:center; font-weight:700; color:var(--primary); margin-bottom:20px;">${ex.name}</p>
        <button class="mode-btn orange" onclick="replaceExerciseView(${i})">Byt ut övning 🔄</button>
        <button class="mode-btn" style="background:var(--danger); color:white;" onclick="removeActiveExercise(${i}); closeModal();">Ta bort från passet ✖</button>
        <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
    `;
    openModal();
}

function replaceExerciseView(i) {
    renderExercisePicker("Ben", (newExId) => {
        const newEx = masterExercises.find(e => e.id == newExId);
        activeDraft.workout.exercises[i] = { name: newEx.name, target: newEx.target };
        
        const history = getExerciseHistory(newEx.name);
        if(history) {
            activeDraft.data[i] = { sets_data: JSON.parse(JSON.stringify(history)), isCompleted: false };
        } else {
            activeDraft.data[i] = { sets_data: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }], isCompleted: false };
        }
        
        localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
        closeModal();
        renderActiveWorkout();
    });
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
    activeDraft.startTime = Date.now();
    activeDraft.pausedSeconds = 0;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    startTimer();
}

function openAddExerciseToWorkoutModal() {
    renderExercisePicker("Ben");
    openModal();
}

function renderExercisePicker(category, onSelectCallback = null) {
    const body = document.getElementById("modal-body");
    const categories = ["Ben", "Bröst", "Rygg", "Axlar", "Armar", "Bål"];
    
    let html = `<h3>Välj Övning</h3>`;
    
    html += `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px; margin-bottom:15px;">`;
    categories.forEach(cat => {
        const isActive = cat === category;
        html += `<button onclick="renderExercisePicker('${cat}', ${onSelectCallback ? onSelectCallback.toString() : 'null'})" 
            style="padding:8px 5px; font-size:10px; border-radius:8px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; 
            background:${isActive ? 'rgba(56,189,248,0.1)' : 'none'}; color:${isActive ? 'var(--primary)' : 'white'}; cursor:pointer;">
            ${cat}
        </button>`;
    });
    html += `</div>`;
    
    html += `<div style="max-height:250px; overflow-y:auto; padding-right:5px; margin-bottom:15px;">`;
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    
    filtered.forEach(ex => {
        const action = onSelectCallback ? `(${onSelectCallback})(${ex.id})` : `confirmAddExerciseToActive(${ex.id})`;
        html += `
        <div class="card glass" style="padding:12px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="${action}">
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
    renderActiveWorkout();
}

// --- STANDARD-LOGIK OCH NAVBAR ---
const homeBtn = document.getElementById("global-home");
if(homeBtn) homeBtn.onclick = () => location.reload();

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
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
}

const saveWorkoutBtn = document.getElementById("save-workout-btn");
if(saveWorkoutBtn) {
    saveWorkoutBtn.onclick = () => {
        if(!activeDraft.isStarted) {
            discardWorkout();
            return;
        }

        pauseTimer();
        const finalTime = document.getElementById("workout-timer").textContent;
        
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
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); openDayModal(date); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date, false); }

// Designfull raderings-modal (PUNKT 4)
function confirmDeleteLoggedWorkout(date, idx) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3 style="color:var(--danger)">Radera passet?</h3>
        <p style="text-align:center; color:var(--text-light); margin-bottom:20px;">Detta går inte att ångra. Vill du ta bort passet från historiken?</p>
        <button class="mode-btn" style="background:var(--danger); color:white;" onclick="deleteLoggedWorkout('${date}', ${idx})">Ja, radera pass ✕</button>
        <button class="mode-btn glass-border" onclick="openDayModal('${date}')">Avbryt</button>
    `;
    openModal();
}

function deleteLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    workoutHistory = workoutHistory.filter(w => w !== item);
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null; 
    saveAll(); 
    closeModal(); 
    renderCalendar();
}

function editLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    const workoutObj = { id: "edit-" + Date.now(), name: item.programName, exercises: item.exercises.map(ex => ({ name: ex.name })) };
    
    const dataObj = item.exercises.map(ex => {
        if(ex.sets_data) return { sets_data: ex.sets_data, isCompleted: true };
        return { sets_data: Array(parseInt(ex.sets || 1)).fill({ weight: ex.weight, reps: ex.reps }), isCompleted: true };
    });

    const oldTime = item.totalTime || "00:00:00";
    const parts = oldTime.split(':');
    const oldSeconds = (parseInt(parts[0]) * 3600) + (parseInt(parts[1]) * 60) + parseInt(parts[2]);

    workoutHistory = workoutHistory.filter(w => w !== item);
    localStorage.removeItem("activeWorkoutDraft");
    
    activeDraft = {
        workout: workoutObj,
        data: dataObj,
        date: date,
        secondsElapsed: oldSeconds,
        pausedSeconds: oldSeconds,
        startTime: null,
        isStarted: true,
        isEditing: true
    };
    
    secondsElapsed = oldSeconds;
    closeModal();
    renderActiveWorkout();
    updateTimerDisplay();
}
