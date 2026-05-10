let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

// --- INIT ---
fetch("program.json")
.then(r => r.json())
.then(json => {
    const saved = JSON.parse(localStorage.getItem("myCustomProgram"));
    programData = saved || json;
    
    if (masterExercises.length === 0) {
        programData.routine.forEach(p => {
            p.exercises.forEach(ex => {
                if (!masterExercises.find(m => m.name === ex.name)) {
                    masterExercises.push({ ...ex, id: Date.now() + Math.random() });
                }
            });
        });
        saveAll();
    }
    renderHome();
});

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

// Navigation
document.getElementById("global-home").onclick = () => {
    document.getElementById("calendar-info-box").style.display = "none";
    showView("home-view");
};
document.getElementById("start-new-btn").onclick = () => {
    document.getElementById("calendar-info-box").style.display = "block";
    renderCalendar();
};
document.getElementById("view-exercises-btn").onclick = () => { 
    showView("exercises-view"); 
    filterExercises("Ben"); 
};
document.getElementById("view-programs-btn").onclick = () => { 
    renderProgramView(); 
};
document.getElementById("calendar-mode").onclick = () => {
    document.getElementById("calendar-info-box").style.display = "none";
    renderCalendar();
};

function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0,0);
}

// --- ÖVNINGS-VY ---
function filterExercises(cat) {
    currentExerciseCategory = cat;
    document.querySelectorAll(".cat-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-cat") === cat);
    });
    
    const container = document.getElementById("exercise-results");
    container.innerHTML = "";
    
    const filtered = masterExercises.filter(ex => ex.category === cat);
    
    if (filtered.length === 0) {
        container.innerHTML = "<p style='text-align:center; color:var(--text-light);'>Inga övningar hittades.</p>";
        return;
    }

    filtered.forEach(ex => {
        const div = document.createElement("div");
        div.className = "ex-card glass";
        div.innerHTML = `<span>${ex.name}</span> <button class="reorder-btn" onclick="deleteExercise('${ex.id}')">🗑️</button>`;
        container.appendChild(div);
    });
}

function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Ny övning</h3>
        <input type="text" id="new-ex-name" class="log-input" placeholder="Övningens namn">
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Armar">Armar</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara</button>
    `;
    openModal();
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value;
    const category = document.getElementById("new-ex-cat").value;
    if (!name) return;
    masterExercises.push({ id: Date.now().toString(), name, category });
    saveAll();
    closeModal();
    filterExercises(category);
}

// --- PROGRAM-VY ---
function renderProgramView() {
    showView("programs-view");
    const list = document.getElementById("pass-selector-list");
    list.innerHTML = "";
    
    programData.routine.forEach(p => {
        const card = document.createElement("div");
        card.className = "prog-card";
        card.innerHTML = `<h4>${p.name}</h4><p style="font-size:10px;">${p.exercises.length} övningar</p>`;
        card.onclick = () => showProgramDetails(p);
        list.appendChild(card);
    });
}

function showProgramDetails(p) {
    const area = document.getElementById("program-details-area");
    const list = document.getElementById("program-exercise-list");
    area.classList.remove("hidden");
    list.innerHTML = `<h3 style="margin-top:0;">${p.name}</h3>`;
    
    p.exercises.forEach(ex => {
        list.innerHTML += `<div style="padding:10px; border-bottom:1px solid var(--glass-border);">${ex.name}</div>`;
    });
}

// --- KALENDER (Behåller nya funktioner) ---
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
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement("div");
        cell.className = "calendar-cell";

        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const override = calendarOverrides[dateStr];
        let displayPass = null;

        if (override === "free") displayPass = { name: "Fritt Pass" };
        else if (override && override !== "none") displayPass = programData.routine.find(p => p.id === override);
        
        let info = "";
        if (hasWorkouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }

        cell.innerHTML = `<span>${d}</span><span>${info}</span>`;
        cell.onclick = () => {
            document.getElementById("calendar-info-box").style.display = "none";
            openDayManager(dateStr, displayPass, hasWorkouts);
        };
        grid.appendChild(cell);
    }
}

function openDayManager(dateStr, planned, completed) {
    const body = document.getElementById("modal-body");
    const currentOverride = calendarOverrides[dateStr] || "none";

    function updateContent() {
        let html = `<h3>${dateStr}</h3>`;
        if (completed.length > 0) {
            completed.forEach(w => html += `<div class="card glass">${w.programName} ✓</div>`);
        } else {
            html += `<p style="text-align:center;">Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
            if (planned && planned.name !== "Fritt Pass") {
                html += `<button class="mode-btn blue" onclick="closeModal(); startWorkoutById('${planned.id}', '${dateStr}')">Starta pass</button>`;
            }
            html += `<button class="mode-btn glass-border" onclick="closeModal(); startFreeWorkout('${dateStr}')">Starta Fritt Pass</button>`;
            html += `<div class="separator"></div><p style="font-size:11px; text-align:center;">ÄNDRA PLANERING</p><div class="plan-grid">`;
            
            programData.routine.forEach(p => {
                html += `<button class="mode-btn glass-border plan-btn ${currentOverride === p.id ? 'selected' : ''}" onclick="setPlan('${dateStr}', '${p.id}')">${p.name}</button>`;
            });
            html += `<button class="mode-btn glass-border plan-btn ${currentOverride === 'free' ? 'selected' : ''}" onclick="setPlan('${dateStr}', 'free')">Fritt Pass</button>`;
            html += `<button class="mode-btn glass-border plan-btn ${currentOverride === 'none' ? 'selected' : ''}" onclick="setPlan('${dateStr}', 'none')">Vila</button>`;
            html += `</div>`;
        }
        body.innerHTML = html;
    }

    window.setPlan = (d, id) => {
        calendarOverrides[d] = id;
        saveAll();
        renderCalendar();
        const newPlanned = id === "free" ? {name:"Fritt Pass"} : (id === "none" ? null : programData.routine.find(p => p.id === id));
        openDayManager(d, newPlanned, completed);
    };

    updateContent();
    openModal();
}

function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }
function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function renderHome() { showView("home-view"); }
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }

// Hjälpfunktioner för att starta pass
function startWorkoutById(id, date) {
    const p = programData.routine.find(x => x.id === id);
    // Anropa din befintliga startWorkout-logik här
}
function startFreeWorkout(date) {
    // Anropa din befintliga startWorkout-logik med tomt pass
}
