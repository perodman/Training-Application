let programData;
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let currentViewDate = new Date();

fetch("program.json").then(r => r.json()).then(json => {
    programData = json;
    renderHome();
});

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

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

// 1. STARTA & FORTSÄTT TRÄNING
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
                    <p style="font-size:11px; margin:5px 0;">${ex.description || "Håll fokus på kontakten."}</p>
                    <img src="${imgPath}" class="exercise-image">
                </div>
            </div>
        `;
        container.onclick = (e) => { if (e.target.tagName !== 'INPUT') container.classList.toggle("flipped"); };
        list.appendChild(container);
    });
    showView("workout-view");
}

// 2. STATISTIK
function renderStats() {
    const content = document.getElementById("stats-content");
    content.innerHTML = "";
    if (workoutHistory.length === 0) {
        content.innerHTML = "<p style='text-align:center'>Inga pass sparade än.</p>";
    } else {
        const statsCard = document.createElement("div");
        statsCard.className = "card";
        statsCard.innerHTML = `
            <h3>Summering</h3>
            <p>Totalt antal pass: <strong>${workoutHistory.length}</strong></p>
            <hr>
            <h4>Senaste passen:</h4>
            ${workoutHistory.slice(-5).reverse().map(w => `
                <div style="font-size:13px; margin-bottom:8px;">
                    <strong>${w.programName}</strong> - ${new Date(w.date).toLocaleDateString('sv-SE')}
                </div>
            `).join("")}
        `;
        content.appendChild(statsCard);
    }
    showView("stats-view");
}

// 3. KALENDER (Grön för färdigt, Blå för kommande)
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

        // Planerade dagar (mån, ons, fre)
        if ([1, 3, 5].includes(date.getDay())) {
            const dayCounter = Math.floor(date.getTime() / 86400000);
            const passIdx = dayCounter % 4;
            cell.classList.add("cell-planned");
            cell.onclick = () => showDayInfo(date, programData.routine[passIdx]);
        }

        // Färdiga dagar
        const hasCompleted = workoutHistory.some(w => new Date(w.date).toDateString() === date.toDateString());
        if (hasCompleted) {
            cell.classList.remove("cell-planned");
            cell.classList.add("cell-completed");
        }

        grid.appendChild(cell);
    }
    showView("calendar-view");
}

// 4. ÖVNINGS-VY (Kategoriserad)
function filterExercises(category) {
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    
    // Samla alla unika övningar från alla pass
    let allEx = [];
    programData.routine.forEach(p => {
        p.exercises.forEach(ex => {
            if (!allEx.find(a => a.name === ex.name)) allEx.push(ex);
        });
    });

    // Gruppera Armar (Biceps + Triceps)
    const filtered = allEx.filter(ex => {
        if (category === "Armar") return ex.target === "Biceps" || ex.target === "Triceps";
        return ex.target === category;
    });

    filtered.forEach(ex => {
        results.innerHTML += `
            <div class="card" style="margin-bottom:10px; padding:15px;">
                <strong>${ex.name}</strong>
                <div style="font-size:12px; color:var(--text-light)">${ex.description}</div>
            </div>
        `;
    });
}

// 5. PROGRAMÖVERSIKT (Renodlad)
function showProgramPass(idx) {
    const pass = programData.routine[idx];
    const list = document.getElementById("program-exercise-list");
    list.classList.remove("hidden");
    list.innerHTML = `<h3>${pass.name}</h3><hr>`;
    pass.exercises.forEach(e => {
        list.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid #eee;"><strong>${e.name}</strong> <span style="font-size:11px; color:#666;">(${e.target})</span></div>`;
    });
}

// NAVIGATION & MODAL
function showDayInfo(date, pass) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>${date.toLocaleDateString('sv-SE')}</h3><h2>${pass.name}</h2><hr>`;
    pass.exercises.forEach(e => body.innerHTML += `<div style="padding:4px 0">• ${e.name}</div>`);
    document.getElementById("workout-modal").classList.remove("hidden");
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function changeMonth(offset) { currentViewDate.setMonth(currentViewDate.getMonth() + offset); renderCalendar(); }

// EVENT LISTENERS
document.getElementById("global-home").onclick = renderHome;
document.getElementById("start-new-btn").onclick = () => {
    const lastWorkout = workoutHistory[workoutHistory.length - 1];
    let nextIdx = 0;
    if (lastWorkout) {
        const lastIdx = programData.routine.findIndex(p => p.name === lastWorkout.programName);
        nextIdx = (lastIdx + 1) % programData.routine.length;
    }
    startWorkout(programData.routine[nextIdx]);
};
document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.exercises);
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); document.getElementById("exercise-results").innerHTML = ""; };
document.getElementById("view-programs-btn").onclick = () => { showView("programs-view"); document.getElementById("program-exercise-list").classList.add("hidden"); };
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("stats-mode").onclick = renderStats;

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
