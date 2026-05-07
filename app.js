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

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
}

function openModal() {
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- ÖVNINGAR & INSTÄLLNINGAR ---
function openCreateExerciseModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <label class="input-label">NAMN</label>
        <input type="text" id="new-ex-name" class="log-input" placeholder="T.ex. Knäböj">
        <label class="input-label">KATEGORI</label>
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" onclick="saveNewExercise()">Spara Övning</button>
    `;
    openModal();
}

function saveNewExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const target = document.getElementById("new-ex-cat").value;
    if(!name) return alert("Ange ett namn!");
    masterExercises.push({ id: Date.now(), name, target, defaultSets: 3 });
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function openEditExerciseModal(id) {
    const ex = masterExercises.find(e => e.id == id);
    if(!ex) return;
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <div style="text-align:left;">
            <label class="input-label">NAMN PÅ ÖVNING</label>
            <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
            <label class="input-label">KATEGORI</label>
            <select id="edit-ex-cat" class="log-input">
                <option value="Ben" ${ex.target==='Ben'?'selected':''}>Ben</option>
                <option value="Bröst" ${ex.target==='Bröst'?'selected':''}>Bröst</option>
                <option value="Rygg" ${ex.target==='Rygg'?'selected':''}>Rygg</option>
                <option value="Axlar" ${ex.target==='Axlar'?'selected':''}>Axlar</option>
                <option value="Biceps" ${ex.target==='Biceps'?'selected':''}>Biceps</option>
                <option value="Triceps" ${ex.target==='Triceps'?'selected':''}>Triceps</option>
                <option value="Bål" ${ex.target==='Bål'?'selected':''}>Bål</option>
            </select>
        </div>
        <button class="mode-btn blue" style="margin-top:20px;" onclick="updateExercise(${id})">Uppdatera</button>
        <button class="mode-btn" style="color:var(--danger); background:none; font-size:14px;" onclick="deleteMasterExercise(${id})">Radera övning permanent</button>
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
    if(confirm("Vill du radera denna övning permanent?")) {
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
        div.innerHTML = `<div><strong style="font-size:16px;">${ex.name}</strong><br><small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:10px;">${ex.target}</small></div>
        <button style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="openEditExerciseModal(${ex.id})">   ⚙️   </button>`;
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
        const isOngoing = activeDraft && activeDraft.date === dateStr;
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
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${w.programName}</strong>
                    <div>
                        <button onclick="editLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:16px; margin-right:10px;">  ✏️  </button>
                        <button onclick="deleteLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px;">  ✖  </button>
                    </div>
                </div>
                <div style="margin-top:10px;">`;
            w.exercises.forEach(ex => {
                html += `<div class="ex-mini-row">
                    <span style="color:var(--text-light)">${ex.name}:</span><br>
                    <span style="color:var(--primary); font-weight:700;">${ex.weight} kg x ${ex.reps} x ${ex.sets} set</span>
                </div>`;
            });
            html += `</div></div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
        html += `<button class="mode-btn" style="color:var(--danger); background:none;" onclick="cancelActiveDraft()">Avbryt och radera utkast</button>`;
    } else {
        html += `<p style="text-align:center;">Planerat: <strong>${planned ? planned.name : 'Vila'}</strong></p>`;
        if(planned) {
            html += `<div class="preview-box">${planned.exercises.map(e => e.name).join(", ")}</div>`;
