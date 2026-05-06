let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

fetch("program.json").then(r => r.json()).then(json => {
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
    renderHome();
});

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}

// --- KALENDER-LOGIK (TRÄNINGSSCHEMA) ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    // Formatera månaden med stor begynnelsebokstav
    const monthText = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    label.textContent = monthText.charAt(0).toUpperCase() + monthText.slice(1);
    
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;
    
    workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dateObj = new Date(year, month, d);
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        
        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr;
        const dayOfWeek = dateObj.getDay();
        const isAutoDay = [2, 4, 6].includes(dayOfWeek); // Tis, Tor, Lör
        const override = calendarOverrides[dateStr];

        let displayPass = null;
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            const dayCounter = Math.floor(dateObj.getTime() / (1000 * 60 * 60 * 24 * 2));
            displayPass = programData.routine[dayCounter % programData.routine.length];
        }

        let info = "";
        if (hasWorkouts.length > 0) {
            cell.classList.add("cell-completed");
            info = "✓";
        } else if (isOngoing) {
            cell.classList.add("cell-ongoing");
            info = "⏱️";
        } else if (displayPass) {
            cell.classList.add("cell-planned");
            info = displayPass.name.split(" ").pop();
        }

        cell.innerHTML = `<span>${d}</span><span class="cell-info">${info}</span>`;
        cell.onclick = () => openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, ongoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;
    if (completed.length > 0) {
        completed.forEach(w => html += `<div class="card glass" style="margin-top:10px; border-left:4px solid var(--success)"><strong>${w.programName}</strong><br>Genomfört ✅</div>`);
    } else if (ongoing) {
        html += `<button class="mode-btn orange" onclick="resumeDraft()">Fortsätt pågående pass</button>`;
    } else {
        html += `<p>Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet 🔥</button>`;
        html += `<hr style="opacity:0.1; margin:15px 0"><h4>Ändra planering:</h4>`;
        programData.routine.forEach(p => {
            html += `<button class="mode-btn glass-border" style="font-size:12px; padding:12px;" onclick="setOverride('${dateStr}', '${p.id}')">Planera ${p.name}</button>`;
        });
        html += `<button class="mode-btn red" style="background:rgba(239,68,68,0.1); color:#ef4444;" onclick="setOverride('${dateStr}', 'none')">Vila</button>`;
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function resumeDraft() { closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }
function setOverride(date, val) { calendarOverrides[date] = val; localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides)); closeModal(); renderCalendar(); }

// --- ÖVRIG LOGIK (ÖVNINGAR & PROGRAM) ---
function filterExercises(category) {
    currentExerciseCategory = category;
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
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.cssText = "padding:18px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;";
        div.innerHTML = `<div><strong>${ex.name}</strong><br><span style="font-size:10px; color:var(--primary); font-weight:700;">${ex.target}</span></div>
                         <button class="circle-ctrl" style="width:36px; height:36px;" onclick="openEditExerciseModal(${ex.id})">⚙️</button>`;
        results.appendChild(div);
    });
}

function startWorkout(workout, data = null, date = null) {
    activeDraft = { workout, data, date: date || new Date().toISOString().split('T')[0] };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    workout.exercises.forEach((ex, i) => {
        const val = data ? data[i] : { weight: "", reps: "", sets: 3 };
        const div = document.createElement("div");
        div.className = "card-front";
        div.innerHTML = `<strong style="font-size:18px;">${ex.name}</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:15px;">
                <input type="number" id="w-${i}" class="log-input" value="${val.weight}" placeholder="KG">
                <input type="number" id="r-${i}" class="log-input" value="${val.reps}" placeholder="Reps">
                <input type="number" id="s-${i}" class="log-input" value="${val.sets}" placeholder="Set">
            </div>`;
        list.appendChild(div);
    });
    showView("workout-view");
}

document.getElementById("save-workout-btn").onclick = () => {
    const log = {
        date: activeDraft.date, programName: activeDraft.workout.name,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name, weight: document.getElementById(`w-${i}`).value,
            reps: document.getElementById(`r-${i}`).value, sets: document.getElementById(`s-${i}`).value
        }))
    };
    workoutHistory.push(log);
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.removeItem("activeWorkoutDraft");
    renderHome();
};

document.getElementById("pause-workout-btn").onclick = () => {
    activeDraft.data = activeDraft.workout.exercises.map((ex, i) => ({
        weight: document.getElementById(`w-${i}`).value,
        reps: document.getElementById(`r-${i}`).value,
        sets: document.getElementById(`s-${i}`).value
    }));
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    location.reload();
};

// UI Triggers
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises("Ben"); };
document.getElementById("view-programs-btn").onclick = () => {
    const sel = document.getElementById("pass-selector-list");
    sel.innerHTML = "";
    programData.routine.forEach((p, i) => {
        const b = document.createElement("button"); b.className = "mode-btn glass"; b.textContent = p.name;
        b.onclick = () => {
            const list = document.getElementById("program-exercise-list");
            list.classList.remove("hidden");
            list.innerHTML = `<h3>${p.name}</h3>` + p.exercises.map(e => `<div style="padding:10px 0; border-bottom:1px solid var(--glass-border)">${e.name}</div>`).join("");
        };
        sel.appendChild(b);
    });
    showView("programs-view");
};
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function renderHome() {
    showView("home-view");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
}
