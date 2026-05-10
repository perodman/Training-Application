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

// Knapp-kopplingar för Hemvyn
document.getElementById("global-home").onclick = () => {
    document.getElementById("calendar-info-box").style.display = "none";
    showView("home-view");
};
document.getElementById("start-new-btn").onclick = () => {
    document.getElementById("calendar-info-box").style.display = "block";
    renderCalendar();
};
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises("Ben"); };
document.getElementById("view-programs-btn").onclick = () => { renderProgramView(); };
document.getElementById("calendar-mode").onclick = () => { 
    document.getElementById("calendar-info-box").style.display = "none";
    renderCalendar(); 
};
document.getElementById("stats-mode").onclick = () => { renderStats(); };

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

function showView(id) {
    const target = document.getElementById(id);
    if(!target) return;
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    target.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
}
function openModal() {
    document.getElementById("workout-modal").classList.remove("hidden");
}

function startWorkout(program, data, date, isResume = false) {
    const activeTitle = document.getElementById("active-title");
    activeTitle.textContent = program.name;
    // ... (resten av startWorkout logiken behålls för att hantera timer och övningar)
    showView("workout-view");
    // Implementation av startWorkout utelämnad för plats men behålls från din originalkod
}

// --- KALENDER ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthText = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    label.textContent = monthText.charAt(0).toUpperCase() + monthText.slice(1);
    
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        
        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr && activeDraft.isStarted;
        const dayOfWeek = new Date(year, month, d).getDay();
        const isAutoDay = [1, 3, 5].includes(dayOfWeek);
        const override = calendarOverrides[dateStr];
        
        let displayPass = null;
        if (override === "free") {
            displayPass = { name: "Fritt Pass" };
        } else if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            displayPass = programData.routine[d % programData.routine.length];
        }
        
        let info = "";
        if (hasWorkouts.length > 0) {
            cell.classList.add("cell-completed");
            info = "✓";
        } else if (isOngoing) {
            cell.classList.add("cell-ongoing");
            info = " ⏱️ ";
        } else if (displayPass) {
            cell.classList.add("cell-planned");
            info = displayPass.name.split(" ").pop();
        }
        
        cell.innerHTML = `<span>${d}</span><span>${info}</span>`;
        cell.onclick = () => {
            document.getElementById("calendar-info-box").style.display = "none";
            openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
        };
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    const currentOverride = calendarOverrides[dateStr] || (planned ? (planned.id || "auto") : "none");

    function generateHtml() {
        let html = `<h3>${dateStr}</h3>`;
        if (completed.length > 0) {
            completed.forEach((w, idx) => {
                html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">
                    <strong>${w.programName}</strong>
                </div>`;
            });
        } else {
            html += `<p style="text-align:center; margin-bottom:15px;">Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
            
            // Knappar för att starta
            if (planned && planned.name !== "Fritt Pass") {
                html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name} 🔥 </button>`;
            }
            html += `<button class="mode-btn glass-border" style="border-color:var(--primary); color:var(--primary);" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')">Starta Fritt Pass ➕ </button>`;
            
            html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Ändra planering:</p>`;
            
            // Kompakt rutnät för val av pass
            html += `<div class="plan-grid">`;
            programData.routine.forEach(p => {
                const isSelected = currentOverride === p.id;
                html += `<button class="mode-btn glass-border plan-btn ${isSelected ? 'selected' : ''}" onclick="updateDayPlan('${dateStr}', '${p.id}')">${p.name}</button>`;
            });
            // Lägg till Fritt Pass i listan
            const isFreeSelected = calendarOverrides[dateStr] === "free";
            html += `<button class="mode-btn glass-border plan-btn ${isFreeSelected ? 'selected' : ''}" onclick="updateDayPlan('${dateStr}', 'free')">Fritt Pass</button>`;
            // Lägg till Vila
            const isVilaSelected = calendarOverrides[dateStr] === "none";
            html += `<button class="mode-btn glass-border plan-btn ${isVilaSelected ? 'selected' : ''}" style="color:var(--danger);" onclick="updateDayPlan('${dateStr}', 'none')">Vila</button>`;
            html += `</div>`;
        }
        return html;
    }

    body.innerHTML = generateHtml();
    window.updateDayPlan = (d, type) => {
        calendarOverrides[d] = type;
        saveAll();
        renderCalendar();
        // Uppdatera vyn i modalen utan att stänga den
        const newPlanned = type === "free" ? {name:"Fritt Pass"} : (type === "none" ? null : programData.routine.find(p => p.id === type));
        openDayManager(d, newPlanned, completed, isOngoing);
    };
    openModal();
}

function startFreeWorkoutOnDate(date) {
    const freePass = { id: "free-" + Date.now(), name: "Fritt Pass", exercises: [] };
    startWorkout(freePass, null, date, false);
}

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date, false); }
// (Övriga funktioner som renderHome, renderStats etc. behålls oförändrade från din senaste kod)
