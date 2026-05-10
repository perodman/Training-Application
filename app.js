let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";
let isSelectingDateForFreePass = false;

// Timer-variabler
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
}).catch(err => console.error("Kunde inte ladda program.json", err));

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

function showView(id) {
    const target = document.getElementById(id);
    if(!target) return;
    
    // Hantera infoboxen i kalendern säkert
    const infoBox = document.getElementById("calendar-info-box");
    if (infoBox) {
        if (id === "calendar-view" && isSelectingDateForFreePass) {
            infoBox.classList.remove("hidden");
        } else {
            infoBox.classList.add("hidden");
        }
    }

    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    target.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
}

function openModal() {
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- TIMER LOGIK ---
function updateTimerDisplay() {
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    const display = document.getElementById("workout-timer");
    if(display) display.textContent = `${hrs}:${mins}:${secs}`;
}

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    const btn = document.getElementById("timer-toggle-btn");
    if(btn) btn.textContent = "Pausa ⏸️";
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
    const btn = document.getElementById("timer-toggle-btn");
    if(btn) btn.textContent = "Fortsätt ▶️";
}

const timerToggle = document.getElementById("timer-toggle-btn");
if(timerToggle) {
    timerToggle.onclick = () => {
        if (isTimerRunning) pauseTimer();
        else startTimer();
    };
}

// --- ÖVNINGAR & BANK ---
function openCreateExerciseModal(callback = null) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Namn (t.ex. Knäböj)">
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option><option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option><option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option><option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" id="save-new-ex-btn">Spara Övning</button>
    `;
    
    document.getElementById("save-new-ex-btn").onclick = () => {
        const name = document.getElementById("new-ex-name").value.trim();
        const target = document.getElementById("new-ex-cat").value;
        if(!name) return alert("Ange ett namn!");
        const newEx = { id: Date.now() + Math.random(), name, target, defaultSets: 3 };
        masterExercises.push(newEx);
        saveAll();
        if(callback) callback(newEx);
        else { closeModal(); filterExercises(currentExerciseCategory); }
    };
    openModal();
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
        div.innerHTML = `<div><strong>${ex.name}</strong><br><small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:10px;">${ex.target}</small></div>
        <button style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="openEditExerciseModal(${ex.id})">⚙️</button>`;
        results.appendChild(div);
    });
}

function openEditExerciseModal(id) {
    const ex = masterExercises.find(e => e.id == id);
    if(!ex) return;
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
        <select id="edit-ex-cat" class="log-input">
            <option value="Ben" ${ex.target==='Ben'?'selected':''}>Ben</option>
            <option value="Bröst" ${ex.target==='Bröst'?'selected':''}>Bröst</option>
            <!-- ... Fler options ... -->
        </select>
        <button class="mode-btn blue" onclick="updateExercise(${id})">Uppdatera</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteMasterExercise(${id})">Radera permanent</button>
    `;
    openModal();
}

// --- KALENDER ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    if(!grid || !label) return;
    
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
        if (override && override !== "none") displayPass = programData.routine.find(p => p.id === override);
        else if (isAutoDay && override !== "none") displayPass = programData.routine[d % programData.routine.length];
        
        let info = "";
        if (hasWorkouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = "⏱️"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
        cell.innerHTML = `<span>${d}</span><span>${info}</span>`;
        cell.onclick = () => {
            const wasSelecting = isSelectingDateForFreePass;
            isSelectingDateForFreePass = false;
            if(wasSelecting) {
                startFreeWorkoutOnDate(dateStr);
            } else {
                openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
            }
        };
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;
    
    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            html += `<div class="card glass" style="text-align:left; margin-bottom:10px;">
                <strong>${w.programName}</strong>
                <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="float:right; color:var(--danger); background:none; border:none;">✖</button>
            </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pass</button>`;
    } else {
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name}</button>`;
        html += `<button class="mode-btn glass-border" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')">Starta Fritt Pass ➕</button>`;
    }
    body.innerHTML = html;
    openModal();
}

function startFreeWorkoutOnDate(date) {
    const freePass = { id: "free-" + Date.now(), name: "Fritt Pass", exercises: [] };
    startWorkout(freePass, null, date, false);
}

// --- AKTIVT PASS ---
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: data || workout.exercises.map(()=>({weight:"", reps:"", sets:3})), 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: secondsElapsed,
        isStarted: isImmediateStart
    };
    renderActiveWorkout();
}

function renderActiveWorkout() {
    const title = document.getElementById("active-title");
    if(title) title.textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    if(!list) return;

    if(!activeDraft.isStarted) {
        list.innerHTML = `
            <div style="text-align:center; padding:40px 0;">
                <button class="mode-btn green" style="padding:20px; font-size:18px;" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>
            </div>
        `;
        showView("workout-view");
        return;
    }

    list.innerHTML = activeDraft.workout.exercises.map((ex, i) => `
        <div class="card glass">
            <strong>${ex.name}</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:10px;">
                <input type="number" class="log-input" placeholder="kg" value="${activeDraft.data[i].weight}" onchange="activeDraft.data[${i}].weight=this.value; saveAll()">
                <input type="number" class="log-input" placeholder="reps" value="${activeDraft.data[i].reps}" onchange="activeDraft.data[${i}].reps=this.value; saveAll()">
                <input type="number" class="log-input" placeholder="set" value="${activeDraft.data[i].sets}" onchange="activeDraft.data[${i}].sets=this.value; saveAll()">
            </div>
        </div>
    `).join("");
    showView("workout-view");
}

function actuallyStartWorkout() {
    activeDraft.isStarted = true;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    startTimer();
}

// --- EVENT LISTENERS ---
const homeBtn = document.getElementById("global-home");
if(homeBtn) homeBtn.onclick = () => { isSelectingDateForFreePass = false; renderHome(); };

const startNewBtn = document.getElementById("start-new-btn");
if(startNewBtn) startNewBtn.onclick = () => { isSelectingDateForFreePass = false; renderCalendar(); };

const startFreeBtn = document.getElementById("start-free-btn");
if(startFreeBtn) startFreeBtn.onclick = () => { isSelectingDateForFreePass = true; renderCalendar(); };

const calModeBtn = document.getElementById("calendar-mode");
if(calModeBtn) calModeBtn.onclick = () => { isSelectingDateForFreePass = false; renderCalendar(); };

const progModeBtn = document.getElementById("view-programs-btn");
if(progModeBtn) progModeBtn.onclick = () => renderProgramView();

const exModeBtn = document.getElementById("view-exercises-btn");
if(exModeBtn) exModeBtn.onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };

const statsModeBtn = document.getElementById("stats-mode");
if(statsModeBtn) statsModeBtn.onclick = renderStats;

function renderHome() {
    showView("home-view");
    const draftAlert = document.getElementById("draft-alert");
    const freeBtn = document.getElementById("start-free-btn");
    const newBtn = document.getElementById("start-new-btn");

    if(activeDraft && draftAlert) {
        draftAlert.classList.remove("hidden");
        if(freeBtn) freeBtn.classList.add("hidden");
        if(newBtn) newBtn.classList.add("hidden");
        const resumeBtn = document.getElementById("resume-workout-btn");
        if(resumeBtn) resumeBtn.onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date, activeDraft.isStarted);
    }
}

function prepareStart(date, id) { 
    const p = programData.routine.find(x => x.id === id); 
    closeModal(); 
    startWorkout(p, null, date, false); 
}

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }

// ... (renderStats och övriga hjälpfunktioner förblir desamma) ...
