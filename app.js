let programData;
let masterExercises = []; // Global bank som aldrig krymper
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}"); // { "YYYY-MM-DD": "pass-id" or "none" }
let currentViewDate = new Date();

fetch("program.json").then(r => r.json()).then(json => {
    const saved = JSON.parse(localStorage.getItem("myCustomProgram"));
    programData = saved || json;
    
    // Bygg master-listan en gång från startprogrammet så övningar aldrig försvinner
    programData.routine.forEach(p => {
        p.exercises.forEach(ex => {
            if (!masterExercises.find(m => m.name === ex.name)) {
                masterExercises.push({...ex});
            }
        });
    });
    
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
    } else {
        draftAlert.classList.add("hidden");
        startBtn.classList.remove("hidden");
    }
}

// --- KALENDER (Struktur: Tis, Tor, Lör) ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = dateObj.toISOString().split('T')[0];
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.innerHTML = d;

        const isDone = workoutHistory.some(w => w.date.startsWith(dateStr));
        
        // Logik för automatisk struktur (Tis=2, Tor=4, Lör=6)
        const dayOfWeek = dateObj.getDay();
        const isAutoDay = [2, 4, 6].includes(dayOfWeek);
        const override = calendarOverrides[dateStr]; // Kan vara 'none' eller ett ID

        let displayPassId = null;
        if (override && override !== "none") {
            displayPassId = override;
        } else if (isAutoDay && override !== "none") {
            // Beräkna vilket pass A-D det bör vara baserat på datum
            const dayCounter = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24 * 2)); 
            const idx = dayCounter % programData.routine.length;
            displayPassId = programData.routine[idx].id;
        }

        if (isDone) cell.classList.add("cell-completed");
        else if (displayPassId) cell.classList.add("cell-planned");

        cell.onclick = () => openDayManager(dateStr, displayPassId, isDone);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, passId, isDone) {
    const body = document.getElementById("modal-body");
    if (isDone) {
        body.innerHTML = `<h3>${dateStr}</h3><p class="green-text">Passet är genomfört!</p>`;
    } else {
        const currentPass = programData.routine.find(p => p.id === passId);
        body.innerHTML = `
            <h3>Hantera ${dateStr}</h3>
            <p>Nuvarande: <strong>${currentPass ? currentPass.name : 'Vila'}</strong></p>
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

// --- ÖVNINGAR (Master-listan används) ---
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
        results.innerHTML += `
            <div class="card" style="padding:15px; display:flex; justify-content:space-between;">
                <strong>${ex.name}</strong>
                <span style="font-size:12px; color:var(--primary); font-weight:800;">${ex.target}</span>
            </div>
        `;
    });
}

// --- TRÄNINGSPROGRAM ---
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
            <h3>${pass.name}</h3>
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
        <h4>Lägg till från banken:</h4>
        <select id="bank-select" class="log-input" style="margin-bottom:10px;"></select>
        <button class="mode-btn green" onclick="addFromBank(${pIdx})">Lägg till</button>
    `;

    const list = body.querySelector("#edit-ex-list");
    pass.exercises.forEach((ex, i) => {
        list.innerHTML += `<div class="edit-item"><span>${ex.name}</span><span class="red-text" style="cursor:pointer; font-weight:800;" onclick="removeFromPass(${pIdx}, ${i})">TA BORT</span></div>`;
    });

    const select = body.querySelector("#bank-select");
    masterExercises.forEach(ex => {
        select.innerHTML += `<option value="${ex.name}">${ex.name} (${ex.target})</option>`;
    });

    document.getElementById("workout-modal").classList.remove("hidden");
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

document.getElementById("add-custom-pass-btn").onclick = () => {
    const newChar = String.fromCharCode(65 + programData.routine.length); // A, B, C, D...
    const newPass = {
        id: `pass-${newChar.toLowerCase()}`,
        name: `Pass ${newChar}`,
        exercises: []
    };
    programData.routine.push(newPass);
    saveAll();
    renderProgramView();
};

// --- STARTA PASS (Återställd design) ---
function startWorkout(workout, savedData = null) {
    activeDraft = { workout: workout, startTime: new Date().toISOString() };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    workout.exercises.forEach((ex, i) => {
        const val = savedData ? savedData[i] : { weight: "", reps: "", sets: ex.defaultSets || 3 };
        const container = document.createElement("div");
        container.className = "exercise-card-container";
        container.innerHTML = `
            <div class="card-front">
                <div style="font-size:10px; font-weight:900; color:var(--primary); text-transform:uppercase;">${ex.target}</div>
                <strong style="font-size:18px; display:block; margin-bottom:10px;">${ex.name}</strong>
                <div class="input-group">
                    <div><label style="font-size:9px; font-weight:800;">KG</label><input type="number" id="w-${i}" class="log-input" value="${val.weight}"></div>
                    <div><label style="font-size:9px; font-weight:800;">REPS</label><input type="number" id="r-${i}" class="log-input" value="${val.reps}"></div>
                    <div><label style="font-size:9px; font-weight:800;">SET</label><input type="number" id="s-${i}" class="log-input" value="${val.sets}"></div>
                </div>
            </div>
        `;
        list.appendChild(container);
    });
    showView("workout-view");
}

// --- ÖVRIGT ---
document.getElementById("global-home").onclick = renderHome;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises('Ben'); };
document.getElementById("view-programs-btn").onclick = renderProgramView;
document.getElementById("stats-mode").onclick = () => { showView("stats-view"); renderStats(); };

document.getElementById("start-new-btn").onclick = () => {
    // Hitta dagens planerade pass om det finns
    const today = new Date().toISOString().split('T')[0];
    let toStart = programData.routine[0];
    
    // Samma logik som i kalendern för att hitta "automatiskt" pass
    const dayOfWeek = new Date().getDay();
    if ([2,4,6].includes(dayOfWeek)) {
        const dayCounter = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24 * 2));
        toStart = programData.routine[dayCounter % programData.routine.length];
    }
    startWorkout(toStart);
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

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }

// Enkel statistik-rendering
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
        bar.style.height = (val * 20) + "px";
        const w = document.createElement("div");
        w.style.flex = "1";
        w.appendChild(bar);
        w.innerHTML += `<div class="chart-label">${m}</div>`;
        container.appendChild(w);
    });
}
