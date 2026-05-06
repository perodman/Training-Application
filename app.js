let programData;
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let currentViewDate = new Date();

// Start
fetch("program.json")
    .then(r => r.json())
    .then(json => {
        programData = json;
        renderHome();
    });

// 1. HOME VIEW & SPÄRR
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

// 2. TRÄNINGSLÄGE
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
                        <div class="input-field"><label>KG</label><input type="number" id="w-${i}" class="log-input" value="${val.weight}"></div>
                        <div class="input-field"><label>REPS</label><input type="number" id="r-${i}" class="log-input" value="${val.reps}"></div>
                        <div class="input-field"><label>SET</label><input type="number" id="s-${i}" class="log-input" value="${val.sets}"></div>
                    </div>
                </div>
                <div class="card-back">
                    <strong style="font-size:14px;">TIPS & FORM</strong>
                    <p style="font-size:11px; margin:5px 0;">${ex.description || "Håll fokus på kontakten."}</p>
                    <img src="${ex.image || 'https://via.placeholder.com/300x150'}" class="exercise-image">
                </div>
            </div>
        `;
        container.onclick = (e) => { if (e.target.tagName !== 'INPUT') container.classList.toggle("flipped"); };
        list.appendChild(container);
    });
    showView("workout-view");
}

// 3. KALENDER & NAVIGERING
function changeMonth(offset) {
    currentViewDate.setMonth(currentViewDate.getMonth() + offset);
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });

    ["Må", "Ti", "On", "To", "Fr", "Lö", "Sö"].forEach(d => grid.innerHTML += `<div class="calendar-day-label">${d}</div>`);

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const dateStr = date.toDateString();
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.innerHTML = `<span>${d}</span>`;

        const hasCompleted = workoutHistory.some(w => new Date(w.date).toDateString() === dateStr);
        const isDraft = activeDraft && new Date(activeDraft.startTime).toDateString() === dateStr;
        
        // Planering (Mån=1, Ons=3, Fre=5)
        let pass = null;
        if ([1, 3, 5].includes(date.getDay())) {
            const index = Math.floor(date.getTime() / 86400000) % 4;
            pass = programData.routine[index];
            if (!hasCompleted && !isDraft) cell.classList.add("cell-planned");
        }

        if (hasCompleted) cell.classList.add("cell-completed");
        if (isDraft) cell.classList.add("cell-draft");

        cell.onclick = () => showDayInfo(date, pass);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function showDayInfo(date, pass) {
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>${date.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>`;
    
    if (pass) {
        body.innerHTML += `
            <div style="color:var(--primary); font-weight:800; font-size:12px; text-transform:uppercase;">Planerat:</div>
            <h2 style="margin:5px 0;">${pass.name}</h2>
            <hr style="border:0; border-top:1px solid #eee; margin:15px 0;">
            <ul style="text-align:left; padding-left:20px;">
                ${pass.exercises.map(e => `<li style="margin-bottom:8px;"><strong>${e.name}</strong><br><small>${e.target}</small></li>`).join("")}
            </ul>
        `;
    } else {
        body.innerHTML += `<p>Ingen planerad träning.</p>`;
    }
    modal.classList.remove("hidden");
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }

// ACTIONS
document.getElementById("start-new-btn").onclick = () => {
    const lastWorkout = workoutHistory[workoutHistory.length - 1];
    let nextIdx = 0;
    if (lastWorkout) {
        const lastIdx = programData.routine.findIndex(p => p.name === lastWorkout.programName);
        nextIdx = (lastIdx + 1) % programData.routine.length;
    }
    startWorkout(programData.routine[nextIdx]);
};

document.getElementById("pause-workout-btn").onclick = () => {
    activeDraft.exercises = activeDraft.workout.exercises.map((ex, i) => ({
        weight: document.getElementById(`w-${i}`).value,
        reps: document.getElementById(`r-${i}`).value,
        sets: document.getElementById(`s-${i}`).value
    }));
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderHome();
};

document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.exercises);

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
    renderHome();
};

document.getElementById("view-programs-btn").onclick = () => {
    const list = document.getElementById("programs-list");
    list.innerHTML = programData.routine.map(p => `
        <div class="card">
            <h3>${p.name}</h3>
            ${p.exercises.map(e => `<div style="font-size:13px; margin-bottom:5px;">• ${e.name}</div>`).join("")}
        </div>
    `).join("");
    showView("programs-view");
};

document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("stats-mode").onclick = () => {
    const content = document.getElementById("stats-content");
    content.innerHTML = `<h3>Totala pass: ${workoutHistory.length}</h3>`;
    showView("stats-view");
};

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}

document.getElementById("global-home").onclick = renderHome;
