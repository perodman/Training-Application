let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

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

// --- ÖVNINGAR (Fix för punkt 3) ---
function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <label style="font-size:11px;">Namn</label>
        <input type="text" id="new-ex-name" class="log-input" placeholder="T.ex. Knäböj">
        <label style="font-size:11px;">Kategori</label>
        <select id="new-ex-cat" class="log-input" style="appearance: none;">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara Övning</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-cat").value;
    if(!name) return alert("Ange ett namn!");

    const newEx = {
        id: Date.now(),
        name: name,
        target: target,
        defaultSets: 3
    };

    masterExercises.push(newEx);
    saveAll();
    closeModal();
    filterExercises(currentExerciseCategory);
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

// --- KALENDER & MÅNADSVÄLJARE (Punkt 4) ---
function openMonthPicker() {
    const body = document.getElementById("modal-body");
    let html = `<h3>Välj månad</h3><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">`;
    const months = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];
    months.forEach((m, i) => {
        html += `<button class="mode-btn glass-border" style="padding:15px; font-size:14px;" onclick="selectMonth(${i})">${m}</button>`;
    });
    html += `</div>`;
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function selectMonth(m) {
    currentViewDate.setMonth(m);
    closeModal();
    renderCalendar();
}

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
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            displayPass = programData.routine[d % programData.routine.length];
        }

        let info = "";
        if (hasWorkouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = " ⏱️ "; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
        cell.innerHTML = `<span>${d}</span><span style="font-size:10px; font-weight:900;">${info}</span>`;
        cell.onclick = () => openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

// --- DAY MANAGER (Fix för punkt 1 & 2) ---
function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;
    
    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${w.programName}</strong>
                    <div>
                        <button onclick="editLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:16px; margin-right:10px;"> ✏️ </button>
                        <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px;"> ✖ </button>
                    </div>
                </div>
                <div style="margin-top:10px;">`;
            w.exercises.forEach(ex => {
                html += `<div style="font-size:12px; margin-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                    <span style="color:var(--text-light)">${ex.name}:</span><br>
                    <span style="color:var(--primary); font-weight:700;">${ex.weight} kg x ${ex.reps} reps x ${ex.sets} set</span>
                </div>`;
            });
            html += `</div></div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p>Just nu: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet   🔥  </button>`;
        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light);">Ändra planering:</p>`;
        programData.routine.forEach(p => {
            const isPlanned = planned && p.id === planned.id;
            // Punkt 2: Uppdaterad design för utgråad knapp
            html += `<button ${isPlanned ? 'disabled' : ''} class="mode-btn ${isPlanned ? 'btn-disabled' : 'glass-border'}" style="font-size:13px; padding:12px;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>`;
        });
        html += `<button class="mode-btn" style="color:var(--danger); background:none; font-size:13px;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function deleteLoggedWorkout(date, idx) {
    if(confirm("Är du säker på att du vill radera detta träningspass?")) {
        const filtered = workoutHistory.filter(w => w.date === date);
        const item = filtered[idx];
        workoutHistory = workoutHistory.filter(w => w !== item);
        saveAll(); 
        closeModal(); 
        renderCalendar();
    }
}

function editLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    
    // Konvertera historik-objektet till ett format startWorkout förstår
    const workoutObj = {
        name: item.programName,
        exercises: item.exercises.map(ex => ({ name: ex.name }))
    };
    const dataObj = item.exercises.map(ex => ({ weight: ex.weight, reps: ex.reps, sets: ex.sets }));
    
    // Ta bort det gamla passet först så det inte blir dubbelt när man sparar igen
    workoutHistory = workoutHistory.filter(w => w !== item);
    
    closeModal();
    startWorkout(workoutObj, dataObj, date);
}

// --- PROGRAM-VY (Fix för punkt 5) ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `
            <div style="font-size:24px;">${['⚡','🔥','🏆','💎'][i % 4]}</div>
            <h4>${pass.name}</h4>
            <div style="font-size:10px; color:var(--primary); margin-top:5px; font-weight:800;">${pass.exercises.length} ÖVNINGAR</div>
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
    const list = document.getElementById("program-exercise-list");
    list.classList.remove("hidden");
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid var(--glass-border);">
            <h3 style="margin:0; text-align:left; font-size:18px;">${pass.name}</h3>
            <button class="order-btn" style="background:var(--primary); color:#0f172a; padding:8px 15px; border-radius:10px; font-weight:800; border:none; cursor:pointer; font-size:12px;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `
            <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                <span style="font-weight:600;">${e.name}</span>
                <small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:9px; letter-spacing:1px;">${e.target}</small>
            </div>
        `).join("")}
    `;
}

// Resten av original-funktionerna (skapa pass, redigera pass, etc.)
function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>${ex.name}</span>
                <button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none;"> ✖ </button>
            </div>`).join("")}
        </div>
        <button class="mode-btn blue" onclick="saveProgramEdit(${idx})">Spara ändringar</button>
        <button class="mode-btn" style="background:none; color:var(--danger);" onclick="deleteProgram(${idx})">Radera hela passet</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function removeExFromPass(pIdx, eIdx) {
    programData.routine[pIdx].exercises.splice(eIdx, 1);
    openEditProgramModal(pIdx);
}

document.getElementById("add-custom-pass-btn").onclick = () => {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Nytt Pass</h3>
        <input type="text" id="new-pass-name" class="log-input" placeholder="Namn (t.ex. Pass D)">
        <p style="font-size:12px;">Välj övningar:</p>
        <div style="max-height:200px; overflow-y:auto; text-align:left;">
            ${masterExercises.map(ex => `
                <div style="margin-bottom:8px;">
                    <input type="checkbox" class="pass-ex-check" value="${ex.id}" id="check-${ex.id}">
                    <label for="check-${ex.id}">${ex.name}</label>
                </div>
            `).join("")}
        </div>
        <button class="mode-btn blue" style="margin-top:15px;" onclick="createNewPass()">Skapa Program</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
};

function createNewPass() {
    const name = document.getElementById("new-pass-name").value.trim() || "Nytt Pass";
    const selectedIds = Array.from(document.querySelectorAll(".pass-ex-check:checked")).map(c => c.value);
    const exercises = masterExercises.filter(ex => selectedIds.includes(String(ex.id)));
    programData.routine.push({ id: "custom-" + Date.now(), name: name, exercises: exercises });
    saveAll(); closeModal(); renderProgramView();
}

function saveProgramEdit(idx) {
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll(); closeModal(); renderProgramView(idx); showProgramDetails(idx);
}

function deleteProgram(idx) {
    if(confirm("Vill du radera detta pass?")) {
        programData.routine.splice(idx, 1);
        saveAll(); closeModal(); renderProgramView();
    }
}

// Navigation & Workout Logic
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("stats-mode").onclick = renderStats;

function renderHome() {
    showView("home-view");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
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

function startWorkout(workout, data = null, date = null) {
    activeDraft = { workout, data, date: date || new Date().toISOString().split('T')[0] };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    workout.exercises.forEach((ex, i) => {
        const val = data ? data[i] : { weight: "", reps: "", sets: 3 };
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `<strong>${ex.name}</strong>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:10px;">
            <input type="number" id="w-${i}" class="log-input" placeholder="KG" value="${val.weight}">
            <input type="number" id="r-${i}" class="log-input" placeholder="Reps" value="${val.reps}">
            <input type="number" id="s-${i}" class="log-input" placeholder="Set" value="${val.sets}">
        </div>`;
        list.appendChild(div);
    });
    showView("workout-view");
}

document.getElementById("save-workout-btn").onclick = () => {
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
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
    renderCalendar();
};

document.getElementById("pause-workout-btn").onclick = () => {
    const data = activeDraft.workout.exercises.map((ex, i) => ({
        weight: document.getElementById(`w-${i}`).value,
        reps: document.getElementById(`r-${i}`).value,
        sets: document.getElementById(`s-${i}`).value
    }));
    activeDraft.data = data;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    location.reload();
};

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }
