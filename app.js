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

    if(target) {

        target.classList.remove("hidden");

        // Trigga animation genom att ta bort och lägga till klassen (om den redan finns)

        target.style.animation = 'none';

        target.offsetHeight; 

        target.style.animation = null;

    }

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

        // Spara tid i draften löpande

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



// --- ÖVNINGAR & INSTÄLLNINGAR ---

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

    if(confirm("Vill du radera denna övning permanent?")) {

        masterExercises = masterExercises.filter(e => e.id != id);

        saveAll(); closeModal(); filterExercises(currentExerciseCategory);

    }

}



// --- KALENDER ---

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

        const isOngoing = activeDraft && activeDraft.date === dateStr;

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

            const timeStr = w.totalTime ? `⏱️ ${w.totalTime}` : "";

            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">

                <div style="display:flex; justify-content:space-between; align-items:center;">

                    <strong>${w.programName}</strong>

                    <div style="font-size:10px; color:var(--text-light)">${timeStr}</div>

                    <div>

                        <button onclick="editLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:16px; margin-right:10px;"> ✏️ </button>

                        <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px;"> ✖ </button>

                    </div>

                </div>

                <div style="margin-top:10px;">`;

            w.exercises.forEach(ex => {

                html += `<div style="font-size:12px; margin-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">

                    <span style="color:var(--text-light)">${ex.name}:</span><br>

                    <span style="color:var(--primary); font-weight:700;">${ex.weight} kg x ${ex.reps} x ${ex.sets} set</span>

                </div>`;

            });

            html += `</div></div>`;

        });

    } else if (isOngoing) {

        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;

    } else {

        html += `<p style="text-align:center;">Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;

        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet     🔥    </button>`;

        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Ändra planering:</p>`;

        programData.routine.forEach(p => {

            const isPlanned = planned && p.id === planned.id;

            html += `<button ${isPlanned ? 'disabled' : ''} class="mode-btn ${isPlanned ? 'btn-disabled' : 'glass-border'}" style="font-size:14px;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>`;

        });

        html += `<button class="mode-btn" style="color:var(--danger); background:none; font-size:14px;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;

    }

    body.innerHTML = html;

    openModal();

}



function openMonthPicker() {

    const body = document.getElementById("modal-body");

    let html = `<h3>Välj månad</h3><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">`;

    const months = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];

    months.forEach((m, i) => { html += `<button class="mode-btn glass-border" style="font-size:14px;" onclick="selectMonth(${i})">${m}</button>`; });

    body.innerHTML = html + `</div>`;

    openModal();

}



function selectMonth(m) { currentViewDate.setMonth(m); closeModal(); renderCalendar(); }



// --- PROGRAM & REDIGERING ---

function renderProgramView(activeIdx = null) {

    const selector = document.getElementById("pass-selector-list");

    selector.innerHTML = "";

    programData.routine.forEach((pass, i) => {

        const div = document.createElement("div");

        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;

        div.innerHTML = `<div style="font-size:24px;">${['⚡','🔥','🏆','💎'][i % 4]}</div><h4>${pass.name}</h4><div style="font-size:10px; color:var(--primary); margin-top:5px; font-weight:800;">${pass.exercises.length} ÖVNINGAR</div>`;

        div.onclick = () => { renderProgramView(i); showProgramDetails(i); };

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

        ${pass.exercises.map(e => `

            <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.03);">

                <span style="font-weight:600;">${e.name}</span>

                <small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:9px;">${e.target}</small>

            </div>

        `).join("")}

    `;

}



function openEditProgramModal(idx) {

    const pass = programData.routine[idx];

    const body = document.getElementById("modal-body");

    body.innerHTML = `

        <h3>Redigera ${pass.name}</h3>

        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN PÅ PASS</label>

        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">

        

        <div id="edit-pass-exercises">

            ${pass.exercises.map((ex, i) => `

                <div class="edit-item-row">

                    <div style="display:flex; gap:8px;">

                        <button class="reorder-btn" onclick="moveExercise(${idx}, ${i}, -1)">▲</button>

                        <button class="reorder-btn" onclick="moveExercise(${idx}, ${i}, 1)">▼</button>

                    </div>

                    <span style="flex-grow:1; margin-left:15px; font-size:14px; font-weight:600;">${ex.name}</span>

                    <button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none; font-size:18px;"> ✖ </button>

                </div>`).join("")}

        </div>



        <div class="separator" style="margin: 20px 0;"></div>

        <p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Lägg till övning:</p>

        <select id="add-ex-select" class="log-input">

            <option value="">Välj från banken...</option>

            ${masterExercises.map(ex => `<option value="${ex.id}">${ex.name} (${ex.target})</option>`).join("")}

        </select>

        <button class="mode-btn glass-border" style="font-size:13px; padding:10px;" onclick="addExerciseToPass(${idx})">+ Lägg till vald</button>

        <button class="mode-btn glass-border" style="font-size:13px; padding:10px;" onclick="createNewExForPass(${idx})">+ Skapa ny övning till banken</button>



        <button class="mode-btn blue" style="margin-top:20px;" onclick="saveProgramEdit(${idx})">Spara alla ändringar</button>

        <button class="mode-btn" style="color:var(--danger); background:none; font-size:14px; margin-top:10px;" onclick="deleteEntireProgram(${idx})">Radera pass permanent</button>

    `;

    openModal();

}



function deleteEntireProgram(idx) {

    if(confirm("Vill du radera hela detta pass permanent?")) {

        programData.routine.splice(idx, 1);

        saveAll();

        closeModal();

        document.getElementById("program-details-area").classList.add("hidden");

        renderProgramView();

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



// --- AKTIVT PASS ---

function startWorkout(workout, data = null, date = null) {

    // Om det finns en draft med sparad tid, ladda den

    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;

    

    activeDraft = { 

        workout, 

        data: data || workout.exercises.map(()=>({weight:"", reps:"", sets:3})), 

        date: date || new Date().toISOString().split('T')[0],

        secondsElapsed: secondsElapsed

    };

    

    renderActiveWorkout();

    updateTimerDisplay();

    startTimer();

}



function renderActiveWorkout() {

    document.getElementById("active-title").textContent = activeDraft.workout.name;

    const list = document.getElementById("exercise-list");

    list.innerHTML = "";

    activeDraft.workout.exercises.forEach((ex, i) => {

        const val = activeDraft.data[i];

        const div = document.createElement("div");

        div.className = "card glass";

        div.innerHTML = `

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">

            <div style="display:flex; gap:8px;">

                <button class="reorder-btn" onclick="moveActiveExercise(${i}, -1)">▲</button>

                <button class="reorder-btn" onclick="moveActiveExercise(${i}, 1)">▼</button>

            </div>

            <strong style="font-size:16px;">${ex.name}</strong>

            <button onclick="removeActiveExercise(${i})" style="color:var(--danger); background:none; border:none; font-size:20px;"> ✖ </button>

        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">

            <div><small style="display:block; text-align:center; color:var(--text-light); font-size:10px;">KG</small>

            <input type="number" id="w-${i}" class="log-input" placeholder="0" value="${val.weight}" onchange="updateDraftData(${i})"></div>

            <div><small style="display:block; text-align:center; color:var(--text-light); font-size:10px;">REPS</small>

            <input type="number" id="r-${i}" class="log-input" placeholder="0" value="${val.reps}" onchange="updateDraftData(${i})"></div>

            <div><small style="display:block; text-align:center; color:var(--text-light); font-size:10px;">SET</small>

            <input type="number" id="s-${i}" class="log-input" placeholder="0" value="${val.sets}" onchange="updateDraftData(${i})"></div>

        </div>`;

        list.appendChild(div);

    });

    showView("workout-view");

}



function updateDraftData(idx) {

    activeDraft.data[idx] = {

        weight: document.getElementById(`w-${idx}`).value,

        reps: document.getElementById(`r-${idx}`).value,

        sets: document.getElementById(`s-${idx}`).value

    };

    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));

}



function moveActiveExercise(i, dir) {

    const newIdx = i + dir;

    if(newIdx < 0 || newIdx >= activeDraft.workout.exercises.length) return;

    [activeDraft.workout.exercises[i], activeDraft.workout.exercises[newIdx]] = [activeDraft.workout.exercises[newIdx], activeDraft.workout.exercises[i]];

    [activeDraft.data[i], activeDraft.data[newIdx]] = [activeDraft.data[newIdx], activeDraft.data[i]];

    renderActiveWorkout();

}



function removeActiveExercise(i) {

    if(confirm("Ta bort övningen?")) {

        activeDraft.workout.exercises.splice(i, 1);

        activeDraft.data.splice(i, 1);

        renderActiveWorkout();

    }

}



// --- STANDARD-LOGIK ---

document.getElementById("global-home").onclick = () => {

    pauseTimer(); // Stoppa intervallet om vi går hem

    location.reload();

}

document.getElementById("start-new-btn").onclick = renderCalendar;

document.getElementById("calendar-mode").onclick = renderCalendar;

document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };

document.getElementById("view-programs-btn").onclick = () => renderProgramView();

document.getElementById("stats-mode").onclick = renderStats;

document.getElementById("add-custom-pass-btn").onclick = openCreateProgramModal;



function renderHome() {

    showView("home-view");

    if(activeDraft) {

        document.getElementById("draft-alert").classList.remove("hidden");

        document.getElementById("start-new-btn").classList.add("hidden");

        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);

    }

}



document.getElementById("save-workout-btn").onclick = () => {

    pauseTimer();

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

    saveAll();

    localStorage.removeItem("activeWorkoutDraft");

    activeDraft = null; 

    secondsElapsed = 0;

    renderCalendar();

};



document.getElementById("pause-workout-btn").onclick = () => { 

    pauseTimer();

    location.reload(); 

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



function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }

function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }

function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }



function deleteLoggedWorkout(date, idx) {

    if(confirm("Radera passet?")) {

        const filtered = workoutHistory.filter(w => w.date === date);

        const item = filtered[idx];

        workoutHistory = workoutHistory.filter(w => w !== item);

        localStorage.removeItem("activeWorkoutDraft");

        activeDraft = null; 

        saveAll(); closeModal(); renderCalendar();

    }

}



function editLoggedWorkout(date, idx) {

    const filtered = workoutHistory.filter(w => w.date === date);

    const item = filtered[idx];

    const workoutObj = { name: item.programName, exercises: item.exercises.map(ex => ({ name: ex.name })) };

    const dataObj = item.exercises.map(ex => ({ weight: ex.weight, reps: ex.reps, sets: ex.sets }));

    workoutHistory = workoutHistory.filter(w => w !== item);

    localStorage.removeItem("activeWorkoutDraft");

    activeDraft = null;

    closeModal();

    startWorkout(workoutObj, dataObj, date);

}
