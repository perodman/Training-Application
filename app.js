let programData;
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");

fetch("program.json")
    .then(r => r.json())
    .then(json => {
        programData = json;
        checkDraft();
        renderHome();
    });

function checkDraft() {
    const alert = document.getElementById("draft-alert");
    if (activeDraft) alert.classList.remove("hidden");
    else alert.classList.add("hidden");
}

function renderHome() {
    showView("home-view");
    checkDraft();
}

// 1. UTKAST-LOGIK (Spara utan att avsluta)
document.getElementById("pause-workout-btn").onclick = () => {
    const workout = activeDraft.workout;
    const currentData = {
        workout: workout,
        startTime: activeDraft.startTime || new Date().toISOString(),
        exercises: workout.exercises.map((ex, i) => ({
            weight: document.getElementById(`w-${i}`).value,
            reps: document.getElementById(`r-${i}`).value,
            sets: document.getElementById(`s-${i}`).value
        }))
    };
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(currentData));
    activeDraft = currentData;
    alert("Passet sparat som utkast!");
    renderHome();
};

document.getElementById("resume-workout-btn").onclick = () => {
    startWorkout(activeDraft.workout, activeDraft.exercises);
};

// 2. TRÄNINGSLÄGE MED FLIP-CARDS
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
                    <span class="target-label">${ex.target}</span><br>
                    <strong style="font-size:18px;">${ex.name}</strong>
                    <div class="input-group">
                        <input type="number" id="w-${i}" class="log-input" placeholder="Kg" value="${val.weight}">
                        <input type="number" id="r-${i}" class="log-input" placeholder="Reps" value="${val.reps}">
                        <input type="number" id="s-${i}" class="log-input" placeholder="Set" value="${val.sets}">
                    </div>
                    <div style="text-align:center; margin-top:10px; font-size:10px; color:#94a3b8;">Klicka för info 🔄</div>
                </div>
                <div class="card-back">
                    <strong>Beskrivning</strong>
                    <p style="font-size:13px; padding:10px;">Fokusera på kontakten i ${ex.target}. Kontrollerat tempo och fullt rörelseomfång.</p>
                    <small>Tryck för att återgå</small>
                </div>
            </div>
        `;
        
        // Flip-logik: Flippa bara om man inte trycker på inputs
        container.onclick = (e) => {
            if (e.target.tagName !== 'INPUT') container.classList.toggle("flipped");
        };
        list.appendChild(container);
    });
    
    showView("workout-view");
}

// 3. MÅNADSSCHEMA (Dynamisk kalender)
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    grid.innerHTML = "";
    
    const days = ["må", "ti", "on", "to", "fr", "lö", "sö"];
    days.forEach(d => grid.innerHTML += `<div class="calendar-day-label">${d}</div>`);

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Tomma celler innan den 1:a (Justera för måndag som start)
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    // Träningsdagar: Måndag, Onsdag, Fredag (v.1/v.2 logik)
    const plan = { 1: "A", 3: "B", 5: "C" }; // Enkel mappning för demo

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = new Date(now.getFullYear(), now.getMonth(), d).toDateString();
        const hasWorkedOut = workoutHistory.some(w => new Date(w.date).toDateString() === dateStr);
        const dayOfWeek = new Date(now.getFullYear(), now.getMonth(), d).getDay();
        
        const cell = document.createElement("div");
        cell.className = `calendar-cell ${d === now.getDate() ? 'today' : ''}`;
        cell.innerHTML = `<span>${d}</span>`;
        
        if (hasWorkedOut) cell.innerHTML += `<div class="workout-dot"></div>`;
        if (plan[dayOfWeek]) cell.innerHTML += `<div class="planned-label">PASS ${plan[dayOfWeek]}</div>`;
        
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

// 4. PROGRAMÖVERSIKT
function renderProgramOverview() {
    const list = document.getElementById("programs-list");
    list.innerHTML = programData.routine.map(p => `
        <div class="card">
            <h3 style="margin-top:0; color:var(--primary);">${p.name}</h3>
            <ul style="padding-left:20px; font-size:14px; color:var(--text-light);">
                ${p.exercises.map(e => `<li>${e.name} (${e.target})</li>`).join("")}
            </ul>
        </div>
    `).join("");
    showView("programs-view");
}

// 5. STATISTIK (Tidsperioder och Volym)
function renderStats() {
    const summary = document.getElementById("stats-summary");
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    
    const lastMonthWorkouts = workoutHistory.filter(w => new Date(w.date) > thirtyDaysAgo);
    
    summary.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; text-align:center;">
            <div><small>Pass (30 dgr)</small><br><b style="font-size:24px;">${lastMonthWorkouts.length}</b></div>
            <div><small>Totala pass</small><br><b style="font-size:24px;">${workoutHistory.length}</b></div>
        </div>
    `;
    showView("stats-view");
}

// NAVIGATION
function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}

document.getElementById("start-new-btn").onclick = () => startWorkout(programData.routine[0]);
document.getElementById("view-programs-btn").onclick = renderProgramOverview;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("stats-mode").onclick = renderStats;
document.getElementById("global-home").onclick = renderHome;

document.getElementById("save-workout-btn").onclick = () => {
    const workout = activeDraft.workout;
    const log = {
        date: new Date().toISOString(),
        programName: workout.name,
        exercises: workout.exercises.map((ex, i) => ({
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
    renderHome();
};
