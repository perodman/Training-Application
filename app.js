let programData;
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let customSchedule = JSON.parse(localStorage.getItem("customSchedule") || "{}"); // Format: "YYYY-MM-DD": passId
let currentViewDate = new Date();

// Ladda programdata och applicera ändringar från localStorage om de finns
fetch("program.json").then(r => r.json()).then(json => {
    const savedProgram = JSON.parse(localStorage.getItem("myCustomProgram"));
    programData = savedProgram || json;
    renderHome();
});

function saveProgram() {
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

// --- KALENDER & SCHEMA ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = dateObj.toISOString().split('T')[0];
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.innerHTML = d;

        // Check genomfört
        const isDone = workoutHistory.some(w => w.date.startsWith(dateStr));
        // Check planerat
        const planId = customSchedule[dateStr];

        if (isDone) {
            cell.classList.add("cell-completed");
        } else if (planId) {
            cell.classList.add("cell-planned");
        }

        cell.onclick = () => manageDay(dateStr, planId, isDone);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function manageDay(dateStr, planId, isDone) {
    const body = document.getElementById("modal-body");
    if (isDone) {
        body.innerHTML = `<h3>Genomfört!</h3><p>Bra jobbat den ${dateStr}.</p>`;
    } else if (planId) {
        const pass = programData.routine.find(p => p.id === planId);
        body.innerHTML = `
            <h3>Planerat: ${pass.name}</h3>
            <button class="mode-btn red" onclick="updateSchedule('${dateStr}', null)">Ta bort pass</button>
        `;
    } else {
        body.innerHTML = `<h3>Planera pass</h3>
            ${programData.routine.map(p => `
                <button class="mode-btn blue" onclick="updateSchedule('${dateStr}', '${p.id}')">${p.name}</button>
            `).join("")}
        `;
    }
    document.getElementById("workout-modal").classList.remove("hidden");
}

function updateSchedule(dateStr, passId) {
    if (!passId) delete customSchedule[dateStr];
    else customSchedule[dateStr] = passId;
    localStorage.setItem("customSchedule", JSON.stringify(customSchedule));
    closeModal();
    renderCalendar();
}

// --- ÖVNINGAR ---
function filterExercises(category) {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(`[data-cat="${category}"]`).classList.add("active");

    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    
    let allEx = [];
    programData.routine.forEach(p => {
        p.exercises.forEach(ex => {
            if (!allEx.find(a => a.name === ex.name)) allEx.push(ex);
        });
    });

    const filtered = allEx.filter(ex => {
        if (category === "Armar") return ex.target === "Biceps" || ex.target === "Triceps";
        return ex.target === category;
    });

    filtered.forEach(ex => {
        results.innerHTML += `
            <div class="card" style="display:flex; align-items:center; gap:15px;">
                <div style="font-size:30px;">${getEmoji(ex.target)}</div>
                <div>
                    <strong>${ex.name}</strong>
                    <div style="font-size:12px; color:var(--text-light)">${ex.target}</div>
                </div>
            </div>
        `;
    });
}

function getEmoji(target) {
    const map = {"Ben":"🦵","Bröst":"💪","Rygg":"👐","Axlar":"肩","Biceps":"🦾","Triceps":"🦾","Bål":"🧘"};
    return map[target] || "🏋️";
}

// --- PROGRAMÖVERSIKT & REDIGERING ---
function showProgramPass(idx) {
    const pass = programData.routine[idx];
    const list = document.getElementById("program-exercise-list");
    list.classList.remove("hidden");
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>${pass.name}</h3>
            <button class="mode-btn blue" style="width:auto; padding:8px 15px;" onclick="openEditPass(${idx})">Redigera</button>
        </div>
        <hr>
    `;
    pass.exercises.forEach(e => {
        list.innerHTML += `<div class="edit-item"><span>${e.name}</span> <small>${e.target}</small></div>`;
    });
}

function openEditPass(passIdx) {
    const pass = programData.routine[passIdx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>Redigera ${pass.name}</h3><div id="edit-list"></div><hr><h4>Lägg till övning:</h4><select id="add-ex-select" class="log-input"></select><button class="mode-btn green" onclick="addExToPass(${passIdx})">Lägg till</button>`;
    
    // Lista befintliga
    const editList = body.querySelector("#edit-list");
    pass.exercises.forEach((ex, i) => {
        editList.innerHTML += `<div class="edit-item"><span>${ex.name}</span><span class="remove-btn" onclick="removeExFromPass(${passIdx}, ${i})">TA BORT</span></div>`;
    });

    // Fyll dropdown med ALLA unika övningar
    const select = body.querySelector("#add-ex-select");
    let allEx = [];
    programData.routine.forEach(p => p.exercises.forEach(e => { if(!allEx.find(x=>x.name===e.name)) allEx.push(e) }));
    allEx.forEach(ex => select.innerHTML += `<option value="${ex.name}">${ex.name} (${ex.target})</option>`);

    document.getElementById("workout-modal").classList.remove("hidden");
}

function removeExFromPass(pIdx, exIdx) {
    programData.routine[pIdx].exercises.splice(exIdx, 1);
    saveProgram();
    openEditPass(pIdx);
    showProgramPass(pIdx);
}

function addExToPass(pIdx) {
    const name = document.getElementById("add-ex-select").value;
    // Hitta övningsobjektet
    let foundEx;
    programData.routine.forEach(p => p.exercises.forEach(e => { if(e.name===name) foundEx = e; }));
    programData.routine[pIdx].exercises.push({...foundEx});
    saveProgram();
    openEditPass(pIdx);
    showProgramPass(pIdx);
}

// --- STATISTIK ---
function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    
    // Gruppera efter månad
    const months = {};
    workoutHistory.forEach(w => {
        const m = w.date.substring(0, 7); // YYYY-MM
        months[m] = (months[m] || 0) + 1;
    });

    const sortedMonths = Object.keys(months).sort();
    const maxVal = Math.max(...Object.values(months), 5);

    sortedMonths.forEach(m => {
        const val = months[m];
        const height = (val / maxVal) * 100;
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = height + "%";
        bar.setAttribute("data-value", val);
        bar.onclick = () => alert(`${m}: ${val} genomförda pass`);
        
        const wrapper = document.createElement("div");
        wrapper.style.flex = "1";
        wrapper.appendChild(bar);
        wrapper.innerHTML += `<div class="chart-label">${m.split("-")[1]}</div>`;
        container.appendChild(wrapper);
    });

    renderMuscleStats();
    showView("stats-view");
}

function renderMuscleStats() {
    const targetMuscle = document.getElementById("stats-muscle-filter").value;
    const results = document.getElementById("muscle-stats-results");
    results.innerHTML = "";

    let countPass = 0;
    let countSets = 0;
    let exerciseStats = {};

    workoutHistory.forEach(w => {
        let passHasMuscle = false;
        w.exercises.forEach(ex => {
            // Vi behöver hitta target från programData eftersom det inte sparas i loggen
            let actualEx;
            programData.routine.forEach(p => p.exercises.forEach(e => { if(e.name === ex.name) actualEx = e; }));
            
            if (actualEx && (targetMuscle === "Alla" || actualEx.target === targetMuscle)) {
                passHasMuscle = true;
                countSets += parseInt(ex.sets || 0);
                exerciseStats[ex.name] = (exerciseStats[ex.name] || 0) + parseInt(ex.sets || 0);
            }
        });
        if (passHasMuscle) countPass++;
    });

    results.innerHTML = `
        <div class="card" style="background:#f1f5f9">
            <p>Antal pass: <strong>${countPass}</strong></p>
            <p>Totalt antal set: <strong>${countSets}</strong></p>
        </div>
        <h4>Set per övning:</h4>
        ${Object.entries(exerciseStats).map(([name, sets]) => `<div class="edit-item"><span>${name}</span><strong>${sets} set</strong></div>`).join("")}
    `;
}

// --- STANDARDFUNKTIONER ---
document.getElementById("global-home").onclick = renderHome;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); };
document.getElementById("view-programs-btn").onclick = () => { showView("programs-view"); };
document.getElementById("stats-mode").onclick = renderStats;
document.getElementById("start-new-btn").onclick = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const plannedPassId = customSchedule[todayStr];
    let passToStart = programData.routine[0];
    if (plannedPassId) {
        passToStart = programData.routine.find(p => p.id === plannedPassId);
    }
    startWorkout(passToStart);
};

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
            <div class="exercise-card-inner">
                <div class="card-front">
                    <div style="font-size:10px; font-weight:900; color:var(--primary);">${ex.target}</div>
                    <strong style="font-size:18px;">${ex.name}</strong>
                    <div class="input-group">
                        <input type="number" id="w-${i}" class="log-input" placeholder="KG" value="${val.weight}">
                        <input type="number" id="r-${i}" class="log-input" placeholder="REPS" value="${val.reps}">
                        <input type="number" id="s-${i}" class="log-input" placeholder="SET" value="${val.sets}">
                    </div>
                </div>
            </div>`;
        list.appendChild(container);
    });
    showView("workout-view");
}

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
