let programData;
let masterExercises = []; 
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();

// --- INIT ---
fetch("program.json").then(r => r.json()).then(json => {
    const saved = JSON.parse(localStorage.getItem("myCustomProgram"));
    
    // Säkerställ att masterlistan alltid är komplett från start
    json.routine.forEach(p => {
        p.exercises.forEach(ex => {
            if (!masterExercises.find(m => m.name === ex.name)) {
                masterExercises.push({...ex});
            }
        });
    });

    programData = saved || json;
    renderHome();
});

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

function renderHome() {
    showView("home-view");
    const draftAlert = document.getElementById("draft-alert");
    const startBtn = document.getElementById("start-new-btn");
    
    if (activeDraft) {
        draftAlert.classList.remove("hidden");
        startBtn.classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => {
            startWorkout(activeDraft.workout, activeDraft.data);
        };
    } else {
        draftAlert.classList.add("hidden");
        startBtn.classList.remove("hidden");
    }
}

// --- KALENDER ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    const rawMonth = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    label.textContent = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = dateObj.toISOString().split('T')[0];
        const cell = document.createElement("div");
        cell.className = "calendar-cell";

        const isDone = workoutHistory.some(w => w.date.startsWith(dateStr));
        const dayOfWeek = dateObj.getDay();
        const isAutoDay = [2, 4, 6].includes(dayOfWeek);
        const override = calendarOverrides[dateStr];

        let displayPass = null;
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            const dayCounter = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24 * 2)); 
            const idx = dayCounter % programData.routine.length;
            displayPass = programData.routine[idx];
        }

        let passLabel = "";
        if (isDone) {
            cell.classList.add("cell-completed");
            passLabel = "KLART";
        } else if (displayPass) {
            cell.classList.add("cell-planned");
            passLabel = displayPass.name.split(" ").pop();
        }

        cell.innerHTML = `<span>${d}</span><span class="cell-info">${passLabel}</span>`;
        cell.onclick = () => openDayManager(dateStr, displayPass?.id, isDone);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, passId, isDone) {
    const body = document.getElementById("modal-body");
    if (isDone) {
        body.innerHTML = `<h3>${dateStr}</h3><p>Passet är genomfört!</p>`;
    } else {
        const currentPass = programData.routine.find(p => p.id === passId);
        body.innerHTML = `
            <h3>${dateStr}</h3>
            <p>Planerat: <strong>${currentPass ? currentPass.name : 'Vila'}</strong></p>
            <hr>
            <h4>Ändra till:</h4>
            ${programData.routine.map(p => `
                <button class="mode-btn blue" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>
            `).join("")}
            <button class="mode-btn red" onclick="setOverride('${dateStr}', 'none')">Sätt som vilodag</button>
        `;
    }
    document.getElementById("workout-modal").classList.remove("hidden");
}

function setOverride(dateStr, val) {
    calendarOverrides[dateStr] = val;
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
    closeModal();
    renderCalendar();
}

// --- ÖVNINGAR VYN ---
function filterExercises(category) {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[data-cat="${category}"]`);
    if(btn) btn.classList.add("active");

    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    const filtered = masterExercises.filter(ex => {
        if (category === "Armar") return ex.target === "Biceps" || ex.target === "Triceps";
        return ex.target === category;
    });
    filtered.forEach(ex => {
        results.innerHTML += `<div class="card" style="padding:15px; display:flex; justify-content:space-between;"><strong>${ex.name}</strong><span style="font-size:12px; color:var(--primary); font-weight:800;">${ex.target}</span></div>`;
    });
}

// --- TRÄNINGSPROGRAM REDIGERING ---
function renderProgramView() {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const btn = document.createElement("button");
        btn.className = "mode-btn blue";
        btn.textContent = pass.name;
        btn.onclick = () => showProgramDetails(i);
        selector.appendChild(btn);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    const list = document.getElementById("program-exercise-list");
    list.classList.remove("hidden");
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">${pass.name}</h3>
            <button class="mode-btn indigo" style="width:auto; padding:8px 15px;" onclick="openEditModal(${idx})">Redigera</button>
        </div>
        <hr>
        ${pass.exercises.map(e => `<div class="edit-item"><span>${e.name}</span><small>${e.target}</small></div>`).join("")}
    `;
}

function openEditModal(pIdx) {
    const pass = programData.routine[pIdx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <div id="edit-ex-list"></div>
        <hr>
        <h4 style="margin-bottom:10px;">Lägg till övning</h4>
        <select id="muscle-group-select" class="log-input" onchange="updateExerciseDropdown()" style="margin-bottom:10px; font-size:14px;">
            <option value="">Välj muskelgrupp...</option>
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <select id="bank-select" class="log-input" disabled style="margin-bottom:10px; font-size:14px;"></select>
        <button id="add-btn-modal" class="mode-btn green" onclick="addFromBank(${pIdx})" disabled>+ Lägg till övning</button>
        <hr>
        <button class="mode-btn red" onclick="deleteEntirePass(${pIdx})" style="margin-top:20px;">RADERA HELA PASSET</button>
    `;

    const list = body.querySelector("#edit-ex-list");
    pass.exercises.forEach((ex, i) => {
        const item = document.createElement("div");
        item.className = "edit-item";
        item.innerHTML = `
            <div style="display:flex; flex-direction:column;">
                <span style="font-weight:700;">${ex.name}</span>
                <span class="red-text" style="font-size:11px; cursor:pointer; font-weight:800;" onclick="removeFromPass(${pIdx}, ${i})">TA BORT</span>
            </div>
            <div class="order-controls">
                <button class="order-btn" onclick="moveExercise(${pIdx}, ${i}, -1)">↑</button>
                <button class="order-btn" onclick="moveExercise(${pIdx}, ${i}, 1)">↓</button>
            </div>
        `;
        list.appendChild(item);
    });

    document.getElementById("workout-modal").classList.remove("hidden");
}

function moveExercise(pIdx, exIdx, direction) {
    const exercises = programData.routine[pIdx].exercises;
    const newIdx = exIdx + direction;
    if (newIdx >= 0 && newIdx < exercises.length) {
        const temp = exercises[exIdx];
        exercises[exIdx] = exercises[newIdx];
        exercises[newIdx] = temp;
        saveAll();
        openEditModal(pIdx);
        showProgramDetails(pIdx);
    }
}

function updateExerciseDropdown() {
    const muscle = document.getElementById("muscle-group-select").value;
    const bankSelect = document.getElementById("bank-select");
    const addBtn = document.getElementById("add-btn-modal");
    bankSelect.innerHTML = "";
    if (!muscle) { bankSelect.disabled = true; addBtn.disabled = true; return; }
    const filtered = masterExercises.filter(ex => ex.target === muscle);
    filtered.forEach(ex => { bankSelect.innerHTML += `<option value="${ex.name}">${ex.name}</option>`; });
    bankSelect.disabled = false; addBtn.disabled = false;
}

function removeFromPass(pIdx, exIdx) {
    programData.routine[pIdx].exercises.splice(exIdx, 1);
    saveAll();
    openEditModal(pIdx);
    showProgramDetails(pIdx);
}

function addFromBank(pIdx) {
    const name = document.getElementById("bank-select").value;
    const exObj = masterExercises.find(m => m.name === name);
    programData.routine[pIdx].exercises.push({...exObj});
    saveAll();
    openEditModal(pIdx);
    showProgramDetails(pIdx);
}

function deleteEntirePass(pIdx) {
    if(confirm("Är du säker på att du vill radera hela detta pass?")) {
        programData.routine.splice(pIdx, 1);
        saveAll();
        closeModal();
        renderProgramView();
        document.getElementById("program-exercise-list").classList.add("hidden");
    }
}

document.getElementById("add-custom-pass-btn").onclick = () => {
    const newChar = String.fromCharCode(65 + programData.routine.length);
    programData.routine.push({ id: `pass-${newChar.toLowerCase()}`, name: `Pass ${newChar}`, exercises: [] });
    saveAll();
    renderProgramView();
};

// --- TRÄNINGS-REGISTRERING ---
function startWorkout(workout, savedData = null) {
    activeDraft = { workout: workout, data: savedData };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    
    workout.exercises.forEach((ex, i) => {
        const val = (savedData && savedData[i]) ? savedData[i] : { weight: "", reps: "", sets: ex.defaultSets || 3 };
        const container = document.createElement("div");
        container.className = "exercise-card-container";
        container.innerHTML = `
            <div class="card-front">
                <div style="font-size:10px; font-weight:900; color:var(--primary); text-transform:uppercase; margin-bottom:5px;">${ex.target}</div>
                <strong style="font-size:18px; display:block; margin-bottom:15px;">${ex.name}</strong>
                <div class="input-group">
                    <div>
                        <label style="font-size:10px; font-weight:800; color:var(--text-light); display:block; text-align:center; margin-bottom:5px;">KG</label>
                        <input type="number" id="w-${i}" class="log-input" value="${val.weight}" placeholder="0">
                    </div>
                    <div>
                        <label style="font-size:10px; font-weight:800; color:var(--text-light); display:block; text-align:center; margin-bottom:5px;">REPS</label>
                        <input type="number" id="r-${i}" class="log-input" value="${val.reps}" placeholder="0">
                    </div>
                    <div>
                        <label style="font-size:10px; font-weight:800; color:var(--text-light); display:block; text-align:center; margin-bottom:5px;">SET</label>
                        <input type="number" id="s-${i}" class="log-input" value="${val.sets}" placeholder="0">
                    </div>
                </div>
            </div>`;
        list.appendChild(container);
    });
    showView("workout-view");
}

document.getElementById("pause-workout-btn").onclick = () => {
    const draftData = activeDraft.workout.exercises.map((ex, i) => ({
        weight: document.getElementById(`w-${i}`).value,
        reps: document.getElementById(`r-${i}`).value,
        sets: document.getElementById(`s-${i}`).value
    }));
    activeDraft.data = draftData;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    location.reload();
};

document.getElementById("save-workout-btn").onclick = () => {
    const log = {
        date: new Date().toISOString(),
        programName: activeDraft.workout.name,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name,
            weight: document.getElementById(`w-${i}`).value,
            reps: document.getElementById(`r-${i}`).value,
            sets: document.getElementById(`s-${i}`).value
        }))
    };
    workoutHistory.push(log);
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.removeItem("activeWorkoutDraft");
    location.reload();
};

// --- NAVIGATION & UTILS ---
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises('Ben'); };
document.getElementById("view-programs-btn").onclick = renderProgramView;
document.getElementById("stats-mode").onclick = () => { showView("stats-view"); renderStats(); };

document.getElementById("start-new-btn").onclick = () => {
    const dayOfWeek = new Date().getDay();
    let toStart = programData.routine[0];
    if ([2,4,6].includes(dayOfWeek)) {
        const dayCounter = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24 * 2));
        toStart = programData.routine[dayCounter % programData.routine.length];
    }
    startWorkout(toStart);
};

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }

function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const months = {};
    workoutHistory.forEach(w => {
        const m = w.date.substring(0, 7);
        months[m] = (months[m] || 0) + 1;
    });
    Object.entries(months).forEach(([m, val]) => {
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = Math.min(val * 15, 130) + "px";
        const w = document.createElement("div");
        w.style.flex = "1";
        w.appendChild(bar);
        w.innerHTML += `<div class="chart-label">${m}</div>`;
        container.appendChild(w);
    });
}
