let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

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
});

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
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

// --- AKTIVT PASS (MED INDIVIDUELLA SET) ---
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    
    // Om data saknas (nytt pass), skapar vi en struktur med ett tomt set per övning som start
    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: data || workout.exercises.map(() => ([{ weight: "", reps: "" }])), 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: secondsElapsed,
        isStarted: isImmediateStart || (activeDraft ? activeDraft.isStarted : false)
    };
    
    renderActiveWorkout();
    updateTimerDisplay();
    if(activeDraft.isStarted) startTimer();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        list.innerHTML = `<button class="mode-btn green" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>`;
        showView("workout-view");
        return;
    }

    activeDraft.workout.exercises.forEach((ex, exIdx) => {
        const sets = activeDraft.data[exIdx];
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.marginBottom = "20px";
        
        let setsHtml = "";
        sets.forEach((set, setIdx) => {
            setsHtml += `
            <div style="display:grid; grid-template-columns: 30px 1fr 1fr 40px; gap:10px; align-items:center; margin-bottom:10px;">
                <span style="font-weight:800; color:var(--primary); font-size:12px;">${setIdx + 1}</span>
                <input type="number" placeholder="Kg" class="log-input" style="margin:0;" value="${set.weight}" onchange="updateSetData(${exIdx}, ${setIdx}, 'weight', this.value)">
                <input type="number" placeholder="Reps" class="log-input" style="margin:0;" value="${set.reps}" onchange="updateSetData(${exIdx}, ${setIdx}, 'reps', this.value)">
                <button onclick="removeSet(${exIdx}, ${setIdx})" style="background:none; border:none; color:var(--danger); font-size:16px;">✕</button>
            </div>`;
        });

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <strong style="font-size:16px;">${ex.name}</strong>
                <button onclick="removeActiveExercise(${exIdx})" style="color:var(--danger); background:none; border:none;">Ta bort</button>
            </div>
            <div id="sets-container-${exIdx}">${setsHtml}</div>
            <button class="mode-btn glass-border" style="font-size:12px; padding:8px; margin-top:5px;" onclick="addSet(${exIdx})">+ Lägg till set</button>
        `;
        list.appendChild(div);
    });

    const addExBtn = document.createElement("button");
    addExBtn.className = "mode-btn blue";
    addExBtn.innerHTML = "➕ Lägg till övning";
    addExBtn.onclick = openAddExerciseToWorkoutModal;
    list.appendChild(addExBtn);

    showView("workout-view");
}

function actuallyStartWorkout() {
    activeDraft.isStarted = true;
    saveDraft();
    renderActiveWorkout();
    startTimer();
}

function addSet(exIdx) {
    // Kopiera värden från föregående set som förslag
    const lastSet = activeDraft.data[exIdx][activeDraft.data[exIdx].length - 1];
    activeDraft.data[exIdx].push({ 
        weight: lastSet ? lastSet.weight : "", 
        reps: lastSet ? lastSet.reps : "" 
    });
    saveDraft();
    renderActiveWorkout();
}

function removeSet(exIdx, setIdx) {
    if(activeDraft.data[exIdx].length > 1) {
        activeDraft.data[exIdx].splice(setIdx, 1);
        saveDraft();
        renderActiveWorkout();
    }
}

function updateSetData(exIdx, setIdx, field, value) {
    activeDraft.data[exIdx][setIdx][field] = value;
    saveDraft();
}

function saveDraft() {
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

// --- KALENDER & ÖVRIGT (Ursprunglig logik) ---
function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
}

document.getElementById("save-workout-btn").onclick = () => {
    pauseTimer();
    const finalTime = document.getElementById("workout-timer").textContent;
    
    // Omvandla den nya datastrukturen till en läsbar text för historiken
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: finalTime,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name,
            // Vi sparar seten som en sträng för enkel visning, eller som array
            details: activeDraft.data[i] 
        }))
    };
    
    workoutHistory.push(log);
    saveAll();
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    location.reload();
};

// ... Resten av dina funktioner (renderCalendar, filterExercises etc.) förblir desamma ...
// Kom ihåg att inkludera navigerings-listeners och bas-funktioner från originalkoden här.
