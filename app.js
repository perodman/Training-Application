// --- GLOBAL STATE ---
let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let currentViewDate = new Date();

let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;

// --- INITIALIZATION ---
async function initApp() {
    try {
        const response = await fetch("program.json");
        const json = await response.json();
        const savedProgram = JSON.parse(localStorage.getItem("myCustomProgram"));
        programData = savedProgram || json;

        // Om master-listan är tom, populera den från programmet
        if (masterExercises.length === 0 && programData.routine) {
            programData.routine.forEach(p => {
                p.exercises.forEach(ex => {
                    if (!masterExercises.find(m => m.name === ex.name)) {
                        masterExercises.push({
                            ...ex,
                            id: Date.now() + Math.random(),
                            category: ex.category || "Övrigt"
                        });
                    }
                });
            });
            saveToLocalStorage();
        }

        setupEventListeners();
        renderHome();
        
        // Återställ pågående pass om det finns
        if (activeDraft) {
            document.getElementById("draft-alert").classList.remove("hidden");
            secondsElapsed = activeDraft.secondsElapsed || 0;
        }
    } catch (error) {
        console.error("Kunde inte ladda programdata:", error);
    }
}

function saveToLocalStorage() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
}

// --- TIMER LOGIC ---
function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    const btn = document.getElementById("timer-toggle-btn");
    if (btn) btn.textContent = "Pausa ⏸️";
    
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDisplay();
        if (activeDraft) activeDraft.secondsElapsed = secondsElapsed;
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    const btn = document.getElementById("timer-toggle-btn");
    if (btn) btn.textContent = "Fortsätt ▶️";
}

function updateTimerDisplay() {
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    const el = document.getElementById("workout-timer");
    if (el) el.textContent = `${hrs}:${mins}:${secs}`;
}

// --- NAVIGATION & VIEWS ---
function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove("hidden");
        window.scrollTo(0, 0);
    }
}

function renderHome() {
    showView("home-view");
    if (activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
    } else {
        document.getElementById("draft-alert").classList.add("hidden");
    }
}

// --- WORKOUT ENGINE ---
function startWorkout(workout, savedData = null, specificDate = null) {
    // Om vi inte har sparad data (nytt pass), hämta historik för att förifylla vikter
    const data = savedData || workout.exercises.map(ex => {
        const history = getExerciseHistory(ex.name);
        return {
            setsData: history ? JSON.parse(JSON.stringify(history)) : 
                     Array.from({ length: 3 }, () => ({ weight: "", reps: "" }))
        };
    });

    activeDraft = {
        workout: JSON.parse(JSON.stringify(workout)),
        data: data,
        date: specificDate || new Date().toISOString().split('T')[0],
        secondsElapsed: activeDraft ? activeDraft.secondsElapsed : 0,
        isStarted: false
    };

    saveActiveDraft();
    renderActiveWorkout();
}

function renderActiveWorkout() {
    showView("workout-view");
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if (!activeDraft.isStarted) {
        list.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <button class="mode-btn blue main-action" onclick="activateWorkout()">STARTA PASS NU 🔥</button>
            </div>`;
        return;
    }

    activeDraft.workout.exercises.forEach((ex, exIdx) => {
        const exerciseData = activeDraft.data[exIdx];
        const setsHtml = exerciseData.setsData.map((s, sIdx) => `
            <div class="set-row">
                <div class="set-label">SET ${sIdx + 1}</div>
                <input type="number" class="set-input" placeholder="kg" value="${s.weight}" onchange="updateSet(${exIdx}, ${sIdx}, 'weight', this.value)">
                <input type="number" class="set-input" placeholder="reps" value="${s.reps}" onchange="updateSet(${exIdx}, ${sIdx}, 'reps', this.value)">
                <button class="remove-set-btn" onclick="removeSet(${exIdx}, ${sIdx})">✖</button>
            </div>
        `).join("");

        list.innerHTML += `
            <div class="card glass">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <strong style="font-size:1.1rem;">${ex.name}</strong>
                    <div style="display:flex; gap:8px;">
                        <button class="reorder-btn" onclick="moveExercise(${exIdx}, -1)">↑</button>
                        <button class="reorder-btn" onclick="moveExercise(${exIdx}, 1)">↓</button>
                    </div>
                </div>
                ${setsHtml}
                <button class="add-set-btn" onclick="addSet(${exIdx})">+ Lägg till set</button>
            </div>`;
    });
}

function activateWorkout() {
    activeDraft.isStarted = true;
    saveActiveDraft();
    renderActiveWorkout();
    startTimer();
}

function updateSet(exIdx, sIdx, field, val) {
    activeDraft.data[exIdx].setsData[sIdx][field] = val;
    saveActiveDraft();
}

function addSet(exIdx) {
    activeDraft.data[exIdx].setsData.push({ weight: "", reps: "" });
    renderActiveWorkout();
}

function removeSet(exIdx, sIdx) {
    activeDraft.data[exIdx].setsData.splice(sIdx, 1);
    renderActiveWorkout();
}

function moveExercise(idx, direction) {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= activeDraft.workout.exercises.length) return;
    
    // Flytta både övning och dess data
    [activeDraft.workout.exercises[idx], activeDraft.workout.exercises[newIdx]] = 
    [activeDraft.workout.exercises[newIdx], activeDraft.workout.exercises[idx]];
    
    [activeDraft.data[idx], activeDraft.data[newIdx]] = 
    [activeDraft.data[newIdx], activeDraft.data[idx]];
    
    renderActiveWorkout();
    saveActiveDraft();
}

function saveActiveDraft() {
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

// --- PROGRAM VIEW LOGIC ---
function renderProgramView() {
    const list = document.getElementById("pass-selector-list");
    list.innerHTML = "";
    const icons = ["🔥", "💪", "⚡", "🏋️", "🏃", "🧘"];

    programData.routine.forEach((pass, i) => {
        const card = document.createElement("div");
        card.className = "prog-card";
        card.innerHTML = `
            <span class="prog-icon">${icons[i % icons.length]}</span>
            <h4>${pass.name}</h4>
        `;
        card.onclick = () => {
            document.querySelectorAll(".prog-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            showProgramDetails(i);
        };
        list.appendChild(card);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    const detailArea = document.getElementById("program-details-area");
    const listArea = document.getElementById("program-exercise-list");
    
    detailArea.classList.remove("hidden");
    listArea.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="margin:0; color:var(--primary)">${pass.name}</h3>
            <button class="mode-btn blue" style="width:auto; padding:10px 20px;" onclick="startWorkout(programData.routine[${idx}])">Starta</button>
        </div>
        ${pass.exercises.map(e => `
            <div style="padding:15px; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between;">
                <span>${e.name}</span>
                <span style="color:var(--text-light)">${e.sets} x ${e.reps}</span>
            </div>
        `).join("")}
    `;
}

// --- CALENDAR LOGIC ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) grid.appendChild(document.createElement("div"));

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasHistory = workoutHistory.find(h => h.date === dateStr);
        
        const cell = document.createElement("div");
        cell.className = "calendar-cell" + (hasHistory ? " cell-completed" : "");
        cell.innerHTML = `<span>${d}</span>`;
        cell.onclick = () => openDayManager(dateStr);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Hantering: ${dateStr}</h3>
        <p style="text-align:center; color:var(--text-light)">Vad vill du göra för denna dag?</p>
        <div id="day-options">
            <h4 style="margin-top:20px;">Starta ett pass:</h4>
            ${programData.routine.map(p => `
                <button class="mode-btn glass-border" onclick="closeModal(); startWorkout(programData.findPass('${p.name}'), null, '${dateStr}')">
                    ${p.name}
                </button>
            `).join("")}
            <button class="mode-btn orange" onclick="closeModal(); startFreeWorkout('${dateStr}')">Fritt pass ➕</button>
        </div>
    `;
    // Helper för att hitta pass i modal-strängen
    programData.findPass = (name) => programData.routine.find(p => p.name === name);
    openModal();
}

// --- UTILS ---
function openChangeWorkoutInActive() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>Byt träningspass</h3><p>Välj det pass du vill byta till. Nuvarande framsteg i detta pass kommer att nollställas.</p>`;
    
    programData.routine.forEach(p => {
        const btn = document.createElement("button");
        btn.className = "mode-btn glass";
        btn.textContent = p.name;
        btn.onclick = () => {
            if(confirm(`Vill du byta till ${p.name}?`)) {
                closeModal();
                startWorkout(p);
            }
        };
        body.appendChild(btn);
    });
    openModal();
}

function getExerciseHistory(name) {
    const lastWorkout = [...workoutHistory].reverse().find(w => w.exercises.find(e => e.name === name));
    if (lastWorkout) {
        const ex = lastWorkout.exercises.find(e => e.name === name);
        return ex.setsData;
    }
    return null;
}

function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }

function pauseAndSaveDraft() {
    pauseTimer();
    activeDraft.secondsElapsed = secondsElapsed;
    saveActiveDraft();
    alert("Passet har sparats som utkast.");
    location.reload();
}

function setupEventListeners() {
    document.getElementById("global-home").onclick = () => {
        if (activeDraft && activeDraft.isStarted) {
            if (confirm("Du har ett pågående pass. Spara som utkast och gå hem?")) {
                pauseAndSaveDraft();
            }
        } else {
            location.reload();
        }
    };

    document.getElementById("start-new-btn").onclick = renderCalendar;
    document.getElementById("calendar-mode").onclick = renderCalendar;
    document.getElementById("view-programs-btn").onclick = renderProgramView;
    
    document.getElementById("resume-workout-btn").onclick = () => {
        secondsElapsed = activeDraft.secondsElapsed || 0;
        updateTimerDisplay();
        renderActiveWorkout();
        if (activeDraft.isStarted) startTimer();
    };

    document.getElementById("save-workout-btn").onclick = () => {
        if (!confirm("Vill du avsluta och spara passet?")) return;
        
        const finalWorkout = {
            date: activeDraft.date,
            name: activeDraft.workout.name,
            duration: secondsElapsed,
            exercises: activeDraft.workout.exercises.map((ex, i) => ({
                name: ex.name,
                setsData: activeDraft.data[i].setsData
            }))
        };

        workoutHistory.push(finalWorkout);
        localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
        localStorage.removeItem("activeWorkoutDraft");
        alert("Bra jobbat! Passet är sparat.");
        location.reload();
    };
}

function changeMonth(dir) {
    currentViewDate.setMonth(currentViewDate.getMonth() + dir);
    renderCalendar();
}

function startFreeWorkout(date) {
    startWorkout({ name: "Fritt Pass", exercises: [] }, [], date);
}

// Starta appen
initApp();
