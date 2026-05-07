let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

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
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById(id);
    if(target) target.classList.remove("hidden");
    window.scrollTo(0, 0);
}

function closeModal() { document.getElementById("workout-modal").classList.add("hidden"); }
function openModal() { document.getElementById("workout-modal").classList.remove("hidden"); }

// --- ÖVNINGAR ---
function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN</label>
        <input type="text" id="new-ex-name" class="log-input" placeholder="T.ex. Knäböj">
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">KATEGORI</label>
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option><option value="Bröst">Bröst</option><option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option><option value="Biceps">Biceps</option><option value="Triceps">Triceps</option><option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara Övning</button>
    `;
    openModal();
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-cat").value;
    if(!name) return;
    masterExercises.push({ id: Date.now(), name, target, defaultSets: 3 });
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function openEditExerciseModal(id) {
    const ex = masterExercises.find(e => e.id == id);
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
        <select id="edit-ex-cat" class="log-input">
            <option value="Ben" ${ex.target==='Ben'?'selected':''}>Ben</option>
            <option value="Bröst" ${ex.target==='Bröst'?'selected':''}>Bröst</option>
            <option value="Rygg" ${ex.target==='Rygg'?'selected':''}>Rygg</option>
            <option value="Axlar" ${ex.target==='Axlar'?'selected':''}>Axlar</option>
            <option value="Biceps" ${ex.target==='Biceps'?'selected':''}>Biceps</option>
            <option value="Triceps" ${ex.target==='Triceps'?'selected':''}>Triceps</option>
            <option value="Bål" ${ex.target==='Bål'?'selected':''}>Bål</option>
        </select>
        <button class="mode-btn blue" onclick="updateExercise(${id})">Uppdatera</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteMasterExercise(${id})">Radera permanent</button>
    `;
    openModal();
}

function updateExercise(id) {
    const ex = masterExercises.find(e => e.id == id);
    ex.name = document.getElementById("edit-ex-name").value;
    ex.target = document.getElementById("edit-ex-cat").value;
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function deleteMasterExercise(id) {
    if(confirm("Radera övningen?")) {
        masterExercises = masterExercises.filter(e => e.id != id);
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
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
        div.innerHTML = `<div><strong>${ex.name}</strong><br><small style="color:var(--primary); font-weight:800; font-size:10px;">${ex.target}</small></div>
        <button style="background:none; border:none; font-size:18px;" onclick="openEditExerciseModal(${ex.id})">⚙️</button>`;
        results.appendChild(div);
    });
}

// --- KALENDER ---
function renderCalendar() {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    grid.innerHTML = "";
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    label.textContent = currentViewDate.toLocaleString('sv-SE', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());
    
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) grid.innerHTML += `<div></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        const hasWorkouts = workoutHistory.filter(w => w.date === dateStr);
        const isOngoing = activeDraft && activeDraft.date === dateStr;
        const dayOfWeek = new Date(year, month, d).getDay();
        const override = calendarOverrides[dateStr];
        let displayPass = null;
        if (override && override !== "none") displayPass = programData.routine.find(p => p.id === override);
        else if ([1, 3, 5].includes(dayOfWeek) && override !== "none") displayPass = programData.routine[d % programData.routine.length];
        
        let info = "";
        if (hasWorkouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = "⏱️"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
        cell.innerHTML = `<span>${d}</span><span style="font-size:10px; font-weight:900;">${info}</span>`;
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
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${w.programName}</strong>
                    <div>
                        <button onclick="editLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--primary); font-size:16px;">✏️</button>
                        <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); font-size:16px;">✖</button>
                    </div>
                </div>
                <div style="margin-top:10px;">${w.exercises.map(ex=>`<div style="font-size:12px;">${ex.name}: ${ex.weight}kg x ${ex.reps}</div>`).join("")}</div>
            </div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pass</button>`;
        html += `<button class="mode-btn" style="color:var(--danger); background:none;" onclick="cancelOngoing()">Radera pågående pass ✖</button>`;
    } else {
        html += `<p style="text-align:center;">Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) html += `<button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')">Starta passet 🔥</button>`;
        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; text-align:center;">Ändra planering:</p>`;
        programData.routine.forEach(p => {
            html += `<div style="display:flex; gap:5px; margin-bottom:5px;">
                <button class="mode-btn glass-border" style="font-size:14px; margin:0; flex-grow:1;" onclick="setOverride('${dateStr}', '${p.id}')">${p.name}</button>
                <button onclick="previewPass('${p.id}')" style="background:var(--card); border:1px solid var(--glass-border); border-radius:12px; width:45px; color:var(--primary);">ℹ️</button>
            </div>`;
        });
        html += `<button class="mode-btn" style="color:var(--danger); background:none;" onclick="setOverride('${dateStr}', 'none')">Vila denna dag</button>`;
    }
    body.innerHTML = html;
    openModal();
}

function previewPass(id) {
    const p = programData.routine.find(x => x.id === id);
    alert(`Innehåll i ${p.name}:\n\n` + p.exercises.map(e => `- ${e.name}`).join("\n"));
}

function cancelOngoing() {
    if(confirm("Vill du radera det pågående passet? Det kommer då bli 'Planerat' igen.")) {
        localStorage.removeItem("activeWorkoutDraft");
        activeDraft = null;
        closeModal();
        renderCalendar();
    }
}

// --- PROGRAM-HANTERING ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `<div style="font-size:24px;">⚡</div><h4>${pass.name}</h4><div style="font-size:10px; color:var(--primary); font-weight:800;">${pass.exercises.length} ÖVNINGAR</div>`;
        div.onclick = () => { renderProgramView(i); showProgramDetails(i); };
        selector.appendChild(div);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    document.getElementById("program-details-area").classList.remove("hidden");
    const list = document.getElementById("program-exercise-list");
    list.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 style="margin:0;">${pass.name}</h3>
        <button class="mode-btn blue" style="width:auto; padding:8px 15px;" onclick="openEditProgramModal(${idx})">Redigera</button>
    </div>
    ${pass.exercises.map(e => `<div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.05);">${e.name}</div>`).join("")}`;
}

function openCreatePassModal() {
    const name = prompt("Namn på nytt pass:");
    if(!name) return;
    const newPass = { id: "p" + Date.now(), name: name, exercises: [] };
    programData.routine.push(newPass);
    saveAll(); renderProgramView();
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `<div class="edit-item-row">
                <button class="reorder-btn" onclick="moveExercise(${idx}, ${i}, -1)">▲</button>
                <span style="flex-grow:1; margin-left:10px;">${ex.name}</span>
                <button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none;">✖</button>
            </div>`).join("")}
        </div>
        <div class="separator"></div>
        <label style="font-size:12px;">LÄGG TILL ÖVNING</label>
        <select id="add-ex-select" class="log-input">
            <option value="">Välj övning...</option>
            ${masterExercises.map(m=>`<option value="${m.id}">${m.name}</option>`).join("")}
        </select>
        <button class="mode-btn blue" onclick="addExerciseToPass(${idx})">Spara & Stäng</button>
        <button class="mode-btn" style="color:var(--danger); background:none;" onclick="deleteProgram(${idx})">Radera hela passet</button>
    `;
    openModal();
}

function addExerciseToPass(idx) {
    const select = document.getElementById("add-ex-select");
    const exId = select.value;
    if(exId) {
        const ex = masterExercises.find(e => e.id == exId);
        programData.routine[idx].exercises.push({...ex});
    }
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll(); closeModal(); renderProgramView(idx); showProgramDetails(idx);
}

function deleteProgram(idx) {
    if(confirm("Radera passet helt?")) {
        programData.routine.splice(idx, 1);
        saveAll(); closeModal(); renderProgramView();
    }
}

function moveExercise(pIdx, eIdx, dir) {
    const exercises = programData.routine[pIdx].exercises;
    const newIdx = eIdx + dir;
    if(newIdx >= 0 && newIdx < exercises.length) {
        [exercises[eIdx], exercises[newIdx]] = [exercises[newIdx], exercises[eIdx]];
        openEditProgramModal(pIdx);
    }
}

function removeExFromPass(pIdx, eIdx) {
    programData.routine[pIdx].exercises.splice(eIdx, 1);
    openEditProgramModal(pIdx);
}

// --- AKTIVT PASS ---
function startWorkout(workout, data = null, date = null) {
    activeDraft = { workout, data: data || workout.exercises.map(()=>({weight:"", reps:"", sets:3})), date: date || new Date().toISOString().split('T')[0] };
    renderActiveWorkout();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";
    activeDraft.workout.exercises.forEach((ex, i) => {
        const val = activeDraft.data[i];
        const div = document.createElement("div");
        div.className = "card glass";
        div.innerHTML = `<strong>${ex.name}</strong>
        <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-top:10px;">
            <input type="number" id="w-${i}" class="log-input" placeholder="KG" value="${val.weight}" onchange="updateDraftData(${i})">
            <input type="number" id="r-${i}" class="log-input" placeholder="Reps" value="${val.reps}" onchange="updateDraftData(${i})">
            <input type="number" id="s-${i}" class="log-input" placeholder="Set" value="${val.sets}" onchange="updateDraftData(${i})">
        </div>`;
        list.appendChild(div);
    });
    showView("workout-view");
}

function updateDraftData(idx) {
    activeDraft.data[idx] = { weight: document.getElementById(`w-${idx}`).value, reps: document.getElementById(`r-${idx}`).value, sets: document.getElementById(`s-${idx}`).value };
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

// --- STANDARD ---
document.getElementById("global-home").onclick = () => location.reload();
document.getElementById("start-new-btn").onclick = renderCalendar;
document.getElementById("calendar-mode").onclick = renderCalendar;
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("stats-mode").onclick = renderStats;
document.getElementById("save-workout-btn").onclick = () => {
    const log = { date: activeDraft.date, programName: activeDraft.workout.name, exercises: activeDraft.workout.exercises.map((ex, i) => ({
        name: ex.name, weight: document.getElementById(`w-${i}`).value || "0", reps: document.getElementById(`r-${i}`).value || "0", sets: document.getElementById(`s-${i}`).value || "0"
    }))};
    workoutHistory.push(log);
    saveAll(); localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    renderCalendar();
};
document.getElementById("pause-workout-btn").onclick = () => location.reload();

function renderHome() {
    showView("home-view");
    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    }
}

function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const months = {};
    workoutHistory.forEach(w => { const m = w.date.substring(0, 7); months[m] = (months[m] || 0) + 1; });
    Object.entries(months).sort().forEach(([m, val]) => {
        const bar = document.createElement("div");
        bar.className = "chart-bar"; bar.style.height = (val * 20) + "px";
        container.appendChild(bar);
    });
    showView("stats-view");
}

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }
function prepareStart(date, id) { const p = programData.routine.find(x => x.id === id); closeModal(); startWorkout(p, null, date); }
function deleteLoggedWorkout(date, idx) {
    if(confirm("Radera passet?")) {
        const filtered = workoutHistory.filter(w => w.date === date);
        const item = filtered[idx];
        workoutHistory = workoutHistory.filter(w => w !== item);
        saveAll(); closeModal(); renderCalendar();
    }
}
function editLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    const workoutObj = { name: item.programName, exercises: item.exercises.map(ex => ({ name: ex.name })) };
    const dataObj = item.exercises.map(ex => ({ weight: ex.weight, reps: ex.reps, sets: ex.sets }));
    workoutHistory = workoutHistory.filter(w => w !== item);
