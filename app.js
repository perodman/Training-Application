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
    const modal = document.getElementById("workout-modal");
    modal.classList.remove("hidden");
    // En liten timeout säkerställer att scrollen faktiskt nollställs efter att innehållet laddats
    setTimeout(() => {
        modal.scrollTo(0, 0);
    }, 10);
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
        else if (isOngoing) { cell.classList.add("cell-ongoing"); info = displayPass.name.split(" ").pop(); }
        else if (displayPass) { cell.classList.add("cell-planned"); info = displayPass.name.split(" ").pop(); }
        
        // Punkt 3: Ändrad struktur för info-ikon för bättre centrering
        cell.innerHTML = `<span>${d}</span><div class="cell-info">${info}</div>`;
        cell.onclick = () => openDayManager(dateStr, displayPass, hasWorkouts, isOngoing);
        grid.appendChild(cell);
    }
    showView("calendar-view");
}

function openDayManager(dateStr, planned, completed, isOngoing) {
    const body = document.getElementById("modal-body");
    
    let html = `
        <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--text-light); font-weight: 600; display: block; margin-bottom: 5px;">Valt datum</span>
            
            <h2 class="section-title modern-header" style="margin: 0; display: inline-block; font-size: 26px;">
                ${dateStr}
            </h2>
        </div>
    `;
    
    if (completed.length > 0) {
        completed.forEach((w, idx) => {
            const timeStr = w.totalTime ? `⏱️ ${w.totalTime}` : "";
            html += `
            <div class="card glass" style="border-left: 4px solid #22c55e; text-align: left; margin-bottom: 15px; padding: 15px; border-radius: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div>
                        <strong style="font-size: 16px; color: var(--text); display: block;">${w.programName}</strong>
                        <span style="font-size: 11px; color: var(--text-light); font-weight: 500;">${timeStr || 'Slutfört pass ✅'}</span>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="editLoggedWorkout('${dateStr}', ${idx})" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--primary); cursor: pointer; font-size: 14px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✏️</button>
                        <button onclick="openConfirmDeleteModal('${dateStr}', ${idx})" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: var(--danger); cursor: pointer; font-size: 12px; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">✖</button>
                    </div>
                </div>
                
                <div style="background: rgba(0,0,0,0.15); padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px;">`;
            
            w.exercises.forEach(ex => {
                html += `
                <div style="font-size: 13px;">
                    <span style="color: var(--text); font-weight: 600; display: block; margin-bottom: 4px;">${ex.name}</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px;">`;
                
                if(ex.sets_data) {
                    ex.sets_data.forEach((s, sIdx) => {
                        html += `<span style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 700;">S${sIdx+1}: ${s.weight}kg × ${s.reps}</span>`;
                    });
                } else {
                    html += `<span style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); color: #60a5fa; font-size: 11px; padding: 3px 8px; border-radius: 6px; font-weight: 700;">${ex.sets} set × ${ex.weight}kg × ${ex.reps}r</span>`;
                }
                html += `</div></div>`;
            });
            html += `</div></div>`;
        });
    } 
    else if (isOngoing) {
        html += `
        <div style="padding: 20px 10px; text-align: center;">
            <button class="mode-btn orange" onclick="closeModal(); startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date)" style="width: 100%; padding: 16px; font-size: 16px; font-weight: bold; border-radius: 14px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
                Fortsätt pågående pass 🔥
            </button>
        </div>`;
    } 
    else {
        html += `
        <div class="card glass" style="padding: 20px; border-radius: 18px; text-align: center; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.08);">
            <span style="font-size: 11px; text-transform: uppercase; color: var(--text-light); font-weight: 600; letter-spacing: 0.5px;">Status</span>
            
            <p id="current-planned-label" style="margin: 5px 0 15px 0; font-size: 18px; font-weight: 700; color: var(--text);">
                ${planned ? `📋 Inplanerat: ${planned.name}` : '🧘 Planerad Vila'}
            </p>
            
            <div id="day-manager-action-btn-container" style="margin-bottom: 10px;">`;
            if(planned) {
                html += `
                <button class="mode-btn green" onclick="prepareStart('${dateStr}', '${planned.id}')" style="width: 100%; padding: 16px; font-size: 16px; font-weight: bold; border-radius: 14px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); margin-bottom: 10px;">
                    Starta ${planned.name} 🔥
                </button>`;
            }
        html += `
            </div>
            
            <button class="mode-btn glass-border" onclick="closeModal(); startFreeWorkoutOnDate('${dateStr}')" style="width: 100%; padding: 12px; font-size: 14px; border-radius: 12px; border-style: dashed;">
                ➕ Starta Fritt Pass
            </button>
        </div>`;

        html += `
        <div style="margin-top: 25px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <div style="flex-grow: 1; height: 1px; background: rgba(255,255,255,0.08);"></div>
                <p style="font-size: 11px; text-transform: uppercase; color: var(--text-light); font-weight: 700; letter-spacing: 1px; margin: 0;">Ändra planering</p>
                <div style="flex-grow: 1; height: 1px; background: rgba(255,255,255,0.08);"></div>
            </div>
            
            <div class="plan-override-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">`;
            
            programData.routine.forEach(p => {
                const isSelected = planned && p.id === planned.id;
                const exList = p.exercises.map(e => `
                    <div style="background: rgba(255,255,255,0.05); padding: 5px 8px; border-radius: 6px; margin-bottom: 4px; border-left: 2px solid var(--primary); font-size: 10px; color: #ddd; display: flex; align-items: center;">
                        <span style="margin-right: 6px; opacity: 0.5;">•</span> ${e.name}
                    </div>
                `).join('');

                html += `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <button class="mode-btn glass-border plan-override-btn ${isSelected ? 'active-choice' : ''}" 
                            id="btn-ovr-${p.id}" 
                            onclick="setOverrideSilent('${dateStr}', '${p.id}')"
                            style="margin: 0; padding: 12px; font-size: 13px; border-radius: 12px; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; width:100%;">
                        ${p.name}
                    </button>
                    
                    <details style="width: 100%; text-align: center;">
                        <summary style="list-style: none; font-size: 10px; color: var(--text-light); opacity: 0.6; cursor: pointer; padding: 4px; border-radius: 8px;">
                            Innehåll ▾
                        </summary>
                        <div style="text-align: left; padding: 8px; border-radius: 10px; margin-top: 4px; max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.1);">
                            ${exList}
                        </div>
                    </details>
                </div>`;
            });
            
            const isRestSelected = !planned;
            html += `
                <button class="mode-btn glass-border plan-override-btn override-rest-btn ${isRestSelected ? 'active-choice' : ''}" 
                        id="btn-ovr-none"
                        onclick="setOverrideSilent('${dateStr}', 'none')"
                        style="margin: 0; padding: 12px; font-size: 13px; border-radius: 12px; font-weight: bold; grid-column: span 2; border-color: rgba(253, 224, 71, 0.4); color: #fde047; background: rgba(253, 224, 71, 0.05);">
                    🧘 Vila
                </button>
            `;
            
        html += `
            </div>
        </div>`;
    }
    
    body.innerHTML = html;
    openModal();
}

function setOverrideSilent(date, val) {
    // 1. Spara i bakgrunden som vanligt
    calendarOverrides[date] = val;
    saveAll();
    
    // 2. Ta bort markeringen från ALLA planering-knappar direkt
    document.querySelectorAll('.plan-override-btn').forEach(b => b.classList.remove('active-choice'));
    
    const btnContainer = document.getElementById('day-manager-action-btn-container');
    const statusTextElem = document.getElementById('current-planned-label');
    
    // 3. Om man valde ett pass (inte Vila)
    if(val !== 'none') {
        // Tänd den nya knappen
        const activeBtn = document.getElementById(`btn-ovr-${val}`);
        if(activeBtn) activeBtn.classList.add('active-choice');
        
        // Hitta passets namn
        const p = programData.routine.find(x => x.id === val);
        
        // Uppdatera texten i statuskortet direkt
        if(statusTextElem) statusTextElem.textContent = `📋 Inplanerat: ${p.name}`;
        
        // Uppdatera den stora startknappen direkt
        if(btnContainer) {
            btnContainer.innerHTML = `
                <button class="mode-btn green" onclick="prepareStart('${date}', '${p.id}')" style="width: 100%; padding: 16px; font-size: 16px; font-weight: bold; border-radius: 14px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); margin-bottom: 10px;">
                    Starta ${p.name} 🔥
                </button>`;
        }
    } 
    // 4. Om man valde Vila
    else {
        // Tänd Vila-knappen
        const restBtn = document.getElementById('btn-ovr-none');
        if(restBtn) restBtn.classList.add('active-choice');
        
        // Uppdatera texten i statuskortet till Vila
        if(statusTextElem) statusTextElem.textContent = "🧘 Planerad Vila";
        
        // Dölj startknappen eftersom det är vila
        if(btnContainer) btnContainer.innerHTML = "";
    }
    
    // Uppdatera kalendern i bakgrunden så det stämmer när vi stänger fönstret
    renderCalendar(false); 
}

function startFreeWorkoutOnDate(date) {
    const freePass = { id: "free-" + Date.now(), name: "Fritt Pass", exercises: [] };
    startWorkout(freePass, null, date, true); 
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

function renderExercisePickerForEdit(idx, category = "Ben") {
    const container = document.getElementById("modal-exercise-picker-container");
    if (!container) return;

    const categories = [
        { name: "Ben", icon: "🦵" },
        { name: "Bröst", icon: "🏋️" },
        { name: "Rygg", icon: "🪵" },
        { name: "Axlar", icon: "👐" },
        { name: "Armar", icon: "💪" },
        { name: "Bål", icon: "🧘" }
    ];

    let html = `<div class="separator" style="margin: 25px 0;"></div>`;
    html += `<h3 style="margin: 0 0 15px 0; color: var(--primary); font-size: 1.2rem; text-align: center; text-transform: uppercase; letter-spacing: 1px;">LÄGG TILL ÖVNING</h3>`;
    html += `<p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center; margin-bottom:10px;">Välj Kategori:</p>`;
    
    html += `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:15px;">`;
    categories.forEach(cat => {
        const isActive = cat.name === category;
        html += `
            <button onclick="renderExercisePickerForEdit(${idx}, '${cat.name}')" 
                style="padding:10px 5px; font-size:11px; border-radius:12px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; 
                background:${isActive ? 'rgba(34, 211, 238, 0.1)' : 'var(--card)'}; color:${isActive ? 'var(--primary)' : 'white'}; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px;">
                <span style="font-size:16px;">${cat.icon}</span> ${cat.name}
            </button>`;
    });
    html += `</div>`;

    html += `<p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center; margin-bottom:10px;">Övningar (${category}):</p>`;
    // Punkt 5: Ändrat max-height till 400px för att se 5-6 övningar
    html += `<div style="max-height:400px; overflow-y:auto; padding-right:5px; background:rgba(0,0,0,0.2); border-radius:15px; padding:10px;">`;
    
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    
    if (filtered.length === 0) {
        html += `<p style="text-align:center; font-size:12px; color:var(--text-light); padding:10px;">Inga övningar hittades.</p>`;
    }

    filtered.forEach(ex => {
        html += `
        <div class="card glass" style="padding:12px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:12px;" onclick="addExerciseToPassDirectly(${idx}, ${ex.id})">
            <span style="font-size:13px; font-weight:600;">${ex.name}</span>
            <span style="color:var(--primary); font-weight:800; font-size:18px;">+</span>
        </div>`;
    });
    html += `</div>`;

    container.innerHTML = html;
}

function addExerciseToPassDirectly(pIdx, exId) {
    const ex = masterExercises.find(e => e.id == exId);
    if (!ex) return;
    programData.routine[pIdx].exercises.push({ name: ex.name, target: ex.target, defaultSets: 3 });
    openEditProgramModal(pIdx); 
}

function openEditProgramModal(idx) {
    const pass = programData.routine[idx];
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <h3>Redigera ${pass.name}</h3>
        <label style="font-size:12px; color:var(--text-light); text-align:left; display:block; margin-left:10px;">NAMN PÅ PASS</label>
        <input type="text" id="edit-pass-name" class="log-input" value="${pass.name}">
        
        <p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center; margin-bottom:10px;">Nuvarande övningar:</p>
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

        <div id="modal-exercise-picker-container"></div>

        <div style="margin-top:15px;">
            <button class="mode-btn glass-border" style="font-size:13px; padding:10px;" onclick="createNewExForPass(${idx})">+ Skapa helt ny övning till banken</button>
        </div>

        <button class="mode-btn blue" style="margin-top:20px;" onclick="saveProgramEdit(${idx})">Spara alla ändringar</button>
        <button class="mode-btn" style="color:var(--danger); background:none; font-size:14px; margin-top:10px;" onclick="deleteEntireProgram(${idx})">Radera pass permanent</button>
    `;
    
    renderExercisePickerForEdit(idx, "Ben");
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
    if(!activeDraft || !activeDraft.secondsElapsed) {
        secondsElapsed = 0;
    } else {
        secondsElapsed = activeDraft.secondsElapsed;
    }
    
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
        isStarted: true, 
        wasTimerRunning: true 
    };
    
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    updateTimerDisplay();
    startTimer(); 
}

function renderActiveWorkout() {
    // --- START: Din befintliga logik (RÖR EJ) ---
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    const list = document.getElementById("exercise-list");
    const footer = document.querySelector(".workout-footer");
    list.innerHTML = "";

    if(!activeDraft.isStarted) {
        footer.classList.add("hidden");
        list.innerHTML = `
            <div style="text-align:center; padding:20px 0;">
                <button class="mode-btn green" style="width:100%; padding:20px; font-size:18px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>
            </div>
            <p style="color:var(--text-light); font-size:13px; text-align:center; margin-top:10px;">Klicka på knappen ovan för att starta klockan.</p>
        `;
        document.getElementById("workout-timer").textContent = "00:00:00";
        showView("workout-view");
        return;
    }

    footer.classList.remove("hidden");
    const pauseBtn = document.getElementById("pause-workout-btn");
    pauseBtn.innerHTML = `Spara utkast 💾`;
    pauseBtn.className = "mode-btn save-draft-btn";
    // --- SLUT: Din befintliga logik ---

    // HÄR ÄR UPPDATERINGEN: Vi hämtar en lista (array) istället för ett enskilt index
    const openExercises = activeDraft.ui_state?.openExercises || [];

    activeDraft.workout.exercises.forEach((ex, i) => {
        const exerciseData = activeDraft.data[i];
        const isDone = exerciseData.isCompleted;
        
        // HÄR ÄR UPPDATERINGEN: Vi kollar om nuvarande index finns i listan över öppna
        const isOpen = openExercises.includes(i);
        
        const div = document.createElement("div");
        div.className = "card glass" + (isDone ? " exercise-done" : "");
        div.style.padding = "0"; 
        div.style.overflow = "hidden";
        
        const completedSets = exerciseData.sets_data.filter(s => s.userConfirmed).length;
        const totalSets = exerciseData.sets_data.length;

        let setsHtml = `<div style="margin-top:10px;">
            <div style="display:grid; grid-template-columns: 40px 1fr 1fr 30px; gap:8px; margin-bottom:5px; align-items:center;">
                <small style="text-align:center; color:var(--text-light); font-size:9px;">SET</small>
                <small style="text-align:center; color:var(--text-light); font-size:9px;">KG</small>
                <small style="text-align:center; color:var(--text-light); font-size:9px;">REPS</small>
                <span></span>
            </div>`;

        exerciseData.sets_data.forEach((set, sIdx) => {
            let isLocked = false;
            let isCurrent = false;
            if (sIdx > 0 && !isDone) {
                const prevSet = exerciseData.sets_data[sIdx - 1];
                if (!prevSet.userConfirmed) isLocked = true;
            }
            if (isDone) isLocked = true;
            if (!set.userConfirmed && !isLocked && !isDone) isCurrent = true;

            const showSuccess = set.userConfirmed || isDone;
            let circleColor = showSuccess ? '#22c55e' : (isCurrent ? '#facc15' : '#f59e0b');
            const statusContent = showSuccess ? '✅' : `#${sIdx + 1}`;

            setsHtml += `
            <div style="display:grid; grid-template-columns: 40px 1fr 1fr 30px; gap:8px; margin-bottom:8px; align-items:center;">
                <div onclick="${isLocked && !isDone ? '' : `confirmSet(${i}, ${sIdx})`}" 
                     style="width:32px; height:32px; border-radius:50%; border:2px solid ${circleColor}; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:10px; font-weight:800; background: ${showSuccess ? 'rgba(34, 197, 94, 0.2)' : (isCurrent ? 'rgba(250, 204, 21, 0.15)' : 'rgba(245, 158, 11, 0.05)')}; color: ${circleColor}; opacity: 1;">
                    ${statusContent}
                </div>
                <input type="text" inputmode="decimal" id="w-${i}-${sIdx}" class="log-input" style="margin:0; padding:12px; font-size:18px; opacity: ${isCurrent ? '1' : '0.3'};" value="${set.weight || ''}" ${isLocked ? 'readonly' : ''} oninput="updateSetDataOnly(${i}, ${sIdx})">
                <input type="text" inputmode="decimal" id="r-${i}-${sIdx}" class="log-input" style="margin:0; padding:12px; font-size:18px; opacity: ${isCurrent ? '1' : '0.3'};" value="${set.reps || ''}" ${isLocked ? 'readonly' : ''} oninput="updateSetDataOnly(${i}, ${sIdx})">
                <button onclick="removeSetFromExercise(${i}, ${sIdx})" style="background:none; border:none; color:var(--danger); font-size:16px; opacity: ${isLocked || showSuccess ? '0.1' : '0.8'};" ${isLocked ? 'disabled' : ''}>×</button>
            </div>`;
        });

        div.innerHTML = `
        <div onclick="toggleExercise(${i})" style="padding: 12px 15px; display: flex; align-items: center; cursor: pointer; background: ${isOpen ? 'rgba(250, 204, 21, 0.05)' : 'transparent'}">
            
            <div style="display: flex; gap: 4px; margin-right: 12px; flex-shrink: 0;">
                <button class="reorder-btn" onclick="event.stopPropagation(); moveActiveExercise(${i}, -1)" ${isDone ? 'disabled' : ''} style="padding: 4px 6px; font-size: 10px;">▲</button>
                <button class="reorder-btn" onclick="event.stopPropagation(); moveActiveExercise(${i}, 1)" ${isDone ? 'disabled' : ''} style="padding: 4px 6px; font-size: 10px;">▼</button>
            </div>

            <div style="display: flex; flex-direction: column; min-width:0; flex-grow:1;">
                <strong style="font-size: 14px; color: ${isDone ? 'var(--text-light)' : 'var(--text)'}; text-decoration: ${isDone ? 'line-through' : 'none'}; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                    ${ex.name}
                </strong>
                <small style="color: ${isDone ? '#22c55e' : 'var(--primary)'}; font-size: 10px;">
                    ${isDone ? 'KLAR ✅' : `${completedSets}/${totalSets} set`}
                </small>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0; margin-left: 10px;">
                <button onclick="event.stopPropagation(); openReplaceExerciseModal(${i})" style="background:none; border:none; font-size:14px; padding:5px; opacity: 0.7;" ${isDone ? 'disabled' : ''}>🔄</button>
                <button onclick="event.stopPropagation(); removeActiveExercise(${i})" style="background:none; border:none; font-size:14px; padding:5px; opacity: 0.7;" ${isDone ? 'disabled' : ''}>✖</button>
                <span style="font-size: 10px; color: var(--text-light); margin-left: 5px; transform: ${isOpen ? 'rotate(180deg)' : 'rotate(0)'}; transition: 0.3s;">▼</span>
            </div>
        </div>

        <div style="padding: 0 15px 15px 15px; display: ${isOpen ? 'block' : 'none'}; border-top: 1px solid rgba(255,255,255,0.05);">
            ${setsHtml}
            <button class="mode-btn glass-border" style="padding:8px; font-size:11px; margin-top:10px; border-style:dashed; width:100%;" onclick="addSetToExercise(${i})" ${isDone ? 'disabled' : ''}>+ Lägg till set</button>
            <button class="mode-btn ${isDone ? 'blue' : 'green'}" style="padding:12px; font-size:13px; margin-top:15px; width:100%; font-weight:bold;" onclick="toggleExerciseDone(${i})">
                ${isDone ? 'Ångra Klar ↩️' : 'Markera övning som klar ✅'}
            </button>
        </div>`;
        
        list.appendChild(div);
    });

    // --- Slutknappar ---
    const addBtn = document.createElement("button");
    addBtn.className = "mode-btn glass-border";
    addBtn.style.marginTop = "10px";
    addBtn.innerHTML = "➕ Lägg till övning";
    addBtn.onclick = openAddExerciseToWorkoutModal;
    list.appendChild(addBtn);

    const discardBtn = document.createElement("button");
    discardBtn.className = "mode-btn";
    discardBtn.style.cssText = "background:none; color:var(--danger); font-size:14px; margin-top:20px; border:1px solid rgba(239, 68, 68, 0.2);";
    discardBtn.innerHTML = "Radera pass 🗑️";
    discardBtn.onclick = confirmDiscardActiveWorkout;
    list.appendChild(discardBtn);

    showView("workout-view");
}

// Denna sparar bara siffrorna medan du skriver (ingen omladdning = inget hoppande tangentbord)
function updateSetDataOnly(exIdx, setIdx) {
    const wVal = document.getElementById(`w-${exIdx}-${setIdx}`).value;
    const rVal = document.getElementById(`r-${exIdx}-${setIdx}`).value;
    activeDraft.data[exIdx].sets_data[setIdx].weight = wVal;
    activeDraft.data[exIdx].sets_data[setIdx].reps = rVal;
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
}

function confirmSet(exIdx, setIdx) {
    // 1. Spara nuvarande rullningsposition
    const scrollPos = window.scrollY;

    const currentState = activeDraft.data[exIdx].sets_data[setIdx].userConfirmed;
    activeDraft.data[exIdx].sets_data[setIdx].userConfirmed = !currentState;
    
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    
    // 2. Rita om vyn
    renderActiveWorkout();

    // 3. Hoppa direkt tillbaka till där du var
    window.scrollTo(0, scrollPos);
}

function toggleExercise(index) {
    const scrollPos = window.scrollY;
    
    if (!activeDraft.ui_state) activeDraft.ui_state = {};
    // Säkerställ att vi har en array för öppna övningar
    if (!activeDraft.ui_state.openExercises) {
        activeDraft.ui_state.openExercises = [];
    }

    const openIdx = activeDraft.ui_state.openExercises.indexOf(index);

    if (openIdx > -1) {
        // Om den finns -> ta bort (stäng)
        activeDraft.ui_state.openExercises.splice(openIdx, 1);
    } else {
        // Om den inte finns -> lägg till (öppna)
        activeDraft.ui_state.openExercises.push(index);
    }

    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    renderActiveWorkout();
    window.scrollTo(0, scrollPos);
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
    
    const categories = [
        { name: "Ben", icon: "🦵" },
        { name: "Bröst", icon: "🏋️" },
        { name: "Rygg", icon: "🪵" },
        { name: "Axlar", icon: "👐" },
        { name: "Armar", icon: "💪" },
        { name: "Bål", icon: "🧘" }
    ];
    
    let html = `<h3>${replaceIndex !== null ? 'Byt ut övning' : 'Välj Övning'}</h3>`;
    html += `<p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center; margin-bottom:10px;">Välj Kategori:</p>`;
    
    html += `<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px; margin-bottom:15px;">`;
    categories.forEach(cat => {
        const isActive = cat.name === category;
        html += `
            <button onclick="renderExercisePicker('${cat.name}', ${replaceIndex})" 
                style="padding:10px 5px; font-size:11px; border-radius:12px; border:1px solid ${isActive ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; 
                background:${isActive ? 'rgba(34, 211, 238, 0.1)' : 'var(--card)'}; color:${isActive ? 'var(--primary)' : 'white'}; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px;">
                <span style="font-size:16px;">${cat.icon}</span> ${cat.name}
            </button>`;
    });
    html += `</div>`;
    
    html += `<p style="font-size:11px; text-transform:uppercase; color:var(--text-light); text-align:center; margin-bottom:10px;">Övningar (${category}):</p>`;
    // Punkt 5: Även här 400px
    html += `<div style="max-height:400px; overflow-y:auto; padding-right:5px; background:rgba(0,0,0,0.2); border-radius:15px; padding:10px; margin-bottom:15px;">`;
    
    const filtered = masterExercises.filter(ex => category === "Armar" ? (ex.target === "Biceps" || ex.target === "Triceps") : ex.target === category);
    
    if (filtered.length === 0) {
        html += `<p style="text-align:center; font-size:12px; color:var(--text-light); padding:10px;">Inga övningar hittades.</p>`;
    }

    filtered.forEach(ex => {
        html += `
        <div class="card glass" style="padding:12px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:12px;" onclick="confirmAddExerciseToActive(${ex.id}, ${replaceIndex})">
            <span style="font-size:13px; font-weight:600;">${ex.name}</span>
            <span style="color:var(--primary); font-size:18px;">${replaceIndex !== null ? '🔄' : '+'}</span>
        </div>`;
    });
    html += `</div>`;

    html += `
        <div class="separator" style="margin:15px 0;"></div>
        <button class="mode-btn glass-border" style="font-size:13px;" onclick="openCreateExerciseModal((newEx) => handleInstantExerciseCreated(newEx, ${replaceIndex}))">+ Skapa ny övning som inte finns</button>
    `;
    
    body.innerHTML = html;
}

function handleInstantExerciseCreated(newEx, replaceIndex = null) {
    confirmAddExerciseToActive(newEx.id, replaceIndex);
}

function confirmAddExerciseToActive(exId, replaceIndex = null) {
    const ex = masterExercises.find(e => e.id == exId);
    const newExObj = { name: ex.name, target: ex.target };
    
    let newDataEntry;
    const history = getExerciseHistory(ex.name);
    if(history) {
        newDataEntry = { sets_data: JSON.parse(JSON.stringify(history)), isCompleted: false };
    } else {
        newDataEntry = { sets_data: [{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }], isCompleted: false };
    }

    if(replaceIndex !== null) {
        activeDraft.workout.exercises[replaceIndex] = newExObj;
        activeDraft.data[replaceIndex] = newDataEntry;
    } else {
        activeDraft.workout.exercises.push(newExObj);
        activeDraft.data.push(newDataEntry);
    }
    
    localStorage.setItem("activeWorkoutDraft", JSON.stringify(activeDraft));
    closeModal();
    renderActiveWorkout();
}

function moveActiveExercise(i, dir) {
    const newIdx = i + dir;
    if(newIdx < 0 || newIdx >= activeDraft.workout.exercises.length) return;
    [activeDraft.workout.exercises[i], activeDraft.workout.exercises[newIdx]] = [activeDraft.workout.exercises[newIdx], activeDraft.workout.exercises[i]];
    [activeDraft.data[i], activeDraft.data[newIdx]] = [activeDraft.data[newIdx], activeDraft.data[i]];
    renderActiveWorkout();
}

function removeActiveExercise(i) {
    if(confirm("Ta bort övningen?")) {
        activeDraft.workout.exercises.splice(i, 1);
        activeDraft.data.splice(i, 1);
        renderActiveWorkout();
    }
}

// --- STANDARD-LOGIK ---
document.getElementById("global-home").onclick = () => {
    location.reload();
}

document.getElementById("start-new-btn").onclick = () => renderCalendar(true);
document.getElementById("calendar-mode").onclick = () => renderCalendar(false);
document.getElementById("view-exercises-btn").onclick = () => { showView("exercises-view"); filterExercises(currentExerciseCategory); };
document.getElementById("view-programs-btn").onclick = () => renderProgramView();
document.getElementById("stats-mode").onclick = renderStats;
document.getElementById("add-custom-pass-btn").onclick = openCreateProgramModal;

function renderHome() {
    showView("home-view");
    
    // Punkt 1: Permanent avgränsande linje på startsidan
    const homeView = document.getElementById("home-view");
    const headerP = homeView.querySelector("header p");
    
    // Ta bort ev gamla kopior först för att undvika dubletter vid omladdning
    homeView.querySelectorAll(".home-separator").forEach(s => s.remove());
    
    if (headerP) {
        const sep = document.createElement("div");
        sep.className = "separator home-separator";
        sep.style.margin = "25px 0";
        headerP.after(sep);
    }

    if(activeDraft) {
        document.getElementById("draft-alert").classList.remove("hidden");
        document.getElementById("start-new-btn").classList.add("hidden");
        document.getElementById("resume-workout-btn").onclick = () => startWorkout(activeDraft.workout, activeDraft.data, activeDraft.date);
    } else {
        document.getElementById("start-new-btn").classList.remove("hidden");
        document.getElementById("draft-alert").classList.add("hidden");
    }
}

document.getElementById("save-workout-btn").onclick = () => {
    if(!activeDraft.isStarted) {
        const body = document.getElementById("modal-body");
        body.innerHTML = `
            <h3>Kasta träningspass</h3>
            <p style="text-align:center; color:var(--text-light);">Du har inte startat passet än. Vill du radera utkastet?</p>
            <button class="mode-btn danger" style="background:var(--danger);" onclick="localStorage.removeItem('activeWorkoutDraft'); location.reload();">Kasta passet</button>
            <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
        `;
        openModal();
        return;
    }

    pauseTimer();
    const finalTime = document.getElementById("workout-timer").textContent;
    
    const log = {
        date: activeDraft.date,
        programName: activeDraft.workout.name,
        totalTime: finalTime,
        exercises: activeDraft.workout.exercises.map((ex, i) => {
            return {
                name: ex.name,
                sets_data: activeDraft.data[i].sets_data 
            };
        })
    };
    
    workoutHistory.push(log);
    saveAll();
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null; 
    secondsElapsed = 0;
    renderCalendar();
};

document.getElementById("pause-workout-btn").onclick = () => { 
    location.reload(); 
};

function renderStats() {
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    const months = {};
    workoutHistory.forEach(w => { const m = w.date.substring(0, 7); months[m] = (months[m] || 0) + 1; });
    Object.entries(months).sort().forEach(([m, val]) => {
        const bar = document.createElement("div");
        bar.className = "chart-bar";
        bar.style.height = (val * 20) + "px";
        bar.innerHTML = `<span style="position:absolute; top:-20px; width:100%; text-align:center; font-size:10px;">${val}</span>`;
        container.appendChild(bar);
    });
    showView("stats-view");
}

function changeMonth(off) { currentViewDate.setMonth(currentViewDate.getMonth() + off); renderCalendar(); }
function setOverride(date, val) { calendarOverrides[date] = val; saveAll(); closeModal(); renderCalendar(); }

function prepareStart(date, id) { 
    const p = programData.routine.find(x => x.id === id); 
    closeModal(); 
    startWorkout(p, null, date, true); 
}

function deleteLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    workoutHistory = workoutHistory.filter(w => w !== item);
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null; 
    saveAll(); closeModal(); renderCalendar();
}

function editLoggedWorkout(date, idx) {
    const filtered = workoutHistory.filter(w => w.date === date);
    const item = filtered[idx];
    
    let savedSeconds = 0;
    if(item.totalTime) {
        const parts = item.totalTime.split(':');
        savedSeconds = (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
    }

    const workoutObj = { id: "edit-" + Date.now(), name: item.programName, exercises: item.exercises.map(ex => ({ name: ex.name })) };
    
    const dataObj = item.exercises.map(ex => {
        if(ex.sets_data) return { sets_data: ex.sets_data, isCompleted: true };
        return { sets_data: Array(parseInt(ex.sets || 1)).fill({ weight: ex.weight, reps: ex.reps }), isCompleted: true };
    });

    workoutHistory = workoutHistory.filter(w => w !== item);
    localStorage.removeItem("activeWorkoutDraft");
    activeDraft = null;
    closeModal();
    
    secondsElapsed = savedSeconds;
    activeDraft = {
        workout: workoutObj,
        data: dataObj,
        date: date,
        secondsElapsed: savedSeconds,
        isStarted: true,
        wasTimerRunning: false
    };
    renderActiveWorkout();
    updateTimerDisplay();
    showView("workout-view");
}

function openConfirmDeleteModal(date, idx) {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <div style="text-align:center; padding:10px;">
            <div style="font-size:40px; margin-bottom:15px;">🗑️</div>
            <h3>Radera passet?</h3>
            <p style="color:var(--text-light); margin-bottom:25px;">Detta pass kommer att tas bort permanent från din historik.</p>
            <button class="mode-btn" style="background:var(--danger); color:white; margin-bottom:12px;" onclick="deleteLoggedWorkout('${date}', ${idx})">Ja, radera</button>
            <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
        </div>
    `;
    openModal();
}

function confirmDiscardActiveWorkout() {
    const body = document.getElementById("modal-body");
    body.innerHTML = `
        <div style="text-align:center; padding:10px;">
            <div style="font-size:40px; margin-bottom:15px;">⚠️</div>
            <h3>Radera passet?</h3>
            <p style="color:var(--text-light); margin-bottom:25px;">Allt pågående arbete i detta pass kommer att raderas.</p>
            <button class="mode-btn" style="background:var(--danger); color:white; margin-bottom:12px;" onclick="localStorage.removeItem('activeWorkoutDraft'); location.reload();">Ja, radera!</button>
            <button class="mode-btn glass-border" onclick="closeModal()">Avbryt</button>
        </div>
    `;
    openModal();
}
