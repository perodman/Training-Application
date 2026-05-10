let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

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
    const target = document.getElementById(id);
    if(!target) return;
    if (target.classList.contains("hidden")) {
        document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
        target.classList.remove("hidden");
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
        const isOngoing = activeDraft && activeDraft.date === dateStr && activeDraft.isStarted;
        const dayOfWeek = new Date(year, month, d).getDay();
        const isAutoDay = [1, 3, 5].includes(dayOfWeek);
        const override = calendarOverrides[dateStr];
        let displayPass = null;

        if (override === "free") displayPass = { name: "Fritt Pass", id: "free" };
        else if (override && override !== "none") displayPass = programData.routine.find(p => p.id === override);
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
                </div>
            </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p style="text-align:center;">Planerat: <strong id="planned-display-name">${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) {
            html += `<button class="mode-btn green" id="start-planned-btn" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name} 🔥</button>`;
        }
        
        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Ändra planering:</p>`;
        
        // Kompakt rutnät för knappar
        html += `<div class="plan-grid">`;
        programData.routine.forEach(p => {
            const isSelected = planned && p.id === planned.id;
            html += `<button class="mode-btn mini glass-border ${isSelected ? 'btn-selected' : ''}" onclick="setOverride('${dateStr}', '${p.id}', this)">${p.name}</button>`;
        });
        // Lägg till Fritt Pass
        const isFreeSelected = planned && planned.id === 'free';
        html += `<button class="mode-btn mini glass-border ${isFreeSelected ? 'btn-selected' : ''}" onclick="setOverride('${dateStr}', 'free', this)">Fritt Pass</button>`;
        // Vila
        html += `<button class="mode-btn mini glass-border" style="color:var(--danger);" onclick="setOverride('${dateStr}', 'none', this)">Vila</button>`;
        html += `</div>`;
    }
    body.innerHTML = html;
    openModal();
}

function setOverride(date, val, btn) {
    calendarOverrides[date] = val;
    saveAll();
    
    // Visuell feedback i modalen utan att stänga den
    const container = btn.parentElement;
    container.querySelectorAll('button').forEach(b => b.classList.remove('btn-selected'));
    if(val !== 'none') btn.classList.add('btn-selected');

    // Uppdatera texten i modalen
    const display = document.getElementById('planned-display-name');
    let newName = "Vila";
    if(val === 'free') newName = "Fritt Pass";
    else if(val !== 'none') newName = programData.routine.find(p => p.id === val).name;
    display.innerText = newName;

    // Uppdatera startknappen om den finns
    const startBtn = document.getElementById('start-planned-btn');
    if(startBtn) {
        if(val === 'none') startBtn.classList.add('hidden');
        else {
            startBtn.classList.remove('hidden');
            startBtn.innerText = `Starta ${newName} 🔥`;
            startBtn.onclick = () => prepareStart(date, val);
        }
    }
    
    renderCalendar(); // Uppdatera underliggande kalendervy
}

function prepareStart(date, id) {
    let p;
    if(id === 'free') p = { id: "free-" + Date.now(), name: "Fritt Pass", exercises: [] };
    else p = programData.routine.find(x => x.id === id);
    closeModal(); 
    startWorkout(p, null, date, false);
}

function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: data || workout.exercises.map(()=>({weight:"", reps:"", sets:3})), 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: secondsElapsed,
        isStarted: isImmediateStart || (activeDraft ? activeDraft.isStarted : false)
    };
    renderActiveWorkout();
    updateTimerDisplay();
    if(activeDraft.isStarted) startTimer();
    else pauseTimer();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    if(!activeDraft.isStarted) {
        list.innerHTML = `<div style="text-align:center; padding:20px 0;"><button class="mode-btn green" style="width:100%; padding:20px; font-size:18px;" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button></div>`;
        showView("workout-view");
        return;
    }
    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;"><strong>${ex.name}</strong></div>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
            <input type="number" id="w-${i}" class="log-input" placeholder="kg" value="${val.weight}" onchange="updateDraftData(${i})">
            <input type="number" id="r-${i}" class="log-input" placeholder="reps" value="${val.reps}" onchange="updateDraftData(${i})">
            <input type="number" id="s-${i}" class="log-input" placeholder="set" value="${val.sets}" onchange="updateDraftData(${i})">
        </div>`;
        list.appendChild(div);
    });
    showView("workout-view");
}

function actuallyStartWorkout() {
    activeDraft.isStarted = true;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    startTimer();
}

document.getElementById("global-home").onclick = () => { pauseTimer(); location.reload(); }
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("start-free-btn").onclick = renderCalendar; // Ändrat: Går nu till kalender
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();

function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
}

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
