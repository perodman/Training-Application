let programData;
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let currentViewDate = new Date();

fetch("program.json").then(r => r.json()).then(json => {
    programData = json;
    renderHome();
});

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

function startWorkout(workout, savedData = null) {
    activeDraft = { workout: workout, startTime: new Date().toISOString() };
    document.getElementById("active-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    
    workout.exercises.forEach((ex, i) => {
        const val = savedData ? savedData[i] : { weight: "", reps: "", sets: ex.defaultSets };
        const container = document.createElement("div");
        container.className = "exercise-card-container";
        const imgPath = ex.image && ex.image !== "" ? ex.image : "https://via.placeholder.com/300x150?text=" + encodeURIComponent(ex.name);
        
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
                <div class="card-back">
                    <strong>TIPS & FORM</strong>
                    <p style="font-size:11px; margin:5px 0;">${ex.description || "Isolera muskeln och håll tempot."}</p>
                    <img src="${imgPath}" class="exercise-image">
                </div>
            </div>
        `;
        container.onclick = (e) => { if (e.target.tagName !== 'INPUT') container.classList.toggle("flipped"); };
        list.appendChild(container);
    });
    showView("workout-view");
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.innerHTML = d;

        if ([1, 3, 5].includes(date.getDay())) {
            const dayCounter = Math.floor(date.getTime() / 86400000);
            const passIdx = dayCounter % 4;
            const classes = ["cell-pass-a", "cell-pass-b", "cell-pass-c", "cell-pass-d"];
            cell.classList.add(classes[passIdx]);
            cell.onclick = () => showDayInfo(date, programData.routine[passIdx]);
        }

        const hasCompleted = workoutHistory.some(w => new Date(w.date).toDateString() === date.toDateString());
        if (hasCompleted) cell.classList.add("cell-completed");

        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function showDayInfo(date, pass) {
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>${date.toLocaleDateString('sv-SE')}</h3><h2>${pass.name}</h2><hr>`;
    pass.exercises.forEach(e => body.innerHTML += `<div style="padding:4px 0">• ${e.name} (${e.target})</div>`);
    modal.classList.remove("hidden");
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(offset) { currentViewDate.setMonth(currentViewDate.getMonth() + offset); renderCalendar(); }
function showView(id) { document.querySelectorAll(".view").forEach(v => v.classList.add("hidden")); document.getElementById(id).classList.remove("hidden"); }

document.getElementById("start-new-btn").onclick = () => {
    const lastWorkout = workoutHistory[workoutHistory.length - 1];
    let nextIdx = 0;
    if (lastWorkout) {
        const lastIdx = programData.routine.findIndex(p => p.name === lastWorkout.programName);
        nextIdx = (lastIdx + 1) % programData.routine.length;
    }
    startWorkout(programData.routine[nextIdx]);
};

document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("global-home").onclick = renderHome;
document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.exercises);
document.getElementById("pause-workout-btn").onclick = () => {
    activeDraft.exercises = activeDraft.workout.exercises.map((ex, i) => ({
        weight: document.getElementById(`w-${i}`).value,
        reps: document.getElementById(`r-${i}`).value,
        sets: document.getElementById(`s-${i}`).value
    }));
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderHome();
};

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
    activeDraft = null;
    location.reload();
};

document.getElementById("view-programs-btn").onclick = () => {
    const list = document.getElementById("modal-body");
    list.innerHTML = "<h2>Programöversikt</h2>";
    programData.routine.forEach(p => {
        list.innerHTML += `<div class="card"><h3>${p.name}</h3>${p.exercises.map(e => `<div>• ${e.name}</div>`).join("")}</div>`;
    });
    document.getElementById("workout-modal").classList.remove("hidden");
};
