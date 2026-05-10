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
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(id);
    if(target) target.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }

// --- TIMER ---
function updateTimerDisplay() {
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    const timerEl = document.getElementById("workout-timer");
    if(timerEl) timerEl.textContent = `${hrs}:${mins}:${secs}`;
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

document.getElementById("timer-toggle-btn").onclick = () => {
    if (isTimerRunning) pauseTimer();
    else startTimer();
};

// --- TRÄNINGS-LOGIK ---
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    // Om vi återupptar ett gammalt utkast som inte har "set-array" formatet, nollställ data
    let cleanData = data;
    if (data && !Array.isArray(data[0])) {
        cleanData = workout.exercises.map(() => ([{ weight: "", reps: "" }]));
    }

    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: cleanData || workout.exercises.map(() => ([{ weight: "", reps: "" }])), 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: activeDraft ? activeDraft.secondsElapsed : 0,
        isStarted: isImmediateStart || (activeDraft ? activeDraft.isStarted : false)
    };
    
    secondsElapsed = activeDraft.secondsElapsed;
    renderActiveWorkout();
    updateTimerDisplay();
    if(activeDraft.isStarted) startTimer();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        list.innerHTML = `
            <div style="text-align:center; padding:40px 20px;">
                <button class="mode-btn green" style="height:80px; font-size:20px;" onclick="actuallyStartWorkout()">STARTA PASSET 🔥</button>
            </div>`;
        showView("workout-view");
        return;
    }

    activeDraft.workout.exercises.forEach((ex, exIdx) => {
        const sets = activeDraft.data[exIdx] || [{weight:"", reps:""}];
        const div = document.createElement("div");
        div.className = "card glass";
        
        let setsHtml = "";
        sets.forEach((set, setIdx) => {
            setsHtml += `
            <div style="display:grid; grid-template-columns: 30px 1fr 1fr 40px; gap:10px; align-items:center; margin-bottom:8px;">
                <span style="font-weight:800; color:var(--primary); font-size:12px;">${setIdx + 1}</span>
                <input type="number" placeholder="kg" class="log-input" value="${set.weight}" oninput="updateSetData(${exIdx}, ${setIdx}, 'weight', this.value)">
                <input type="number" placeholder="reps" class="log-input" value="${set.reps}" oninput="updateSetData(${exIdx}, ${setIdx}, 'reps', this.value)">
                <button onclick="removeSet(${exIdx}, ${setIdx})" style="background:none; border:none; color:var(--danger); font-size:18px;">✕</button>
            </div>`;
        });

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                <strong style="font-size:16px;">${ex.name}</strong>
                <button onclick="removeActiveExercise(${exIdx})" style="color:var(--text-light); background:none; border:none; font-size:12px;">Ta bort övning</button>
            </div>
            <div id="sets-container-${exIdx}">${setsHtml}</div>
            <button class="mode-btn glass-border" style="font-size:12px; padding:10px; margin-top:10px; background:rgba(255,255,255,0.05);" onclick="addSet(${exIdx})">+ Lägg till set</button>
        `;
        list.appendChild(div);
    });

    const addExBtn = document.createElement("button");
    addExBtn.className = "mode-btn blue";
    addExBtn.style.marginTop = "20px";
    addExBtn.innerHTML = "➕ Lägg till ny övning";
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
    const currentSets = activeDraft.data[exIdx];
    const lastSet = currentSets[currentSets.length - 1];
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

function removeActiveExercise(idx) {
    if(confirm("Vill du ta bort hela övningen?")) {
        activeDraft.workout.exercises.splice(idx, 1);
        activeDraft.data.splice(idx, 1);
        saveDraft();
        renderActiveWorkout();
    }
}

// --- NAVIGATION & HEM ---
function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    } else {
        document.getElementById("draft-alert").classList.add("hidden");
    }
}

document.getElementById("global-home").onclick = () => {
    if(isTimerRunning) pauseTimer();
    renderHome();
};

document.getElementById("view-exercises-btn").onclick = () => {
    showView("exercises-view");
    filterExercises(currentExerciseCategory);
};

document.getElementById("save-workout-btn").onclick = () => {
    if(!activeDraft || !activeDraft.isStarted) return;
    pauseTimer();
    const finalTime = document.getElementById("workout-timer").textContent;
    
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: finalTime,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name,
            sets: activeDraft.data[i]
        }))
    };
    
    workoutHistory.push(log);
    saveAll();
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    location.reload();
};

// --- ÖVRIGA MODALER ---
function openAddExerciseToWorkoutModal() {
    renderExercisePicker("Ben");
    openModal();
}

function renderExercisePicker(category) {
    const body = document.getElementById("modal-body");
    const categories = ["Ben", "Bröst", "Rygg", "Axlar", "Armar", "Bål"];
    let html = `<h3>Välj Övning</h3><div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px; margin-bottom:15px;">`;
    categories.forEach(cat => {
        html += `<button onclick="renderExercisePicker('${cat}')" class="mode-btn glass-border" style="padding:5px; font-size:12px;">${cat}</button>`;
    });
    html += `</div><div style="max-height:300px; overflow-y:auto;">`;
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    filtered.forEach(ex => {
        html += `<div class="card glass" style="padding:10px; margin-bottom:5px; cursor:pointer;" onclick="confirmAddExerciseToActive(${ex.id})">${ex.name}</div>`;
    });
    body.innerHTML = html + `</div>`;
}

function confirmAddExerciseToActive(exId) {
    const ex = masterExercises.find(e => e.id == exId);
    activeDraft.workout.exercises.push({ name: ex.name, target: ex.target });
    activeDraft.data.push([{ weight: "", reps: "" }]);
    saveDraft();
    closeModal();
    renderActiveWorkout();
}
