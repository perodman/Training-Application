let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let currentViewDate = new Date();
let timerInterval = null;
let secondsElapsed = activeDraft ? (activeDraft.secondsElapsed || 0) : 0;

// --- INIT & HOME ---
function renderHome() {
    showView("home-view");
    document.getElementById("draft-alert").className = activeDraft ? "" : "hidden";
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }

// --- SMART ÖVNINGSVÄLJARE ---
function openExercisePicker(onSelect) {
    const body = document.getElementById("modal-body");
    const cats = ["Ben", "Rygg", "Bröst", "Axlar", "Armar", "Bål"];
    body.innerHTML = `<h3>Välj Kategori</h3><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">` + 
        cats.map(c => `<button class="mode-btn glass-border" onclick="showPickerList('${c}')">${c}</button>`).join("") + `</div>`;
    
    window.showPickerList = (cat) => {
        const filtered = masterExercises.filter(ex => cat === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === cat);
        body.innerHTML = `<h3>${cat}</h3><div style="max-height:300px; overflow-y:auto;">` + 
            filtered.map(ex => `<button class="mode-btn glass" onclick="selectAndClose('${ex.name}')">${ex.name}</button>`).join("") + 
            `</div><button class="mode-btn" onclick="openExercisePicker()">← Tillbaka</button>`;
    };
    window.selectAndClose = (name) => { onSelect(name); closeModal(); };
    openModal();
}

// --- TRÄNINGSFLÖDE ---
function startWorkout(name, exercises = []) {
    activeDraft = { 
        workout: { name, exercises: exercises.map(ex => ({ name: ex.name })) },
        data: exercises.map(() => ({ weight: "", reps: "", sets: 3 })),
        date: new Date().toISOString().split('T')[0],
        isStarted: true,
        secondsElapsed: 0
    };
    renderActiveWorkout();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = activeDraft.workout.exercises.map((ex, i) => `
        <div class="card glass">
            <strong>${ex.name}</strong>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px;">
                <input type="number" class="mode-btn glass" style="margin:0; padding:10px;" placeholder="kg" value="${activeDraft.data[i].weight}" onchange="activeDraft.data[${i}].weight=this.value; saveDraft()">
                <input type="number" class="mode-btn glass" style="margin:0; padding:10px;" placeholder="reps" value="${activeDraft.data[i].reps}" onchange="activeDraft.data[${i}].reps=this.value; saveDraft()">
            </div>
        </div>`).join("");
    
    list.innerHTML += `
        <button class="mode-btn glass-border" onclick="openExercisePicker(addExToActive)">+ Lägg till övning</button>
        <button class="mode-btn orange" onclick="saveAndExit()">Spara utkast & Stäng</button>
        <button class="mode-btn green" onclick="finishWorkout()">AVSLUTA & LOGGA PASS 🏆</button>
    `;
    startTimer();
    showView("workout-view");
}

function addExToActive(name) {
    activeDraft.workout.exercises.push({ name });
    activeDraft.data.push({ weight: "", reps: "", sets: 3 });
    renderActiveWorkout();
}

function saveDraft() { localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft)); }
function saveAndExit() { saveDraft(); clearInterval(timerInterval); location.reload(); }

function finishWorkout() {
    workoutHistory.push({ ...activeDraft, totalTime: document.getElementById("workout-timer").textContent });
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    location.reload();
}

// --- KALENDER ---
function renderCalendar() {
    const container = document.getElementById("calendar-view");
    const monthName = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    container.innerHTML = `
        <h2 style="text-align:center;">Träningsdagbok</h2>
        <div class="calendar-header">
            <button class="nav-arrow" onclick="moveMonth(-1)">❮</button>
            <div id="month-label">${monthName.toUpperCase()}</div>
            <button class="nav-arrow" onclick="moveMonth(1)">❯</button>
        </div>
        <div id="calendar-grid" class="calendar-grid"></div>
        <button class="mode-btn blue" onclick="startWorkout('Fritt Pass')" style="margin-top:20px;">Starta Fritt Pass ➕</button>
    `;
    const grid = document.getElementById("calendar-grid");
    for (let d = 1; d <= 31; d++) {
        grid.innerHTML += `<div class="calendar-cell"><span>${d}</span></div>`;
    }
    showView("calendar-view");
}

function moveMonth(dir) { currentViewDate.setMonth(currentViewDate.getMonth() + dir); renderCalendar(); }
function startTimer() { if (timerInterval) return; timerInterval = setInterval(() => { secondsElapsed++; updateTimer(); }, 1000); }
function updateTimer() {
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById("workout-timer").textContent = `${hrs}:${mins}:${secs}`;
}

// Event Listeners
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("resume-workout-btn").onclick = () => renderActiveWorkout();

renderHome();
