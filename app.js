let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();

fetch("program.json").then(r => r.json()).then(json => {
    const savedProgram = JSON.parse(localStorage.getItem("myCustomProgram"));
    programData = savedProgram || json;
    renderHome();
});

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
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
        completed.forEach((w, idx) => {
            html += `<div class="card glass" style="margin-top:10px; border-left:4px solid var(--success); padding:15px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${w.programName}</strong>
                    <button class="circle-ctrl" style="width:30px; height:30px; font-size:12px;" onclick="deleteWorkout('${dateStr}', ${idx})">🗑️</button>
                </div>
                <div style="margin-top:10px;">
                    ${w.exercises.map(ex => `
                        <div class="history-item-row">
                            <span>${ex.name}</span>
                            <span style="color:var(--primary)">${ex.weight}kg x ${ex.reps} (${ex.sets})</span>
                        </div>
                    `).join("")}
                </div>
            </div>`;
        });
    } else if (ongoing) {
        html += `<button class="mode-btn orange" onclick="resumeDraft()">Fortsätt pågående pass</button>`;
    } else {
        html += `<p>Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet 🔥</button>`;
        html += `<hr style="opacity:0.1; margin:15px 0"><h4>Ändra planering:</h4>`;
        programData.routine.forEach(p => {
            html += `<button class="mode-btn glass-border" style="font-size:12px; padding:12px;" onclick="setOverride('${dateStr}', '${p.id}')">Planera ${p.name}</button>`;
        });
        html += `<button class="mode-btn red-dim" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    document.getElementById("workout-modal").classList.remove("hidden");
}

function deleteWorkout(date, index) {
    if(confirm("Vill du verkligen radera detta pass?")) {
        const fullIndex = workoutHistory.findIndex((w, i) => w.date === date); 
        // Enkel logik för demo, raderar rätt pass för datumet:
        const workoutsForDate = workoutHistory.filter(w => w.date === date);
        const toDelete = workoutsForDate[index];
        workoutHistory = workoutHistory.filter(w => w !== toDelete);
        saveAll();
        closeModal();
        renderCalendar();
    }
}

function resumeDraft() { closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }

// --- TRÄNINGS-VY ---
function startWorkout(workout, data = null, date = null) {
    activeDraft = { workout, data, date: date || new Date().toISOString().split('T')[0] };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    workout.exercises.forEach((ex, i) => {
        const val = data ? data[i] : { weight: "", reps: "", sets: 3 };
        const div = document.createElement("div");
        div.className = "card-front glass";
        div.innerHTML = `<strong style="font-size:18px;">${ex.name}</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:15px;">
                <div><small>KG</small><input type="number" id="w-${i}" class="log-input" value="${val.weight}"></div>
                <div><small>Reps</small><input type="number" id="r-${i}" class="log-input" value="${val.reps}"></div>
                <div><small>Set</small><input type="number" id="s-${i}" class="log-input" value="${val.sets}"></div>
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
            weight: document.getElementById(`w-${i}`).value,
            reps: document.getElementById(`r-${i}`).value,
            sets: document.getElementById(`s-${i}`).value
        }))
    };
    workoutHistory.push(log);
    saveAll();
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

// --- INITIALISERING ---
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises("Ben"); };
document.getElementById("view-programs-btn").onclick = () => {
    const sel = document.getElementById("pass-selector-list");
    sel.innerHTML = "";
    programData.routine.forEach((p) => {
        const b = document.createElement("button"); b.className = "mode-btn glass"; b.textContent = p.name;
        b.onclick = () => {
            const list = document.getElementById("program-exercise-list");
            list.classList.remove("hidden");
            list.innerHTML = `<h3>${p.name}</h3>` + p.exercises.map(e => `<div class="history-item-row"><span>${e.name}</span><span>${e.target}</span></div>`).join("");
        };
        sel.appendChild(b);
    });
    showView("programs-view");
};

function filterExercises(cat) {
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    masterExercises.filter(ex => ex.target === cat || (cat === "Armar" && (ex.target === "Biceps" || ex.target === "Triceps"))).forEach(ex => {
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.padding = "15px";
        div.style.marginBottom = "10px";
        div.innerHTML = `<strong>${ex.name}</strong>`;
        results.appendChild(div);
    });
}

function renderHome() {
    showView("home-view");
    activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = resumeDraft;
    }
}
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
