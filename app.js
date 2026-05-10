let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

let timerInterval = null;
let secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
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
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0, 0);
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }

// --- TIMER ---
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
        if(activeDraft) activeDraft.secondsElapsed = secondsElapsed;
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
        
        const completed = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr && activeDraft.isStarted;
        const override = calendarOverrides[dateStr];
        
        let displayPass = null;
        if (override === "free") displayPass = { name: "Fritt Pass", id: "free" };
        else if (override && override !== "none") displayPass = programData.routine.find(p => p.id === override);
        
        let info = "";
        if (completed.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = "⏱️"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
        cell.innerHTML = `<span>${d}</span><span>${info}</span>`;
        cell.onclick = () => openDayManager(dateStr, displayPass, completed, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;
    
    if (completed.length > 0) {
        completed.forEach(w => {
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">
                <strong>${w.programName}</strong><br><small>⏱️ ${w.totalTime || "Klar"}</small>
            </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p style="text-align:center;">Planerat: <strong id="planned-name">${planned ? planned.name : 'Vila'}</strong></p>`;
        
        // Startknapp visas endast om ett pass (inkl fritt) är valt och inget annat pågår
        if(planned && !activeDraft) {
            html += `<button class="mode-btn green" id="modal-start-btn" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name} 🔥</button>`;
        } else if (activeDraft) {
            html += `<p style="color:var(--warning); font-size:11px; text-align:center;">Avsluta pågående pass för att starta nytt.</p>`;
        }

        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Ändra planering:</p>
        <div class="plan-grid">
            ${programData.routine.map(p => `<button class="mode-btn mini glass-border ${planned && planned.id === p.id ? 'btn-selected' : ''}" onclick="setOverride('${dateStr}', '${p.id}', this)">${p.name}</button>`).join("")}
            <button class="mode-btn mini glass-border ${planned && planned.id === 'free' ? 'btn-selected' : ''}" onclick="setOverride('${dateStr}', 'free', this)">Fritt Pass</button>
            <button class="mode-btn mini glass-border" style="color:var(--danger);" onclick="setOverride('${dateStr}', 'none', this)">Vila</button>
        </div>`;
    }
    body.innerHTML = html;
    openModal();
}

function setOverride(date, val, btn) {
    calendarOverrides[date] = val;
    saveAll();
    const grid = btn.parentElement;
    grid.querySelectorAll('button').forEach(b => b.classList.remove('btn-selected'));
    if(val !== 'none') btn.classList.add('btn-selected');
    
    const display = document.getElementById('planned-name');
    let name = "Vila";
    if(val === 'free') name = "Fritt Pass";
    else if(val !== 'none') name = programData.routine.find(p => p.id === val).name;
    display.innerText = name;
    
    renderCalendar();
}

// --- TRÄNINGSFLÖDE ---
function prepareStart(date, id) {
    let p;
    if(id === 'free') p = { id: "free-" + Date.now(), name: "Fritt Pass", exercises: [] };
    else p = programData.routine.find(x => x.id === id);
    closeModal();
    startWorkout(p, null, date, false);
}

function startWorkout(workout, data = null, date = null, isImmediate = false) {
    if(!activeDraft || activeDraft.workout.id === workout.id) {
        activeDraft = activeDraft || {
            workout: JSON.parse(JSON.stringify(workout)),
            data: data || workout.exercises.map(() => ({ weight: "", reps: "", sets: 3 })),
            date: date || new Date().toISOString().split('T')[0],
            secondsElapsed: secondsElapsed,
            isStarted: isImmediate
        };
    }
    renderActiveWorkout();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    
    if(!activeDraft.isStarted) {
        list.innerHTML = `<button class="mode-btn green" onclick="actuallyStart()">STARTA TRÄNINGSPASSET 🔥</button>`;
        showView("workout-view");
        return;
    }

    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `<strong>${ex.name}</strong>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:10px;">
            <input type="number" class="log-input" placeholder="kg" value="${val.weight}" onchange="updateVal(${i}, 'weight', this.value)">
            <input type="number" class="log-input" placeholder="reps" value="${val.reps}" onchange="updateVal(${i}, 'reps', this.value)">
            <input type="number" class="log-input" placeholder="set" value="${val.sets}" onchange="updateVal(${i}, 'sets', this.value)">
        </div>`;
        list.appendChild(div);
    });

    // Lägg till knappar för att Spara och Avsluta längst ner
    const footer = document.createElement("div");
    footer.innerHTML = `
        <button class="mode-btn blue" onclick="saveDraft()">Spara utkast 💾</button>
        <button class="mode-btn green" onclick="finishWorkout()">Avsluta pass ✅</button>
    `;
    list.appendChild(footer);
    
    updateTimerDisplay();
    startTimer();
    showView("workout-view");
}

function actuallyStart() {
    activeDraft.isStarted = true;
    saveAll();
    renderActiveWorkout();
}

function updateVal(idx, key, val) {
    activeDraft.data[idx][key] = val;
    saveAll();
}

function saveDraft() {
    saveAll();
    alert("Utkast sparat!");
    location.reload();
}

function finishWorkout() {
    if(!confirm("Vill du avsluta och spara passet?")) return;
    pauseTimer();
    const historyItem = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: document.getElementById("workout-timer").textContent,
        exercises: activeDraft.data
    };
    workoutHistory.push(historyItem);
    activeDraft = null;
    secondsElapsed = 0;
    saveAll();
    renderHome();
}

// --- PROGRAM-VY ---
function renderProgramView() {
    const list = document.getElementById("program-list");
    list.innerHTML = "";
    programData.routine.forEach((p, idx) => {
        const card = document.createElement("div");
        card.className = "card glass";
        card.innerHTML = `<strong>${p.name}</strong><br><small>${p.exercises.length} övningar</small>`;
        card.onclick = () => {
            const body = document.getElementById("modal-body");
            body.innerHTML = `<h3>${p.name}</h3>` + p.exercises.map(ex => `<div class="edit-item-row">${ex.name}</div>`).join("");
            openModal();
        };
        list.appendChild(card);
    });
    showView("programs-view");
}

// --- NAVIGATION ---
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("start-free-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => showView("exercises-view");
document.getElementById("view-programs-btn").onclick = renderProgramView;

function renderHome() {
    showView("home-view");
    const alert = document.getElementById("draft-alert");
    const startBtn = document.getElementById("start-new-btn");
    const freeBtn = document.getElementById("start-free-btn");

    if(activeDraft) {
        alert.classList.remove("hidden");
        startBtn.classList.add("hidden"); // Döljer "Starta träningspass" om pass pågår
        freeBtn.classList.add("hidden");  // Döljer "Fritt pass" om pass pågår
        document.getElementById("resume-workout-btn").onclick = () => renderActiveWorkout();
    } else {
        alert.classList.add("hidden");
        startBtn.classList.remove("hidden");
        freeBtn.classList.remove("hidden");
    }
}

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
