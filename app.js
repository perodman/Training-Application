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
        item.className = "card";
        item.innerHTML = `
            <div class="exercise-header">
                <span class="target-label">${ex.target}</span>
                <span class="exercise-name">${ex.name}</span>
            </div>
            <div class="input-group">
                <div class="input-field">
                    <label>Kg</label>
                    <input type="number" id="w-${i}" class="log-input" placeholder="0">
                </div>
                <div class="input-field">
                    <label>Reps</label>
                    <input type="number" id="r-${i}" class="log-input" placeholder="0">
                </div>
                <div class="input-field">
                    <label>Set</label>
                    <input type="number" id="s-${i}" class="log-input" value="${ex.defaultSets}">
                </div>
            </div>
        `;
        list.appendChild(item);
    });
    document.getElementById("save-workout-btn").onclick = () => saveWorkout(workout);
    showView("workout-view");
}

function renderWeeklySchedule() {
    const list = document.getElementById("schedule-list");
    // Definiera ditt schema baserat på din text
    const schedule = [
      { day: "Måndag v.1", pass: "Pass A: Bas & Kraft" },
      { day: "Onsdag v.1", pass: "Pass B: Stretch & Vinklar" },
      { day: "Fredag v.1", pass: "Pass C: Unilateralt & Kontakt" },
      { day: "Måndag v.2", pass: "Pass D: Skulptering" }
    ];

    list.innerHTML = schedule.map(s => `
        <div class="schedule-item">
            <span class="day-name">${s.day}</span>
            <span class="workout-name">${s.pass}</span>
        </div>
    `).join("");

    // Rendera även historik under
    const histList = document.getElementById("history-list");
    histList.innerHTML = workoutHistory.slice().reverse().map(w => `
        <div class="card" style="padding:15px; display:flex; justify-content:space-between; align-items:center;">
            <div><small>${w.displayDate}</small><br><strong>${w.programName}</strong></div>
            <span style="color:var(--success)">✓</span>
        </div>
    `).join("");
    
    showView("calendar-view");
}

function saveWorkout(workout) {
    const log = {
        date: new Date().toISOString(),
        displayDate: new Date().toLocaleDateString('sv-SE'),
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

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}

document.getElementById("global-home").onclick = () => renderHome();
document.getElementById("calendar-mode").onclick = () => renderWeeklySchedule();
document.getElementById("stats-mode").onclick = () => {
    // Enkel statistik-vy
    const content = document.getElementById("stats-content");
    content.innerHTML = `<h3>Totalt antal pass: ${workoutHistory.length}</h3>`;
    showView("stats-view");
};
