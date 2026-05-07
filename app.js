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

// --- KALENDER & HISTORIK ---
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
        const isAutoDay = [1, 3, 5].includes(dayOfWeek); // Mån, Ons, Fre
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

        cell.innerHTML = `<span>${d}</span><span style="font-size:10px; font-weight:900;">${info}</span>`;
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
                <div style="display:flex; justify-content:space-between;"><strong>${w.programName}</strong><button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer;">✖</button></div>
                <div style="margin-top:10px;">`;
            // Punkt 2: Visa detaljer för varje övning
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

// --- PROGRAM-VY & REDIGERING ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const btn = document.createElement("button");
        // Punkt 3 & 5: Mindre knappar och aktiv markering
        btn.className = `mode-btn glass-border ${activeIdx === i ? 'active' : ''}`;
        btn.textContent = pass.name;
        btn.onclick = () => {
            renderProgramView(i);
            showProgramDetails(i);
        };
        selector.appendChild(btn);
    });
    showView("programs-view");
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
        ${pass.exercises.map(e => `
            <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--glass-border);">
                <span>${e.name}</span>
                <small style="color:var(--primary); font-weight:800;">${e.target}</small>
            </div>
        `).join("")}
    `;
}

// Punkt 3: Fungerande redigering av pass
function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <label style="font-size:11px;">Namn på pass</label>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div class="separator"></div>
        <p style="font-size:12px;">Övningar i passet:</p>
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span>${ex.name}</span>
                <button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none;">✖</button>
            </div>`).join("")}
        </div>
        <button class="mode-btn blue" onclick="saveProgramEdit(${idx})">Spara ändringar</button>
        <button class="mode-btn" style="background:none; color:var(--danger);" onclick="deleteProgram(${idx})">Radera hela passet</button>
    `;
    document.getElementById("workout-modal").classList.remove("hidden");
}

// Punkt 4: Skapa nytt pass
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
    
    programData.routine.push({
        id: "custom-" + Date.now(),
        name: name,
        exercises: exercises
    });
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

// --- NAVIGATION & ÖVRIGT ---
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

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }
function deleteLoggedWorkout(date, idx) { 
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    workoutHistory = workoutHistory.filter(w => w !== item);
    saveAll(); closeModal(); renderCalendar(); 
}
