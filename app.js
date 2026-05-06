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
                    <p style="font-size:11px; margin:5px 0;">${ex.description || "Ingen beskrivning."}</p>
                    <img src="${ex.image}" class="exercise-image" onerror="this.src='https://via.placeholder.com/300x150?text=Bild+laddas...'">
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

        // Färglogik per pass (Mån=A, Ons=B, Fre=C, nästa Mån=D osv)
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
    body.innerHTML = `<h3>${date.toLocaleDateString('sv-SE')}</h3><h2>${pass.name}</h2>`;
    pass.exercises.forEach(e => body.innerHTML += `<div>• ${e.name}</div>`);
    modal.classList.remove("hidden");
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(offset) { currentViewDate.setMonth(currentViewDate.getMonth() + offset); renderCalendar(); }
function showView(id) { document.querySelectorAll(".view").forEach(v => v.classList.add("hidden")); document.getElementById(id).classList.remove("hidden"); }

document.getElementById("start-new-btn").onclick = () => startWorkout(programData.routine[0]);
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("global-home").onclick = renderHome;
document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.exercises);
document.getElementById("save-workout-btn").onclick = () => { /* Logik för att spara */ location.reload(); };
