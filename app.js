let programData;
let masterExercises = JSON.parse(localStorage.getItem("masterExercises") || "[]");
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");
let activeDraft = JSON.parse(localStorage.getItem("activeWorkoutDraft") || "null");
let calendarOverrides = JSON.parse(localStorage.getItem("calendarOverrides") || "{}");
let currentViewDate = new Date();
let currentExerciseCategory = "Ben";

// Timer-variabler
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
                    let animFile = "";
                    if (ex.name === "Deadlift") animFile = "Gemini_Generated_Image_sqtn3ksqtn3ksqtn.mp4";
                    if (ex.name === "Barbell Bench Press") animFile = "Skärmbild 2026-05-11 124104.mp4";
                    
                    masterExercises.push({ 
                        ...ex, 
                        id: Date.now() + Math.random(),
                        animation: animFile 
                    });
                }
            });
        });
        localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    } else {
        masterExercises.forEach(ex => {
            if (ex.name === "Deadlift") ex.animation = "Gemini_Generated_Image_sqtn3ksqtn3ksqtn.mp4";
            if (ex.name === "Barbell Bench Press") ex.animation = "Skärmbild 2026-05-11 124104.mp4";
        });
    }
    
    programData = savedProgram || json;

    // Återställ timer om det finns ett pågående pass som var igång
    if(activeDraft && activeDraft.isStarted) {
        secondsElapsed = activeDraft.secondsElapsed || 0;
        if(activeDraft.wasTimerRunning) {
            startTimer();
        } else {
            updateTimerDisplay();
        }
    }

    renderHome();
});

function saveAll() {
    localStorage.setItem("myCustomProgram", JSON.stringify(programData));
    localStorage.setItem("masterExercises", JSON.stringify(masterExercises));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("calendarOverrides", JSON.stringify(calendarOverrides));
}

function showView(id) {
    const target = document.getElementById(id);
    if(!target) return;
    
    if (target.classList.contains("hidden")) {
        document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
        target.classList.remove("hidden");
        target.style.animation = 'none';
        target.offsetHeight; 
        target.style.animation = null;
    }
    window.scrollTo(0, 0);
}

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
    const video = document.querySelector("#modal-body video");
    if(video) video.pause();
}

function openModal() {
    document.getElementById("workout-modal").classList.remove("hidden");
}

// --- TIMER LOGIK ---
function updateTimerDisplay() {
    const hrs = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById("workout-timer").textContent = `${hrs}:${mins}:${secs}`;
}

function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    if(activeDraft) activeDraft.wasTimerRunning = true;
    document.getElementById("timer-toggle-btn").textContent = "Pausa ⏸️";
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
    if(activeDraft) activeDraft.wasTimerRunning = false;
    clearInterval(timerInterval);
    document.getElementById("timer-toggle-btn").textContent = "Fortsätt ▶️";
    if(activeDraft) localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

document.getElementById("timer-toggle-btn").onclick = () => {
    if (isTimerRunning) pauseTimer();
    else startTimer();
};

// --- ÖVNINGAR & INSTÄLLNINGAR ---
function openCreateExerciseModal(callback = null) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Ny Övning</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN</label>
        <input type="text" id="new-ex-name" class="log-input" placeholder="T.ex. Knäböj">
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">KATEGORI</label>
        <select id="new-ex-cat" class="log-input">
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Biceps">Biceps</option>
            <option value="Triceps">Triceps</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn blue" id="save-new-ex-btn">Spara Övning</button>
    `;
    
    document.getElementById("save-new-ex-btn").onclick = () => {
        const name = document.getElementById("new-ex-name").value.trim();
        const target = document.getElementById("new-ex-cat").value;
        if(!name) return alert("Ange ett namn!");
        const newEx = { id: Date.now(), name, target, defaultSets: 3, animation: "" };
        masterExercises.push(newEx);
        saveAll();
        if(callback) callback(newEx);
        else { closeModal(); filterExercises(currentExerciseCategory); }
    };
    openModal();
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
        div.style.cssText = "padding:15px; display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; cursor:pointer;";
        
        div.onclick = (e) => {
            if(e.target.tagName !== 'BUTTON') {
                showExerciseAnimation(ex.id);
            }
        };

        div.innerHTML = `<div><strong style="font-size:16px;">${ex.name}</strong><br><small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:10px;">${ex.target}</small></div>
        <button style="background:none; border:none; font-size:18px; cursor:pointer;" onclick="openEditExerciseModal(${ex.id})"> ⚙️ </button>`;
        results.appendChild(div);
    });
}

function showExerciseAnimation(id) {
    const ex = masterExercises.find(e => e.id == id);
    if(!ex) return;
    
    const body = document.getElementById("modal-body");
    let videoHtml = "";
    
    if(ex.animation) {
        videoHtml = `
            <div style="border-radius:16px; overflow:hidden; background:#000; margin-bottom:15px; border:1px solid var(--glass-border);">
                <video src="${ex.animation}" autoplay loop muted playsinline style="width:100%; display:block;"></video>
            </div>
        `;
    } else {
        videoHtml = `
            <div style="padding:40px 20px; text-align:center; background:rgba(255,255,255,0.05); border-radius:16px; margin-bottom:15px; color:var(--text-light); font-size:14px;">
                Ingen videoanimation tillgänglig för denna övning. 🎥
            </div>
        `;
    }

    body.innerHTML = `
        <h3>${ex.name}</h3>
        ${videoHtml}
        <div style="text-align:left; color:var(--text-light); font-size:14px; padding:10px;">
            <p><strong>Muskelgrupp:</strong> ${ex.target}</p>
        </div>
    `;
    openModal();
}

function openEditExerciseModal(id) {
    const ex = masterExercises.find(e => e.id == id);
    if(!ex) return;
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera Övning</h3>
        <div style="text-align:left;">
            <label style="font-size:12px; color:var(--text-light); margin-left:10px;">NAMN PÅ ÖVNING</label>
            <input type="text" id="edit-ex-name" class="log-input" value="${ex.name}">
            <label style="font-size:12px; color:var(--text-light); margin-left:10px;">ANIMATIONSFIL (.mp4)</label>
            <input type="text" id="edit-ex-anim" class="log-input" value="${ex.animation || ''}" placeholder="t.ex. video.mp4">
            <label style="font-size:12px; color:var(--text-light); margin-left:10px;">KATEGORI</label>
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
    ex.animation = document.getElementById("edit-ex-anim").value;
    saveAll(); closeModal(); filterExercises(currentExerciseCategory);
}

function deleteMasterExercise(id) {
    if(confirm("Vill du radera denna övning permanent?")) {
        masterExercises = masterExercises.filter(e => e.id != id);
        saveAll(); closeModal(); filterExercises(currentExerciseCategory);
    }
}

// --- KALENDER ---
function renderCalendar(isFromStartBtn = false) {
    const grid = document.getElementById("calendar-grid");
    const label = document.getElementById("month-label");
    const infoBox = document.getElementById("calendar-info-box");
    
    grid.innerHTML = "";
    infoBox.innerHTML = ""; 
    
    if(isFromStartBtn === true) {
        infoBox.innerHTML = `<div style="background:rgba(34, 211, 238, 0.1); padding:12px; border-radius:12px; margin-bottom:15px; font-size:13px; text-align:center; color:var(--primary); border:1px solid var(--primary);">
            Välj vilken dag du vill starta eller schemalägga ett pass i kalendern nedan 📅
        </div>`;
    }

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
        if (override && override !== "none") displayPass = programData.routine.find(p => p.id === override);
        else if (isAutoDay && override !== "none") displayPass = programData.routine[d % programData.routine.length];
        
        let info = "";
        if (hasWorkouts.length > 0) { cell.classList.add("cell-completed"); info = "✓"; }
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = "⏱️"; }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
        cell.innerHTML = `<span>${d}</span><span>${info}</span>`;
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
            const timeStr = w.totalTime ? `⏱️ ${w.totalTime}` : "";
            html += `<div class="card glass" style="border-left:4px solid var(--success); text-align:left; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong>${w.programName}</strong>
                    <div style="font-size:10px; color:var(--text-light)">${timeStr}</div>
                    <div>
                        <button onclick="editLoggedWorkout('${dateStr}', ${idx})" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:16px; margin-right:10px;"> ✏️ </button>
                        <button onclick="openConfirmDeleteModal('${dateStr}', ${idx})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:16px;"> ✖ </button>
                    </div>
                </div>
                <div style="margin-top:10px;">`;
            w.exercises.forEach(ex => {
                html += `<div style="font-size:12px; margin-bottom:5px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:3px;">
                    <span style="color:var(--text-light)">${ex.name}:</span><br>`;
                if(ex.sets_data) {
                    ex.sets_data.forEach((s, sIdx) => {
                        html += `<span style="color:var(--primary); font-weight:700;">Set ${sIdx+1}: ${s.weight} kg x ${s.reps} reps</span><br>`;
                    });
                } else {
                    html += `<span style="color:var(--primary); font-weight:700;">Set: ${ex.weight} kg x ${ex.reps} reps x ${ex.sets} set</span>`;
                }
                html += `</div>`;
            });
            html += `</div></div>`;
        });
    } else if (isOngoing) {
        html += `<button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)">Fortsätt pågående pass</button>`;
    } else {
        html += `<p style="text-align:center;">Planerat: <strong id="current-planned-label">${planned ? planned.name : 'Vila'}</strong></p>`;
        
        html += `<div id="day-manager-action-btn-container">`;
        if(planned) {
            // Ändrat från prepareStart till att gå direkt till vyn
            html += `<button class="mode-btn green" onclick="closeModal(); startWorkoutDirectly('${dateStr}', '${planned.id}')">Starta ${planned.name} 🔥</button>`;
        }
        html += `</div>`;
        
        html += `<button class="mode-btn glass-border" style="border-color:var(--primary); color:var(--primary);" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')"><span style="color:var(--primary)">+</span> Starta Fritt Pass</button>`;

        html += `<div class="separator"></div><p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Ändra planering:</p>`;
        html += `<div class="plan-override-grid">`;
        programData.routine.forEach(p => {
            const isSelected = planned && p.id === planned.id;
            html += `<button class="mode-btn glass-border plan-override-btn ${isSelected ? 'active-choice' : ''}" id="btn-ovr-${p.id}" onclick="setOverrideSilent('${dateStr}', '${p.id}')">${p.name}</button>`;
        });
        html += `</div>`;
        html += `<div style="margin-top:10px;">
                    <button class="mode-btn glass-border plan-override-btn override-rest-btn" onclick="setOverrideSilent('${dateStr}', 'none')">Vila</button>
                 </div>`;
    }
    body.innerHTML = html;
    openModal();
}

function setOverrideSilent(date, val) {
    calendarOverrides[date] = val;
    saveAll();
    
    document.querySelectorAll('.plan-override-btn').forEach(b => b.classList.remove('active-choice'));
    const btnContainer = document.getElementById('day-manager-action-btn-container');
    
    if(val !== 'none') {
        const activeBtn = document.getElementById(`btn-ovr-${val}`);
        if(activeBtn) activeBtn.classList.add('active-choice');
        const p = programData.routine.find(x => x.id === val);
        document.getElementById('current-planned-label').textContent = p.name;
        
        if(btnContainer) {
            btnContainer.innerHTML = `<button class="mode-btn green" onclick="closeModal(); startWorkoutDirectly('${date}', '${p.id}')">Starta ${p.name} 🔥</button>`;
        }
    } else {
        document.getElementById('current-planned-label').textContent = "Vila";
        if(btnContainer) btnContainer.innerHTML = "";
    }
    
    renderCalendar(false); 
    openModal(); 
}

function startWorkoutDirectly(date, passId) {
    const p = programData.routine.find(x => x.id === passId);
    if(p) {
        startWorkout(p, null, date, false);
    }
}

function startFreeWorkoutOnDate(date) {
    const freePass = { id: "free-" + Date.now(), name: "Fritt Pass", exercises: [] };
    startWorkout(freePass, null, date, false);
}

function openMonthPicker() {
    const body = document.getElementById("modal-body");
    let html = `<h3>Välj månad</h3><div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">`;
    const months = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];
    months.forEach((m, i) => { html += `<button class="mode-btn glass-border" style="font-size:14px;" onclick="selectMonth(${i})">${m}</button>`; });
    body.innerHTML = html + `</div>`;
    openModal();
}

function selectMonth(m) { currentViewDate.setMonth(m); closeModal(); renderCalendar(); }

// --- PROGRAM & REDIGERING ---
function renderProgramView(activeIdx = null) {
    const selector = document.getElementById("pass-selector-list");
    selector.innerHTML = "";
    programData.routine.forEach((pass, i) => {
        const div = document.createElement("div");
        div.className = `prog-card ${activeIdx === i ? 'active' : ''}`;
        div.innerHTML = `<div style="font-size:24px;">${['⚡','🔥','🏆','💎'][i % 4]}</div><h4>${pass.name}</h4><div style="font-size:10px; color:var(--primary); margin-top:5px; font-weight:800;">${pass.exercises.length} ÖVNINGAR</div>`;
        div.onclick = () => { 
            document.querySelectorAll(".prog-card").forEach(c => c.classList.remove("active"));
            div.classList.add("active");
            showProgramDetails(i); 
        };
        selector.appendChild(div);
    });
    showView("programs-view");
}

function showProgramDetails(idx) {
    const pass = programData.routine[idx];
    const detailsArea = document.getElementById("program-details-area");
    const list = document.getElementById("program-exercise-list");
    detailsArea.classList.remove("hidden");
    
    list.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding-bottom:10px; border-bottom:1px solid var(--glass-border);">
            <h3 style="margin:0; text-align:left; font-size:18px;">${pass.name}</h3>
            <button class="order-btn" style="background:var(--primary); color:#0f172a; padding:8px 15px; border-radius:10px; font-weight:800; border:none; cursor:pointer; font-size:12px;" onclick="openEditProgramModal(${idx})">Redigera</button>
        </div>
        ${pass.exercises.map(e => `
            <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
                <span style="font-weight:600;">${e.name}</span>
                <small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:9px;">${e.target}</small>
            </div>
        `).join("")}
    `;
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN PÅ PASS</label>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        
        <div id="edit-pass-exercises">
            ${pass.exercises.map((ex, i) => `
                <div class="edit-item-row">
                    <div style="display:flex; gap:8px;">
                        <button class="reorder-btn" onclick="moveExercise(${idx}, ${i}, -1)">▲</button>
                        <button class="reorder-btn" onclick="moveExercise(${idx}, ${i}, 1)">▼</button>
                    </div>
                    <span style="flex-grow:1; margin-left:15px; font-size:14px; font-weight:600;">${ex.name}</span>
                    <button onclick="removeExFromPass(${idx}, ${i})" style="color:var(--danger); background:none; border:none; font-size:18px;"> ✖ </button>
                </div>`).join("")}
        </div>

        <div class="separator" style="margin: 20px 0;"></div>
        <p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center;">Lägg till övning:</p>
        <select id="add-ex-select" class="log-input">
            <option value="">Välj från banken...</option>
            ${masterExercises.map(ex => `<option value="${ex.id}">${ex.name} (${ex.target})</option>`).join("")}
        </select>
        <button class="mode-btn glass-border" style="font-size:13px; padding:10px;" onclick="addExerciseToPass(${idx})">+ Lägg till vald</button>
        <button class="mode-btn glass-border" style="font-size:13px; padding:10px;" onclick="createNewExForPass(${idx})">+ Skapa ny övning till banken</button>

        <button class="mode-btn blue" style="margin-top:20px;" onclick="saveProgramEdit(${idx})">Spara alla ändringar</button>
        <button class="mode-btn" style="color:var(--danger); background:none; font-size:14px; margin-top:10px;" onclick="deleteEntireProgram(${idx})">Radera pass permanent</button>
    `;
    openModal();
}

function deleteEntireProgram(idx) {
    if(confirm("Vill du radera hela detta pass permanent?")) {
        programData.routine.splice(idx, 1);
        saveAll();
        closeModal();
        document.getElementById("program-details-area").classList.add("hidden");
        renderProgramView();
    }
}

function addExerciseToPass(pIdx) {
    const exId = document.getElementById("add-ex-select").value;
    if(!exId) return;
    const ex = masterExercises.find(e => e.id == exId);
    programData.routine[pIdx].exercises.push({ name: ex.name, target: ex.target, defaultSets: 3 });
    openEditProgramModal(pIdx);
}

function createNewExForPass(pIdx) {
    openCreateExerciseModal((newEx) => {
        programData.routine[pIdx].exercises.push({ name: newEx.name, target: newEx.target, defaultSets: 3 });
        openEditProgramModal(pIdx);
    });
}

function moveExercise(pIdx, eIdx, dir) {
    const exercises = programData.routine[pIdx].exercises;
    const newIdx = eIdx + dir;
    if(newIdx < 0 || newIdx >= exercises.length) return;
    [exercises[eIdx], exercises[newIdx]] = [exercises[newIdx], exercises[eIdx]];
    openEditProgramModal(pIdx);
}

function removeExFromPass(pIdx, eIdx) {
    programData.routine[pIdx].exercises.splice(eIdx, 1);
    openEditProgramModal(pIdx);
}

function saveProgramEdit(idx) {
    programData.routine[idx].name = document.getElementById("edit-pass-name").value;
    saveAll(); closeModal(); renderProgramView(idx); showProgramDetails(idx);
}

function openCreateProgramModal() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Skapa Nytt Pass</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN PÅ PASS</label>
        <input type="text" id="new-pass-name" class="log-input" placeholder="T.ex. Överkropp Deluxe">
        <button class="mode-btn blue" onclick="saveNewProgram()">Spara och Redigera</button>
    `;
    openModal();
}

function saveNewProgram() {
    const name = document.getElementById("new-pass-name").value.trim();
    if(!name) return alert("Ange ett namn!");
    const newPass = { id: "pass-" + Date.now(), name, exercises: [] };
    programData.routine.push(newPass);
    saveAll();
    const newIdx = programData.routine.length - 1;
    openEditProgramModal(newIdx);
}

// --- LOGIK FÖR HISTORIK ---
function getExerciseHistory(exerciseName) {
    for (let i = workoutHistory.length - 1; i >= 0; i--) {
        const workout = workoutHistory[i];
        const exMatch = workout.exercises.find(e => e.name === exerciseName);
        if (exMatch) {
            if (!exMatch.sets_data) {
                return Array(parseInt(exMatch.sets || 3)).fill({ weight: exMatch.weight, reps: exMatch.reps });
            }
            return exMatch.sets_data;
        }
    }
    return null;
}

// --- AKTIVT PASS ---
function startWorkout(workout, data = null, date = null, isImmediateStart = false) {
    secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    
    if(!data) {
        data = workout.exercises.map(ex => {
            const history = getExerciseHistory(ex.name);
            if (history) {
                return { sets_data: JSON.parse(JSON.stringify(history)), isCompleted: false };
            }
            return { sets_data: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }], isCompleted: false };
        });
    }

    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data: data, 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: secondsElapsed,
        isStarted: isImmediateStart || (activeDraft ? activeDraft.isStarted : false),
        wasTimerRunning: isImmediateStart || (activeDraft ? activeDraft.wasTimerRunning : false)
    };
    
    renderActiveWorkout();
    updateTimerDisplay();
    if(activeDraft.isStarted && activeDraft.wasTimerRunning) startTimer();
    else pauseTimer();
}

function renderActiveWorkout() {
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    const footer = document.querySelector(".workout-footer");
    const timerCard = document.getElementById("timer-card");
    const headerRow = document.getElementById("active-header-row");
    
    list.innerHTML = "";
    headerRow.innerHTML = ""; // Rensa rubrikhöjd

    headerRow.innerHTML = `
        <h2 id="active-title" class="section-title modern-header" style="margin-bottom:0; flex-grow:1;">${activeDraft.workout.name}</h2>
    `;

    if(!activeDraft.isStarted) {
        footer.classList.add("hidden");
        timerCard.classList.add("hidden"); // Dölj klocka/timer
        
        list.innerHTML = `
            <div style="text-align:center; padding:10px 0 20px;">
                <button class="mode-btn green" style="width:100%; padding:20px; font-size:18px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>
                <p style="color:var(--text-light); font-size:13px; margin-top:10px;">Klicka på knappen ovan för att starta klockan.</p>
            </div>
        `;
        
        // Rendera de planerade övningarna under knappen så man ser vad man ska göra
        activeDraft.workout.exercises.forEach((ex, i) => {
            const exerciseData = activeDraft.data[i];
            const div = document.createElement("div");
            div.className = "card glass";
            div.style.opacity = "0.6";
            div.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <strong style="font-size:16px;">${ex.name}</strong>
                    <small style="color:var(--primary); font-weight:800; text-transform:uppercase; font-size:10px;">${ex.target}</small>
                </div>
                <div style="margin-top:5px; font-size:12px; color:var(--text-light)">
                    Planerat: ${exerciseData.sets_data.length} set
                </div>
            `;
            list.appendChild(div);
        });

        showView("workout-view");
        return;
    }

    // Om passet ÄR startat:
    footer.classList.remove("hidden");
    timerCard.classList.remove("hidden"); // Visa klocka/timer

    const pauseBtn = document.getElementById("pause-workout-btn");
    pauseBtn.innerHTML = `Spara utkast 💾`;
    pauseBtn.className = "mode-btn save-draft-btn";
    pauseBtn.onclick = () => { pauseTimer(); showView('home-view'); };

    activeDraft.workout.exercises.forEach((ex, i) => {
        const exerciseData = activeDraft.data[i];
        const isDone = exerciseData.isCompleted;
        const div = document.createElement("div");
        div.className = "card glass" + (isDone ? " exercise-done" : "");
        
        let setsHtml = `<div style="margin-top:10px;">
            <div style="display:grid; grid-template-columns: 35px 1fr 1fr 30px; gap:8px; margin-bottom:5px; align-items:center;">
                <span></span>
                <small style="text-align:center; color:var(--text-light); font-size:9px;">KG</small>
                <small style="text-align:center; color:var(--text-light); font-size:9px;">REPS</small>
                <span></span>
            </div>`;

        exerciseData.sets_data.forEach((set, sIdx) => {
            setsHtml += `
            <div style="display:grid; grid-template-columns: 35px 1fr 1fr 30px; gap:8px; margin-bottom:8px; align-items:center;">
                <span style="font-size:12px; font-weight:800; color:var(--primary)">#${sIdx + 1}</span>
                <input type="number" id="w-${i}-${sIdx}" class="log-input" style="margin:0; padding:8px;" placeholder="0" value="${set.weight}" onchange="updateSetData(${i}, ${sIdx})">
                <input type="number" id="r-${i}-${sIdx}" class="log-input" style="margin:0; padding:8px;" placeholder="0" value="${set.reps}" onchange="updateSetData(${i}, ${sIdx})">
                <button onclick="removeSetFromExercise(${i}, ${sIdx})" style="background:none; border:none; color:var(--danger); font-size:16px;" ${isDone ? 'disabled' : ''}>×</button>
            </div>`;
        });

        setsHtml += `
            <button class="mode-btn glass-border" style="padding:8px; font-size:11px; margin-top:5px; border-style:dashed;" onclick="addSetToExercise(${i})" ${isDone ? 'disabled' : ''}>+ Lägg till set</button>
            <button class="mode-btn ${isDone ? 'blue' : 'green'}" style="padding:10px; font-size:13px; margin-top:10px;" onclick="toggleExerciseDone(${i})">
                ${isDone ? 'Ångra Klar ↩️' : 'Marker som klar ✅'}
            </button>
        </div>`;

        div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <div style="display:flex; gap:8px;">
                <button class="reorder-btn" onclick="moveActiveExercise(${i}, -1)" ${isDone ? 'disabled' : ''}>▲</button>
                <button class="reorder-btn" onclick="moveActiveExercise(${i}, 1)" ${isDone ? 'disabled' : ''}>▼</button>
            </div>
            <strong style="font-size:16px; flex-grow:1; margin-left:10px; text-align:left;">${ex.name}</strong>
            <div style="display:flex; gap:10px;">
                <button onclick="openExerciseOptionsModal(${i})" style="color:var(--danger); background:none; border:none; font-size:20px; cursor:pointer;" ${isDone ? 'disabled' : ''}> ✖ </button>
            </div>
        </div>
        ${setsHtml}`;
        
        list.appendChild(div);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "mode-btn glass-border";
    addBtn.style.marginTop = "10px";
    addBtn.innerHTML = "➕ Lägg till övning";
    addBtn.onclick = openAddExerciseToWorkoutModal;
    list.appendChild(addBtn);

    const discardBtn = document.createElement("button");
    discardBtn.className = "mode-btn";
    discardBtn.style.cssText = "background:none; color:var(--danger); font-size:14px; margin-top:20px; border:1px solid rgba(239, 68, 68, 0.2);";
    discardBtn.innerHTML = "Kassera pass 🗑️";
    discardBtn.onclick = confirmDiscardActiveWorkout;
    list.appendChild(discardBtn);

    showView("workout-view");
}

function openExerciseOptionsModal(index) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Hantera övning</h3>
        <p style="text-align:center; color:var(--text-light); margin-bottom:20px;">Vad vill du göra med <strong>${activeDraft.workout.exercises[index].name}</strong>?</p>
        <button class="mode-btn blue" onclick="openReplaceExerciseModal(${index})">Byt ut övning 🔄</button>
        <button class="mode-btn" style="background:var(--danger); color:white;" onclick="closeModal(); removeActiveExercise(${index})">Ta bort helt ✖</button>
        <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
    `;
    openModal();
}

function updateSetData(exIdx, setIdx) {
    const wVal = document.getElementById(`w-${exIdx}-${setIdx}`).value;
    const rVal = document.getElementById(`r-${exIdx}-${setIdx}`).value;
    activeDraft.data[exIdx].sets_data[setIdx] = { weight: wVal, reps: rVal };
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function addSetToExercise(exIdx) {
    const scrollPos = window.scrollY;
    const lastSet = activeDraft.data[exIdx].sets_data[activeDraft.data[exIdx].sets_data.length - 1];
    const newWeight = lastSet ? lastSet.weight : "";
    const newReps = lastSet ? lastSet.reps : "";
    activeDraft.data[exIdx].sets_data.push({ weight: newWeight, reps: newReps });
    renderActiveWorkout();
    window.scrollTo(0, scrollPos);
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function removeSetFromExercise(exIdx, setIdx) {
    const scrollPos = window.scrollY;
    activeDraft.data[exIdx].sets_data.splice(setIdx, 1);
    renderActiveWorkout();
    window.scrollTo(0, scrollPos);
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function toggleExerciseDone(exIdx) {
    const scrollPos = window.scrollY;
    activeDraft.data[exIdx].isCompleted = !activeDraft.data[exIdx].isCompleted;
    renderActiveWorkout();
    window.scrollTo(0, scrollPos);
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function actuallyStartWorkout() {
    activeDraft.isStarted = true;
    activeDraft.wasTimerRunning = true;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    startTimer();
}

function openAddExerciseToWorkoutModal() {
    renderExercisePicker("Ben");
    openModal();
}

function openReplaceExerciseModal(index) {
    renderExercisePicker("Ben", index);
    openModal();
}

function renderExercisePicker(category, replaceIndex = null) {
    const body = document.getElementById("modal-body");
    const categories = ["Ben", "Bröst", "Rygg", "Axlar", "Armar", "Bål"];
    let html = `<h3>${replaceIndex !== null ? 'Byt ut övning' : 'Välj Övning'}</h3>`;
    
    html += `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:5px; margin-bottom:15px;">`;
    categories.forEach(cat => {
        const isActive = cat === category;
        html += `<button onclick="renderExercisePicker('${cat}', ${replaceIndex})" style="padding:8px 5px; font-size:10px; border-radius:8px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; background:${isActive ? 'rgba(56,189,248,0.1)' : 'none'}; color:${isActive ? 'var(--primary)' : 'white'}; cursor:pointer;"> ${cat} </button>`;
    });
    html += `</div>`;

    html += `<div style="max-height:250px; overflow-y:auto; padding-right:5px; margin-bottom:15px;">`;
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    filtered.forEach(ex => {
        html += `
            <div class="card glass" style="padding:12px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;" onclick="confirmAddExerciseToActive(${ex.id}, ${replaceIndex})">
                <span style="font-size:14px; font-weight:600;">${ex.name}</span>
                <span style="color:var(--primary); font-size:18px;">${replaceIndex !== null ? '🔄' : '+'}</span>
            </div>
        `;
    });
    html += `</div>`;
    body.innerHTML = html;
}

function confirmAddExerciseToActive(exId, replaceIndex) {
    const ex = masterExercises.find(e => e.id == exId);
    const history = getExerciseHistory(ex.name);
    const newData = {
        sets_data: history ? JSON.parse(JSON.stringify(history)) : [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }],
        isCompleted: false
    };

    if(replaceIndex !== null) {
        activeDraft.workout.exercises[replaceIndex] = { name: ex.name, target: ex.target };
        activeDraft.data[replaceIndex] = newData;
    } else {
        activeDraft.workout.exercises.push({ name: ex.name, target: ex.target });
        activeDraft.data.push(newData);
    }
    
    saveAll();
    closeModal();
    renderActiveWorkout();
}

function removeActiveExercise(index) {
    activeDraft.workout.exercises.splice(index, 1);
    activeDraft.data.splice(index, 1);
    saveAll();
    renderActiveWorkout();
}

function moveActiveExercise(index, dir) {
    const newIdx = index + dir;
    if(newIdx < 0 || newIdx >= activeDraft.workout.exercises.length) return;
    
    const scrollPos = window.scrollY;
    [activeDraft.workout.exercises[index], activeDraft.workout.exercises[newIdx]] = [activeDraft.workout.exercises[newIdx], activeDraft.workout.exercises[index]];
    [activeDraft.data[index], activeDraft.data[newIdx]] = [activeDraft.data[newIdx], activeDraft.data[index]];
    
    renderActiveWorkout();
    window.scrollTo(0, scrollPos);
}

function confirmDiscardActiveWorkout() {
    if(confirm("Vill du kasta detta pågående pass? All osparad data försvinner.")) {
        activeDraft = null;
        localStorage.removeItem("activeWorkoutDraft");
        secondsElapsed = 0;
        pauseTimer();
        renderHome();
    }
}

function finishWorkout() {
    const completedEx = activeDraft.data.filter(d => d.isCompleted).length;
    if(completedEx === 0) {
        if(!confirm("Du har inte markerat några övningar som klara. Vill du avsluta ändå?")) return;
    }

    pauseTimer();
    const duration = document.getElementById("workout-timer").textContent;
    
    const logEntry = {
        id: Date.now(),
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: duration,
        exercises: activeDraft.workout.exercises.map((ex, i) => {
            return {
                name: ex.name,
                target: ex.target,
                sets_data: activeDraft.data[i].sets_data,
                isCompleted: activeDraft.data[i].isCompleted
            };
        })
    };

    workoutHistory.push(logEntry);
    activeDraft = null;
    localStorage.removeItem("activeWorkoutDraft");
    secondsElapsed = 0;
    saveAll();
    
    renderHome();
    alert("Bra jobbat! Passet är sparat i historiken. 🏆");
}

// --- HEMVY & STATS ---
function renderHome() {
    showView("home-view");
    document.querySelector("#stat-workouts .stat-value").textContent = workoutHistory.length;
    
    const streak = calculateStreak();
    document.querySelector("#stat-streak .stat-value").textContent = streak;

    // Om det finns ett pågående pass, ändra knappen på hemmenyn
    const mainBtn = document.querySelector(".main-action-btn");
    if(activeDraft) {
        mainBtn.onclick = () => renderActiveWorkout();
        mainBtn.innerHTML = `
            <div class="btn-content">
                <span class="btn-icon">⚡</span>
                <div class="btn-text">
                    <strong>Fortsätt Pass</strong>
                    <span>Du har ett pågående ${activeDraft.workout.name}</span>
                </div>
            </div>
        `;
    } else {
        mainBtn.onclick = () => renderCalendar(true);
        mainBtn.innerHTML = `
            <div class="btn-content">
                <span class="btn-icon">🚀</span>
                <div class="btn-text">
                    <strong>Starta Träningspass</strong>
                    <span>Välj ett pass från ditt schema</span>
                </div>
            </div>
        `;
    }
}

function calculateStreak() {
    if(workoutHistory.length === 0) return 0;
    const dates = [...new Set(workoutHistory.map(w => w.date))].sort().reverse();
    let streak = 0;
    let curr = new Date();
    curr.setHours(0,0,0,0);
    
    for(let i=0; i<dates.length; i++) {
        const d = new Date(dates[i]);
        d.setHours(0,0,0,0);
        const diff = (curr - d) / (1000*60*60*24);
        if(diff <= 1) {
            streak++;
            curr = d;
        } else break;
    }
    return streak;
}

// --- HISTORIK ---
function renderHistory() {
    const list = document.getElementById("history-list");
    list.innerHTML = "";
    
    if(workoutHistory.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-light); margin-top:40px;">Inga träningspass loggade än. Kom igång idag! 🔥</p>`;
    }

    [...workoutHistory].reverse().forEach((w, idx) => {
        const actualIdx = workoutHistory.length - 1 - idx;
        const div = document.createElement("div");
        div.className = "card glass";
        div.style.marginBottom = "15px";
        
        let exHtml = "";
        w.exercises.forEach(ex => {
            if(ex.isCompleted) {
                exHtml += `<div style="font-size:12px; margin-top:5px; color:var(--text-light); border-left:2px solid var(--primary); padding-left:8px;">
                    <strong>${ex.name}</strong>: ${ex.sets_data.length} set
                </div>`;
            }
        });

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <small style="color:var(--primary); font-weight:800;">${w.date}</small>
                    <h3 style="margin:5px 0;">${w.programName}</h3>
                    <div style="font-size:12px; color:var(--text-light);">⏱️ ${w.totalTime || 'N/A'}</div>
                </div>
                <button onclick="openConfirmDeleteModal('${w.date}', ${actualIdx})" style="background:none; border:none; color:var(--danger); font-size:18px; cursor:pointer;">✖</button>
            </div>
            <div style="margin-top:10px;">${exHtml}</div>
        `;
        list.appendChild(div);
    });
    showView("history-view");
}

function openConfirmDeleteModal(date, index) {
    if(confirm("Vill du radera detta loggade pass?")) {
        workoutHistory.splice(index, 1);
        saveAll();
        if(document.getElementById("history-view").classList.contains("hidden")) {
            renderCalendar();
        } else {
            renderHistory();
        }
        closeModal();
    }
}

function editLoggedWorkout(date, index) {
    const workout = workoutHistory[index];
    const body = document.getElementById("modal-body");
    
    let html = `<h3>Redigera ${workout.programName}</h3><p style="font-size:11px; color:var(--text-light);">${date}</p>`;
    
    workout.exercises.forEach((ex, exIdx) => {
        html += `<div style="text-align:left; margin-bottom:15px; border-bottom:1px solid var(--glass-border); padding-bottom:10px;">
            <strong style="font-size:14px;">${ex.name}</strong>
            <div id="edit-history-sets-${exIdx}">`;
        
        ex.sets_data.forEach((s, sIdx) => {
            html += `<div style="display:grid; grid-template-columns: 1fr 1fr 30px; gap:8px; margin-top:5px;">
                <input type="number" class="log-input" style="margin:0;" value="${s.weight}" id="eh-w-${exIdx}-${sIdx}">
                <input type="number" class="log-input" style="margin:0;" value="${s.reps}" id="eh-r-${exIdx}-${sIdx}">
                <button onclick="this.parentElement.remove()" style="background:none; border:none; color:var(--danger);">×</button>
            </div>`;
        });
        
        html += `</div>
            <button class="mode-btn glass-border" style="padding:5px; font-size:10px; margin-top:5px;" onclick="addSetToHistoryEdit(${exIdx})">+ Lägg till set</button>
        </div>`;
    });
    
    html += `<button class="mode-btn blue" onclick="saveHistoryEdit(${index})">Spara ändringar</button>`;
    body.innerHTML = html;
    openModal();
}

function addSetToHistoryEdit(exIdx) {
    const container = document.getElementById(`edit-history-sets-${exIdx}`);
    const div = document.createElement("div");
    div.style.cssText = "display:grid; grid-template-columns: 1fr 1fr 30px; gap:8px; margin-top:5px;";
    div.innerHTML = `
        <input type="number" class="log-input" style="margin:0;" placeholder="kg">
        <input type="number" class="log-input" style="margin:0;" placeholder="reps">
        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:var(--danger);">×</button>
    `;
    container.appendChild(div);
}

function saveHistoryEdit(index) {
    const workout = workoutHistory[index];
    workout.exercises.forEach((ex, exIdx) => {
        const container = document.getElementById(`edit-history-sets-${exIdx}`);
        const rows = container.querySelectorAll("div");
        const newSets = [];
        rows.forEach(row => {
            const inputs = row.querySelectorAll("input");
            newSets.push({ weight: inputs[0].value, reps: inputs[1].value });
        });
        ex.sets_data = newSets;
    });
    
    saveAll();
    closeModal();
    renderCalendar();
}
