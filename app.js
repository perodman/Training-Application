let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

// Timer-variabler
let timerInterval = null;
let secondsElapsed = activeDraft ? (activeDraft.secondsElapsed || 0) : 0;
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
    document.querySelectorAll(".view").forEach(v => {
        v.classList.add("hidden");
        v.style.animation = 'none';
    });
    const target = document.getElementById(id);
    if(target) {
        target.classList.remove("hidden");
        // Trigger reflow för att starta om animationen
        void target.offsetWidth;
        target.style.animation = 'fadeIn 0.4s ease-out forwards';
    }
    window.scrollTo(0, 0);
}

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
}

function openModal() {
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- TIMER ---
function updateTimerDisplay() {
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    const display = document.getElementById("workout-timer");
    if(display) display.textContent = `${hrs}:${mins}:${secs}`;
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

// --- DEN NYA SMARTA ÖVNINGSVÄLJAREN ---
function openExercisePicker(onSelectCallback) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `<h3>Välj Kategori</h3><div class="category-grid" id="picker-cats"></div>`;
    
    const cats = ["Ben", "Bröst", "Rygg", "Axlar", "Armar", "Bål"];
    const container = document.getElementById("picker-cats");
    
    cats.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "cat-btn glass";
        btn.innerHTML = `<span>${cat}</span>`;
        btn.onclick = () => {
            body.innerHTML = `<h3>Välj ${cat}</h3><div id="picker-list"></div>`;
            const list = document.getElementById("picker-list");
            const filtered = masterExercises.filter(ex => 
                cat === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === cat
            );
            
            if(filtered.length === 0) {
                list.innerHTML = `<p>Inga övningar hittades.</p>`;
            }
            
            filtered.forEach(ex => {
                const exBtn = document.createElement("button");
                exBtn.className = "mode-btn glass-border";
                exBtn.style.marginBottom = "8px";
                exBtn.textContent = ex.name;
                exBtn.onclick = () => { onSelectCallback(ex); closeModal(); };
                list.appendChild(exBtn);
            });
            
            const backBtn = document.createElement("button");
            backBtn.className = "mode-btn";
            backBtn.style.color = var(--text-light);
            backBtn.textContent = "← Tillbaka till kategorier";
            backBtn.onclick = () => openExercisePicker(onSelectCallback);
            list.appendChild(backBtn);
        };
        container.appendChild(btn);
    });
    openModal();
}

// --- KALENDER & DAGBOK ---
function renderCalendar() {
    const container = document.getElementById("calendar-view");
    container.innerHTML = `<h2 class="section-title" style="margin-top:20px;">Dagbok & Planering</h2>`;

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    const monthText = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' });
    const formattedMonth = monthText.charAt(0).toUpperCase() + monthText.slice(1);

    const header = document.createElement("div");
    header.className = "calendar-header";
    header.innerHTML = `
        <button class="nav-arrow" onclick="changeMonth(-1)"> ❮ </button>
        <div id="month-label">${formattedMonth}</div>
        <button class="nav-arrow" onclick="changeMonth(1)"> ❯ </button>
    `;
    container.appendChild(header);

    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "calendar-weekdays";
    ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].forEach(day => {
        weekdaysRow.innerHTML += `<div>${day}</div>`;
    });
    container.appendChild(weekdaysRow);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    container.appendChild(grid);

    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div class="calendar-cell empty"></div>`;
    
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
        if (override && override !== "none") {
            displayPass = programData.routine.find(p => p.id === override);
        } else if (isAutoDay && override !== "none") {
            displayPass = programData.routine[d % programData.routine.length];
        }
        
        let info = "";
        if (hasWorkouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = "⏱️"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
        cell.innerHTML = `<span>${d}</span><span class="cell-info">${info}</span>`;
        cell.onclick = () => openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    let html = `<h3>${dateStr}</h3>`;
    
    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${w.programName}</strong>
                    <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger);"> ✖ </button>
                </div>`;
            w.exercises.forEach(ex => {
                html += `<div style="font-size:11px; margin-top:5px; color:var(--text-light)">${ex.name}: ${ex.weight}kg x ${ex.reps}</div>`;
            });
            html += `</div>`;
        });
    } else {
        html += `<p>Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta ${planned.name} 🔥</button>`;
        html += `<button class="mode-btn glass-border" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')">Starta Fritt Pass ➕</button>`;
        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light);">Ändra planering:</p>`;
        html += `<select class="log-input" onchange="setOverride('${dateStr}', this.value)">
            <option value="">Byt pass...</option>
            ${programData.routine.map(p => `<option value="${p.id}">${p.name}</option>`).join("")}
            <option value="none">Vila</option>
        </select>`;
    }
    body.innerHTML = html;
    openModal();
}

// --- TRÄNINGSPROGRAM VYN ---
function renderProgramView() {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    const icons = ['⚡','🔥','🏆','💎'];
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = "prog-card";
        div.innerHTML = `<div style="font-size:24px;">${icons[i % icons.length]}</div><h4>${pass.name}</h4><small>${pass.exercises.length} övningar</small>`;
        div.onclick = () => showProgramDetails(i);
        selector.appendChild(div);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    const area = document.getElementById("program-details-area");
    area.classList.remove("hidden");
    const list = document.getElementById("program-exercise-list");
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <h3>${pass.name}</h3>
            <button class="mode-btn blue" style="width:auto; padding:5px 15px;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `<div class="card glass" style="margin-bottom:8px;">${e.name}</div>`).join("")}
    `;
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `<div class="card glass" style="display:flex; justify-content:space-between; margin-bottom:5px;"><span>${ex.name}</span><button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none;">✖</button></div>`).join("")}
        </div>
        <button class="mode-btn glass-border" onclick="openExercisePicker((ex) => addExToPass(${idx}, ex))">+ Lägg till övning</button>
        <button class="mode-btn blue" onclick="saveProgramEdit(${idx})">Spara program</button>
    `;
    openModal();
}

// --- AKTIVT PASS LOGIK (SPARA UTKAST / AVSLUTA) ---
function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        list.innerHTML = `
            <div style="text-align:center; padding:40px 0;">
                <p style="color:var(--text-light); margin-bottom:20px;">Redo att köra ${activeDraft.workout.name}?</p>
                <button class="mode-btn green" style="padding:30px; font-size:1.2rem;" onclick="actuallyStartWorkout()">STARTA NU 🔥</button>
            </div>`;
        showView("workout-view");
        return;
    }

    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:12px;"><strong>${ex.name}</strong></div>
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                <div><label style="font-size:9px; color:var(--text-light); display:block; text-align:center;">KG</label><input type="number" id="w-${i}" class="log-input" value="${val.weight}" onchange="updateDraftData(${i})"></div>
                <div><label style="font-size:9px; color:var(--text-light); display:block; text-align:center;">REPS</label><input type="number" id="r-${i}" class="log-input" value="${val.reps}" onchange="updateDraftData(${i})"></div>
                <div><label style="font-size:9px; color:var(--text-light); display:block; text-align:center;">SET</label><input type="number" id="s-${i}" class="log-input" value="${val.sets}" onchange="updateDraftData(${i})"></div>
            </div>`;
        list.appendChild(div);
    });

    // Kontroller för passet
    const controls = document.createElement("div");
    controls.style.cssText = "margin-top:20px; display:grid; gap:10px;";
    controls.innerHTML = `
        <button class="mode-btn glass-border" onclick="openExercisePicker(addExerciseToOngoing)">+ Lägg till övning</button>
        <button class="mode-btn orange" onclick="saveDraftAndExit()">Spara utkast & Stäng</button>
        <button class="mode-btn green" id="finish-workout-btn">AVSLUTA & LOGGA PASS 🏆</button>
    `;
    list.appendChild(controls);

    document.getElementById("finish-workout-btn").onclick = finishWorkout;

    showView("workout-view");
    startTimer();
}

function addExerciseToOngoing(ex) {
    activeDraft.workout.exercises.push({ name: ex.name, target: ex.target });
    activeDraft.data.push({ weight: "", reps: "", sets: 3 });
    saveAll();
    renderActiveWorkout();
}

function saveDraftAndExit() {
    pauseTimer();
    saveAll();
    renderHome();
}

function finishWorkout() {
    const finalTime = document.getElementById("workout-timer").textContent;
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: finalTime,
        exercises: activeDraft.workout.exercises.map((ex, i) => ({
            name: ex.name,
            weight: document.getElementById(`w-${i}`).value || "0",
            reps: document.getElementById(`r-${i}`).value || "0",
            sets: document.getElementById(`s-${i}`).value || "0"
        }))
    };
    workoutHistory.push(log);
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    secondsElapsed = 0;
    pauseTimer();
    saveAll();
    renderCalendar();
}

// --- NAVIGATION & ÖVRIGT ---
document.getElementById("global-home").onclick = () => { pauseTimer(); renderHome(); };
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("stats-mode").onclick = renderStats;

function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => renderActiveWorkout();
    } else {
        document.getElementById("draft-alert").classList.add("hidden");
    }
}

function actuallyStartWorkout() { 
    activeDraft.isStarted = true; 
    saveAll(); 
    renderActiveWorkout(); 
}

function updateDraftData(idx) {
    activeDraft.data[idx] = {
        weight: document.getElementById(`w-${idx}`).value,
        reps: document.getElementById(`r-${idx}`).value,
        sets: document.getElementById(`s-${idx}`).value
    };
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function filterExercises(category) {
    currentExerciseCategory = category;
    document.querySelectorAll(".cat-btn").forEach(b => b.classList.toggle("active", b.dataset.cat === category));
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    filtered.forEach(ex => {
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.cssText = "padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
        div.innerHTML = `<div><strong>${ex.name}</strong><br><small style="color:var(--primary); font-size:10px;">${ex.target}</small></div>
                         <button class="circle-ctrl" style="position:static; width:35px; height:35px;" onclick="openEditExerciseModal(${ex.id})"> ⚙️ </button>`;
        results.appendChild(div);
    });
}

// Hjälpfunktioner
function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { if(!val) return; calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date, false); }
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    activeDraft = { workout: JSON.parse(JSON.stringify(workout)), data: data || workout.exercises.map(()=>({weight:"", reps:"", sets:3})), date: date || new Date().toISOString().split('T')[0], secondsElapsed: 0, isStarted: isImmediateStart };
    renderActiveWorkout();
}
function startFreeWorkoutOnDate(date) { startWorkout({id:"free", name:"Fritt Pass", exercises:[]}, null, date, true); }
function addExToPass(pIdx, ex) { programData.routine[pIdx].exercises.push({name:ex.name, target:ex.target}); openEditProgramModal(pIdx); }
function removeExFromPass(pIdx, eIdx) { programData.routine[pIdx].exercises.splice(eIdx, 1); openEditProgramModal(pIdx); }
function saveProgramEdit(idx) { programData.routine[idx].name = document.getElementById("edit-pass-name").value; saveAll(); closeModal(); renderProgramView(); }
function deleteLoggedWorkout(date, idx) { if(confirm("Radera passet?")) { workoutHistory = workoutHistory.filter((w, i) => !(w.date === date && i === idx)); saveAll(); closeModal(); renderCalendar(); } }
function renderStats() { showView("stats-view"); }
