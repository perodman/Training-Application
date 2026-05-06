let programData;
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");

fetch("program.json")
    .then(r => r.json())
    .then(json => {
        programData = json;
        renderHome();
    });

function renderHome() {
    const lastWorkout = workoutHistory[workoutHistory.length - 1];
    let nextIndex = 0;
    if (lastWorkout) {
        const lastIdx = programData.routine.findIndex(p => p.id === lastWorkout.programId);
        nextIndex = (lastIdx + 1) % programData.routine.length;
    }
    const nextWorkout = programData.routine[nextIndex];
    document.getElementById("next-workout-name").textContent = nextWorkout.name;
    document.getElementById("start-workout-btn").onclick = () => startWorkout(nextWorkout);
    showView("home-view");
}

function startWorkout(workout) {
    document.getElementById("active-workout-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    workout.exercises.forEach((ex, i) => {
        const item = document.createElement("div");
        item.className = "exercise-item card";
        item.style.textAlign = "left";
        item.innerHTML = `
            <div style="color:#3b82f6; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px;">${ex.target}</div>
            <strong style="font-size:18px;">${ex.name}</strong>
            <div class="input-row">
                <input type="number" placeholder="Kg" id="w-${i}" class="log-input">
                <input type="number" placeholder="Reps" id="r-${i}" class="log-input">
                <input type="number" placeholder="Set" value="${ex.defaultSets}" id="s-${i}" class="log-input">
            </div>
        `;
        list.appendChild(item);
    });
    document.getElementById("save-workout-btn").onclick = () => saveWorkout(workout);
    showView("workout-view");
}

function saveWorkout(workout) {
    const log = {
        date: new Date().toISOString(), // Spara fullt datum för kalendern
        displayDate: new Date().toLocaleDateString(),
        programId: workout.id,
        programName: workout.name,
        exercises: workout.exercises.map((ex, i) => ({
            name: ex.name,
            weight: document.getElementById(`w-${i}`).value || 0,
            reps: document.getElementById(`r-${i}`).value || 0,
            sets: document.getElementById(`s-${i}`).value || 0
        }))
    };
    workoutHistory.push(log);
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    renderHome();
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const historyList = document.getElementById("history-list");
    grid.innerHTML = "";
    historyList.innerHTML = "";

    // Skapa en enkel 28-dagars vy (4 veckor)
    const now = new Date();
    const datesWithWorkout = workoutHistory.map(w => new Date(w.date).toDateString());

    for (let i = -20; i <= 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() + i);
        const dayEl = document.createElement("div");
        dayEl.className = "calendar-day";
        dayEl.textContent = d.getDate();
        
        if (datesWithWorkout.includes(d.toDateString())) dayEl.classList.add("active");
        if (d.toDateString() === now.toDateString()) dayEl.classList.add("today");
        
        grid.appendChild(dayEl);
    }

    // Visa historiklista
    workoutHistory.slice().reverse().forEach(w => {
        const div = document.createElement("div");
        div.className = "history-item";
        div.innerHTML = `
            <div>
                <small>${w.displayDate}</small><br>
                <strong>${w.programName}</strong>
            </div>
            <span style="color:#10b981; font-weight:800;">✓</span>
        `;
        historyList.appendChild(div);
    });
    showView("calendar-view");
}

function renderStats() {
    const container = document.getElementById("stats-content");
    let totalReps = 0;
    workoutHistory.forEach(w => {
        w.exercises.forEach(e => totalReps += (parseInt(e.reps) * parseInt(e.sets)));
    });
    container.innerHTML = `
        <div style="font-size:14px; color:#64748b;">Totalt lyfta reps</div>
        <div style="font-size:42px; font-weight:900; color:#3b82f6;">${totalReps}</div>
        <hr style="margin:20px 0; border:0; border-top:1px solid #eee;">
        <p>Antal pass slutförda: <strong>${workoutHistory.length}</strong></p>
    `;
    showView("stats-view");
}

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

document.getElementById("global-home").onclick = () => renderHome();
document.getElementById("calendar-mode").onclick = () => renderCalendar();
document.getElementById("stats-mode").onclick = () => renderStats();
