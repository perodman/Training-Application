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
            json.routine.forEach(p => p.exercises.forEach(ex => {
                if (!masterExercises.find(m => m.name === ex.name)) {
                    masterExercises.push({ ...ex, id: Date.now() + Math.random() });
                }
            }));
            localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
        }
        programData = savedProgram || json;
        populateMonthDropdown();
        renderHome();
    });

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

// --- PUNKT 4: Månadsnavigering ---
function populateMonthDropdown() {
    const select = document.getElementById("month-select-dropdown");
    select.innerHTML = "";
    for (let i = -12; i <= 12; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        const val = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = label;
        if (i === 0) opt.selected = true;
        select.appendChild(opt);
    }
}

function jumpToMonth(val) {
    const [year, month] = val.split("-");
    currentViewDate.setFullYear(parseInt(year));
    currentViewDate.setMonth(parseInt(month));
    renderCalendar();
}

// --- KALENDER & HISTORIK ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement("div");
        cell.className = "calendar-cell";

        const workouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr;
        const override = calendarOverrides[dateStr];
        
        let displayPass = null;
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if ([1, 3, 5].includes(new Date(year, month, d).getDay()) && override !== "none") {
            displayPass = programData.routine[d % programData.routine.length];
        }

        let info = "";
        if (workouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = "⏱️"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }

        cell.innerHTML = `<span>${d}</span><span style="font-size:10px; font-weight:900;">${info}</span>`;
        cell.onclick = () => openDayManager(dateStr, displayPass, workouts, isOngoing);
        grid.appendChild(cell);
    }
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("calendar-view").classList.remove("hidden");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;

    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${w.programName}</strong>
                    <div>
                        <button onclick="editLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right:10px;">✏️</button>
                        <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer;">✖</button>
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
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pass</button>`;
    } else {
        html += `<p>Just nu: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet  🔥 </button>`;
        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light);">Ändra planering:</p>`;
        programData.routine.forEach(p => {
            const isPlanned = planned && p.id === planned.id;
            html += `<button ${isPlanned ? 'disabled' : ''} class="mode-btn ${isPlanned ? 'btn-disabled' : 'glass-border'}" style="font-size:13px; padding:12px;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>`;
        });
        html += `<button class="mode-btn" style="color:var(--danger); background:none; font-size:13px;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- PUNKT 1: Redigera & Radera med bekräftelse ---
function deleteLoggedWorkout(date, idx) { 
    if(confirm("Är du säker på att du vill ta bort detta träningspass permanent?")) {
        const dateWorkouts = workoutHistory.filter(w => w.date === date);
        const itemToRemove = dateWorkouts[idx];
        workoutHistory = workoutHistory.filter(w => w !== itemToRemove);
        saveAll(); 
        closeModal(); 
        renderCalendar(); 
    }
}

function editLoggedWorkout(date, idx) {
    const dateWorkouts = workoutHistory.filter(w => w.date === date);
    const workout = dateWorkouts[idx];
    const body = document.getElementById("modal-body");
    
    let html = `<h3>Redigera Pass</h3><p>${workout.programName}</p>`;
    workout.exercises.forEach((ex, i) => {
        html += `
            <div style="text-align:left; margin-bottom:15px; padding:10px; border-radius:10px; background:rgba(0,0,0,0.2);">
                <strong style="font-size:13px;">${ex.name}</strong>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:5px; margin-top:5px;">
                    <input type="number" id="edit-w-${i}" class="log-input" value="${ex.weight}" style="margin:0; font-size:12px;">
                    <input type="number" id="edit-r-${i}" class="log-input" value="${ex.reps}" style="margin:0; font-size:12px;">
                    <input type="number" id="edit-s-${i}" class="log-input" value="${ex.sets}" style="margin:0; font-size:12px;">
                </div>
            </div>`;
    });
    html += `<button class="mode-btn blue" onclick="saveEditedWorkout('${date}', ${idx})">Spara ändringar</button>`;
    body.innerHTML = html;
}

function saveEditedWorkout(date, idx) {
    const dateWorkouts = workoutHistory.filter(w => w.date === date);
    const workout = dateWorkouts[idx];
    
    workout.exercises.forEach((ex, i) => {
        ex.weight = document.getElementById(`edit-w-${i}`).value || "0";
        ex.reps = document.getElementById(`edit-r-${i}`).value || "0";
        ex.sets = document.getElementById(`edit-s-${i}`).value || "0";
    });
    
    saveAll();
    closeModal();
    renderCalendar();
}

// --- PROGRAM-VY (MODERNISERAD) ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const card = document.createElement("div");
        card.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        card.innerHTML = `<span>${pass.name}</span>`;
        card.onclick = () => {
            renderProgramView(i);
            showProgramDetails(i);
        };
        selector.appendChild(card);
    });
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("programs-view").classList.remove("hidden");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    const list = document.getElementById("program-exercise-list");
    list.classList.remove("hidden");
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <h3 style="margin:0; text-align:left;">${pass.name}</h3>
            <button class="order-btn" style="background:var(--primary); color:#0f172a; padding:5px 12px; border-radius:8px; font-weight:800; border:none; cursor:pointer;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `<div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--glass-border);"><span>${e.name}</span><small style="color:var(--primary); font-weight:800;">${e.target}</small></div>`).join("")}
    `;
}

// --- ÖVNINGAR ---
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
            <button style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="openEditExerciseModal(${ex.id})"> ⚙️ </button>`;
        results.appendChild(div);
    });
}

function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Övningsnamn">
        <select id="new-ex-target" class="log-input">
            <option value="Ben">Ben</option><option value="Bröst">Bröst</option><option value="Rygg">Rygg</option><option value="Axlar">Axlar</option><option value="Biceps">Biceps</option><option value="Triceps">Triceps</option><option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-target").value;
    if(name) {
        masterExercises.push({ id: Date.now(), name, target });
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
}

// --- NAVIGATION & ÖVRIGT ---
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { document.querySelectorAll(".view").forEach(v => v.classList.add("hidden")); document.getElementById("exercises-view").classList.remove("hidden"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();

function renderHome() {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("home-view").classList.remove("hidden");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }

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
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("workout-view").classList.remove("hidden");
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
