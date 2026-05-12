let exercises = JSON.parse(localStorage.getItem("exercises")) || [];
let workoutPrograms = JSON.parse(localStorage.getItem("workoutPrograms")) || [];
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory")) || [];
let activeDraft = JSON.parse(localStorage.getItem("activeDraft")) || null;
let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedCategory = null;

function saveData() {
    localStorage.setItem("exercises", JSON.stringify(exercises));
    localStorage.setItem("workoutPrograms", JSON.stringify(workoutPrograms));
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    localStorage.setItem("activeDraft", JSON.stringify(activeDraft));
}

function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(viewId).classList.remove("hidden");
}

document.getElementById("global-home").onclick = () => {
    if(activeDraft && activeDraft.isStarted) {
        if(confirm("Du har ett pågående pass. Vill du gå tillbaka till hemskärmen? (Passet sparas som utkast)")) {
            saveData();
            renderHome();
        }
    } else {
        renderHome();
    }
};

document.getElementById("start-new-btn").onclick = () => {
    openWorkoutSelector();
};

document.getElementById("view-exercises-btn").onclick = () => {
    selectedCategory = null;
    renderExercises();
};

document.getElementById("view-programs-btn").onclick = () => {
    renderPrograms();
};

document.getElementById("calendar-mode").onclick = () => {
    renderCalendar();
};

document.getElementById("stats-mode").onclick = () => {
    renderStats();
};

document.getElementById("add-custom-pass-btn").onclick = () => {
    openCreateProgramModal();
};

document.getElementById("save-workout-btn").onclick = () => {
    saveWorkout();
};

document.getElementById("timer-toggle-btn").onclick = () => {
    toggleTimer();
};

function toggleTimer() {
    if(!activeDraft) return;
    
    if(activeDraft.lockedTime) return;
    
    if(isTimerRunning) {
        pauseTimer();
        document.getElementById("timer-toggle-btn").innerHTML = "Starta ▶️";
        activeDraft.timerActive = false;
    } else {
        startTimer();
        document.getElementById("timer-toggle-btn").innerHTML = "Pausa ⏸️";
        activeDraft.timerActive = true;
    }
    saveData();
}

function startTimer() {
    if (isTimerRunning) return;
    if (activeDraft && activeDraft.lockedTime) return;
    
    isTimerRunning = true;
    timerInterval = setInterval(() => {
        secondsElapsed++;
        if(activeDraft) {
            activeDraft.secondsElapsed = secondsElapsed;
        }
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
}

function updateTimerDisplay() {
    const h = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    const display = document.getElementById("workout-timer");
    if(display) {
        display.textContent = `${h}:${m}:${s}`;
    }
}

function startWorkout(workout, data = null, date = null, isImmediateStart = false, lockedTime = null) {
    if(lockedTime) {
        const timeParts = lockedTime.split(":");
        secondsElapsed = (parseInt(timeParts[0]) * 3600) + (parseInt(timeParts[1]) * 60) + parseInt(timeParts[2]);
    } else if(!activeDraft || !activeDraft.secondsElapsed) {
        secondsElapsed = (activeDraft && activeDraft.secondsElapsed) ? activeDraft.secondsElapsed : 0;
    }
    
    if(!data) {
        data = workout.exercises.map(ex => {
            const history = getExerciseHistory(ex.name);
            if (history) {
                return { sets_JSON.parse(JSON.stringify(history)), isCompleted: false };
            }
            return { sets_[{ weight: "", reps: "" }, { weight: "", reps: "" }, { weight: "", reps: "" }], isCompleted: false };
        });
    }

    activeDraft = { 
        workout: JSON.parse(JSON.stringify(workout)), 
        data, 
        date: date || new Date().toISOString().split('T')[0],
        secondsElapsed: secondsElapsed,
        isStarted: isImmediateStart || (activeDraft ? activeDraft.isStarted : false),
        timerActive: isImmediateStart ? true : (activeDraft ? activeDraft.timerActive : false),
        lockedTime: lockedTime || null
    };
    
    renderActiveWorkout();
    updateTimerDisplay();

    if(activeDraft.isStarted && activeDraft.timerActive !== false && !lockedTime) {
        startTimer();
    } else {
        pauseTimer();
    }
}

function actuallyStartWorkout() {
    if(!activeDraft) return;
    activeDraft.isStarted = true;
    activeDraft.timerActive = true;
    saveData();
    startTimer();
    renderActiveWorkout();
}

function renderActiveWorkout() {
    if(!activeDraft) return;
    
    showView("workout-view");
    document.getElementById("active-title").textContent = activeDraft.workout.name;
    
    const list = document.getElementById("exercise-list");
    const footer = document.querySelector(".workout-footer");
    
    if(!activeDraft.isStarted) {
        footer.classList.add("hidden");
        
        list.innerHTML = "";
        
        activeDraft.workout.exercises.forEach((ex, exIdx) => {
            const card = document.createElement("div");
            card.className = "exercise-card";
            
            const exData = activeDraft.data[exIdx];
            const allChecked = exData.sets_data.every(set => set.checked);
            const checkmark = allChecked ? ' ✅' : '';
            
            card.innerHTML = `
                <h3>
                    <span>${ex.name}${checkmark}</span>
                    <button class="add-inline-btn" onclick="addSet(${exIdx})" style="width:32px; height:32px; font-size:20px;">+</button>
                </h3>
                <div id="sets-container-${exIdx}"></div>
            `;
            
            list.appendChild(card);
            
            const container = document.getElementById(`sets-container-${exIdx}`);
            exData.sets_data.forEach((set, setIdx) => {
                const row = document.createElement("div");
                row.className = "set-row";
                row.innerHTML = `
                    <input type="number" placeholder="Vikt (kg)" value="${set.weight}" onchange="updateSet(${exIdx}, ${setIdx}, 'weight', this.value)">
                    <input type="number" placeholder="Reps" value="${set.reps}" onchange="updateSet(${exIdx}, ${setIdx}, 'reps', this.value)">
                    <button class="check-btn ${set.checked ? 'checked' : ''}" onclick="toggleSetCheck(${exIdx}, ${setIdx})">${set.checked ? '✓' : ''}</button>
                `;
                container.appendChild(row);
            });
        });
        
        const startBtnWrapper = document.createElement("div");
        startBtnWrapper.style.cssText = "text-align:center; padding:30px 0 20px 0;";
        startBtnWrapper.innerHTML = `
            <button class="mode-btn green" style="width:100%; padding:20px; font-size:18px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3);" onclick="actuallyStartWorkout()">STARTA TRÄNINGSPASSET 🔥</button>
            <p style="color:var(--text-light); font-size:13px; text-align:center; margin-top:10px;">Klicka på knappen ovan för att starta klockan.</p>
        `;
        list.appendChild(startBtnWrapper);
        
        const discardDiv = document.createElement("div");
        discardDiv.style.cssText = "margin-top: 10px; padding-top: 20px; border-top: 1px solid var(--glass-border);";
        discardDiv.innerHTML = `<button class="mode-btn glass-border" style="color: var(--danger); border-color: var(--danger);" onclick="confirmDiscardActiveWorkout()">Kasta pass 🗑️</button>`;
        list.appendChild(discardDiv);
        
        document.getElementById("workout-timer").textContent = "00:00:00";
        return;
    }

    footer.classList.remove("hidden");
    
    const toggleBtn = document.getElementById("timer-toggle-btn");
    if(activeDraft.lockedTime) {
        toggleBtn.classList.add("btn-disabled");
        toggleBtn.innerHTML = "Låst 🔒";
    } else {
        toggleBtn.classList.remove("btn-disabled");
        toggleBtn.innerHTML = isTimerRunning ? "Pausa ⏸️" : "Starta ▶️";
    }
    
    list.innerHTML = "";
    
    activeDraft.workout.exercises.forEach((ex, exIdx) => {
        const card = document.createElement("div");
        card.className = "exercise-card";
        
        const exData = activeDraft.data[exIdx];
        const allChecked = exData.sets_data.every(set => set.checked);
        
        const checkmark = allChecked ? ' ✅' : '';
        
        card.innerHTML = `
            <h3>
                <span>${ex.name}${checkmark}</span>
                <button class="add-inline-btn" onclick="addSet(${exIdx})" style="width:32px; height:32px; font-size:20px;">+</button>
            </h3>
            <div id="sets-container-${exIdx}"></div>
        `;
        
        list.appendChild(card);
        
        const container = document.getElementById(`sets-container-${exIdx}`);
        exData.sets_data.forEach((set, setIdx) => {
            const row = document.createElement("div");
            row.className = "set-row";
            row.innerHTML = `
                <input type="number" placeholder="Vikt (kg)" value="${set.weight}" onchange="updateSet(${exIdx}, ${setIdx}, 'weight', this.value)">
                <input type="number" placeholder="Reps" value="${set.reps}" onchange="updateSet(${exIdx}, ${setIdx}, 'reps', this.value)">
                <button class="check-btn ${set.checked ? 'checked' : ''}" onclick="toggleSetCheck(${exIdx}, ${setIdx})">${set.checked ? '✓' : ''}</button>
            `;
            container.appendChild(row);
        });
    });
    
    const discardDiv = document.createElement("div");
    discardDiv.style.cssText = "margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--glass-border);";
    discardDiv.innerHTML = `<button class="mode-btn glass-border" style="color: var(--danger); border-color: var(--danger);" onclick="confirmDiscardActiveWorkout()">Kasta pass 🗑️</button>`;
    list.appendChild(discardDiv);
}

function addSet(exIdx) {
    if(!activeDraft) return;
    activeDraft.data[exIdx].sets_data.push({ weight: "", reps: "", checked: false });
    saveData();
    renderActiveWorkout();
}

function updateSet(exIdx, setIdx, field, value) {
    if(!activeDraft) return;
    activeDraft.data[exIdx].sets_data[setIdx][field] = value;
    saveData();
}

function toggleSetCheck(exIdx, setIdx) {
    if(!activeDraft) return;
    const set = activeDraft.data[exIdx].sets_data[setIdx];
    set.checked = !set.checked;
    saveData();
    renderActiveWorkout();
}

function saveWorkout() {
    if(!activeDraft) return;
    
    pauseTimer();
    
    const h = String(Math.floor(secondsElapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((secondsElapsed % 3600) / 60)).padStart(2, '0');
    const s = String(secondsElapsed % 60).padStart(2, '0');
    const timeStr = `${h}:${m}:${s}`;
    
    const workout = {
        id: Date.now(),
        name: activeDraft.workout.name,
        date: activeDraft.date,
        exercises: activeDraft.workout.exercises.map((ex, idx) => ({
            name: ex.name,
            sets: activeDraft.data[idx].sets_data
        })),
        duration: timeStr
    };
    
    workoutHistory.push(workout);
    activeDraft = null;
    secondsElapsed = 0;
    saveData();
    
    alert("Träningspass sparat! 🎉");
    renderHome();
}

function confirmDiscardActiveWorkout() {
    if(confirm("Är du säker på att du vill kasta detta träningspass?")) {
        activeDraft = null;
        secondsElapsed = 0;
        pauseTimer();
        saveData();
        renderHome();
    }
}

function getExerciseHistory(exerciseName) {
    for(let i = workoutHistory.length - 1; i >= 0; i--) {
        const w = workoutHistory[i];
        const ex = w.exercises.find(e => e.name === exerciseName);
        if(ex) {
            return ex.sets;
        }
    }
    return null;
}

function renderHome() {
    showView("home-view");
    const draftAlert = document.getElementById("draft-alert");
    const resumeBtn = document.getElementById("resume-workout-btn");
    
    if(activeDraft) {
        draftAlert.classList.remove("hidden");
        resumeBtn.onclick = () => {
            renderActiveWorkout();
        };
    } else {
        draftAlert.classList.add("hidden");
    }
}

function openWorkoutSelector() {
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    
    body.innerHTML = `<h2 class="section-title modern-header">Välj träningspass</h2>`;
    
    if(workoutPrograms.length === 0) {
        body.innerHTML += `<p style="text-align:center; color:var(--text-light);">Inga träningsprogram skapade än.</p>`;
    } else {
        const grid = document.createElement("div");
        grid.className = "program-modern-grid";
        workoutPrograms.forEach(prog => {
            const card = document.createElement("div");
            card.className = "program-card-modern";
            card.innerHTML = `
                <h3>${prog.name}</h3>
                <p>${prog.exercises.length} övningar</p>
            `;
            card.onclick = () => {
                startWorkout(prog, null, null, false);
                closeModal();
            };
            grid.appendChild(card);
        });
        body.appendChild(grid);
    }
    
    modal.classList.remove("hidden");
}

function closeModal() {
    document.getElementById("workout-modal").classList.add("hidden");
}

function renderExercises() {
    showView("exercises-view");
    
    document.querySelectorAll(".cat-btn").forEach(btn => {
        btn.classList.remove("active");
        if(btn.dataset.cat === selectedCategory) {
            btn.classList.add("active");
        }
    });
    
    const results = document.getElementById("exercise-results");
    results.innerHTML = "";
    
    const filtered = selectedCategory ? exercises.filter(e => e.category === selectedCategory) : exercises;
    
    if(filtered.length === 0) {
        results.innerHTML = `<p style="text-align:center; color:var(--text-light);">Inga övningar hittades.</p>`;
        return;
    }
    
    filtered.forEach(ex => {
        const item = document.createElement("div");
        item.className = "exercise-item";
        item.innerHTML = `
            <div>
                <h4>${ex.name}</h4>
                <p>${ex.category}</p>
            </div>
            <button class="add-inline-btn" onclick="event.stopPropagation(); deleteExercise('${ex.name}')">🗑️</button>
        `;
        results.appendChild(item);
    });
}

function filterExercises(cat) {
    if(selectedCategory === cat) {
        selectedCategory = null;
    } else {
        selectedCategory = cat;
    }
    renderExercises();
}

function openCreateExerciseModal() {
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    
    body.innerHTML = `
        <h2 class="section-title modern-header">Skapa ny övning</h2>
        <input id="new-ex-name" type="text" placeholder="Övningens namn" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.05); color:white; margin-bottom:15px; font-size:16px;">
        <select id="new-ex-cat" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.05); color:white; margin-bottom:15px; font-size:16px;">
            <option value="">Välj kategori</option>
            <option value="Ben">Ben</option>
            <option value="Bröst">Bröst</option>
            <option value="Rygg">Rygg</option>
            <option value="Axlar">Axlar</option>
            <option value="Armar">Armar</option>
            <option value="Bål">Bål</option>
        </select>
        <button class="mode-btn green" onclick="createExercise()">Skapa</button>
    `;
    
    modal.classList.remove("hidden");
}

function createExercise() {
    const name = document.getElementById("new-ex-name").value.trim();
    const cat = document.getElementById("new-ex-cat").value;
    
    if(!name || !cat) {
        alert("Fyll i både namn och kategori");
        return;
    }
    
    if(exercises.find(e => e.name === name)) {
        alert("En övning med det namnet finns redan");
        return;
    }
    
    exercises.push({ name, category: cat });
    saveData();
    closeModal();
    renderExercises();
}

function deleteExercise(name) {
    if(confirm(`Ta bort övningen "${name}"?`)) {
        exercises = exercises.filter(e => e.name !== name);
        saveData();
        renderExercises();
    }
}

function renderPrograms() {
    showView("programs-view");
    const list = document.getElementById("pass-selector-list");
    const detailsArea = document.getElementById("program-details-area");
    
    list.innerHTML = "";
    detailsArea.classList.add("hidden");
    
    if(workoutPrograms.length === 0) {
        list.innerHTML = `<p style="text-align:center; color:var(--text-light);">Inga träningsprogram än.</p>`;
        return;
    }
    
    workoutPrograms.forEach((prog, idx) => {
        const card = document.createElement("div");
        card.className = "program-card-modern";
        card.innerHTML = `
            <h3>${prog.name}</h3>
            <p>${prog.exercises.length} övningar</p>
            <div class="card-actions">
                <button class="btn-edit" onclick="event.stopPropagation(); editProgram(${idx})">Redigera</button>
                <button class="btn-delete" onclick="event.stopPropagation(); deleteProgram(${idx})">Ta bort</button>
            </div>
        `;
        card.onclick = () => {
            showProgramDetails(prog);
        };
        list.appendChild(card);
    });
}

function showProgramDetails(prog) {
    const detailsArea = document.getElementById("program-details-area");
    const exList = document.getElementById("program-exercise-list");
    
    exList.innerHTML = `<h3 class="modern-header">${prog.name}</h3>`;
    
    if(prog.exercises.length === 0) {
        exList.innerHTML += `<p style="color:var(--text-light);">Inga övningar i detta pass.</p>`;
    } else {
        prog.exercises.forEach(ex => {
            const div = document.createElement("div");
            div.style.cssText = "padding:10px 0; border-bottom: 1px solid var(--glass-border);";
            div.innerHTML = `<strong>${ex.name}</strong> <span style="color:var(--text-light); font-size:13px;">(${ex.category})</span>`;
            exList.appendChild(div);
        });
    }
    
    detailsArea.classList.remove("hidden");
}

function openCreateProgramModal() {
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    
    body.innerHTML = `
        <h2 class="section-title modern-header">Skapa träningspass</h2>
        <input id="new-prog-name" type="text" placeholder="Passnamn" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.05); color:white; margin-bottom:15px; font-size:16px;">
        <h3 style="margin-top:20px;">Välj övningar:</h3>
        <div id="exercise-picker" style="max-height:300px; overflow-y:auto;"></div>
        <button class="mode-btn green" style="margin-top:20px;" onclick="createProgram()">Skapa pass</button>
    `;
    
    const picker = document.getElementById("exercise-picker");
    
    if(exercises.length === 0) {
        picker.innerHTML = `<p style="color:var(--text-light);">Inga övningar tillgängliga. Skapa övningar först.</p>`;
    } else {
        exercises.forEach((ex, idx) => {
            const item = document.createElement("div");
            item.style.cssText = "padding:10px; margin-bottom:8px; background:var(--card); border:1px solid var(--glass-border); border-radius:12px; cursor:pointer;";
            item.innerHTML = `
                <label style="display:flex; align-items:center; cursor:pointer;">
                    <input type="checkbox" data-ex-idx="${idx}" style="margin-right:10px; width:20px; height:20px; cursor:pointer;">
                    <span><strong>${ex.name}</strong> <span style="color:var(--text-light); font-size:13px;">(${ex.category})</span></span>
                </label>
            `;
            picker.appendChild(item);
        });
    }
    
    modal.classList.remove("hidden");
}

function createProgram() {
    const name = document.getElementById("new-prog-name").value.trim();
    if(!name) {
        alert("Ange ett namn för passet");
        return;
    }
    
    const checked = document.querySelectorAll("#exercise-picker input[type='checkbox']:checked");
    if(checked.length === 0) {
        alert("Välj minst en övning");
        return;
    }
    
    const selectedExercises = [];
    checked.forEach(cb => {
        const idx = parseInt(cb.dataset.exIdx);
        selectedExercises.push(exercises[idx]);
    });
    
    workoutPrograms.push({ name, exercises: selectedExercises });
    saveData();
    closeModal();
    renderPrograms();
}

function editProgram(idx) {
    const prog = workoutPrograms[idx];
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    
    body.innerHTML = `
        <h2 class="section-title modern-header">Redigera pass</h2>
        <input id="edit-prog-name" type="text" value="${prog.name}" style="width:100%; padding:12px; border-radius:12px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.05); color:white; margin-bottom:15px; font-size:16px;">
        <h3 style="margin-top:20px;">Välj övningar:</h3>
        <div id="exercise-picker" style="max-height:300px; overflow-y:auto;"></div>
        <button class="mode-btn green" style="margin-top:20px;" onclick="saveEditedProgram(${idx})">Spara ändringar</button>
    `;
    
    const picker = document.getElementById("exercise-picker");
    
    if(exercises.length === 0) {
        picker.innerHTML = `<p style="color:var(--text-light);">Inga övningar tillgängliga.</p>`;
    } else {
        exercises.forEach((ex, exIdx) => {
            const isChecked = prog.exercises.some(e => e.name === ex.name);
            const item = document.createElement("div");
            item.style.cssText = "padding:10px; margin-bottom:8px; background:var(--card); border:1px solid var(--glass-border); border-radius:12px; cursor:pointer;";
            item.innerHTML = `
                <label style="display:flex; align-items:center; cursor:pointer;">
                    <input type="checkbox" data-ex-idx="${exIdx}" ${isChecked ? 'checked' : ''} style="margin-right:10px; width:20px; height:20px; cursor:pointer;">
                    <span><strong>${ex.name}</strong> <span style="color:var(--text-light); font-size:13px;">(${ex.category})</span></span>
                </label>
            `;
            picker.appendChild(item);
        });
    }
    
    modal.classList.remove("hidden");
}

function saveEditedProgram(idx) {
    const name = document.getElementById("edit-prog-name").value.trim();
    if(!name) {
        alert("Ange ett namn för passet");
        return;
    }
    
    const checked = document.querySelectorAll("#exercise-picker input[type='checkbox']:checked");
    if(checked.length === 0) {
        alert("Välj minst en övning");
        return;
    }
    
    const selectedExercises = [];
    checked.forEach(cb => {
        const exIdx = parseInt(cb.dataset.exIdx);
        selectedExercises.push(exercises[exIdx]);
    });
    
    workoutPrograms[idx] = { name, exercises: selectedExercises };
    saveData();
    close Modal();
    renderPrograms();
}

function deleteProgram(idx) {
    if(confirm("Ta bort detta träningspass?")) {
        workoutPrograms.splice(idx, 1);
        saveData();
        renderPrograms();
    }
}

function renderCalendar() {
    showView("calendar-view");
    const monthLabel = document.getElementById("month-label");
    const grid = document.getElementById("calendar-grid");
    
    const monthNames = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];
    monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    grid.innerHTML = "";
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    
    for(let i = startDay - 1; i >= 0; i--) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell other-month";
        cell.textContent = prevMonthDays - i;
        grid.appendChild(cell);
    }
    
    const today = new Date();
    const isCurrentMonth = (currentMonth === today.getMonth() && currentYear === today.getFullYear());
    
    for(let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        cell.textContent = day;
        
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if(isCurrentMonth && day === today.getDate()) {
            cell.classList.add("today");
        }
        
        const workout = workoutHistory.find(w => w.date === dateStr);
        if(workout) {
            cell.classList.add("completed");
        }
        
        if(activeDraft && activeDraft.date === dateStr) {
            cell.classList.add("ongoing");
        }
        
        cell.onclick = () => openDayModal(dateStr);
        
        grid.appendChild(cell);
    }
    
    const totalCells = startDay + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    
    for(let i = 1; i <= remainingCells; i++) {
        const cell = document.createElement("div");
        cell.className = "calendar-cell other-month";
        cell.textContent = i;
        grid.appendChild(cell);
    }
}

function changeMonth(delta) {
    currentMonth += delta;
    if(currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if(currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

function openDayModal(dateStr) {
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    
    const workout = workoutHistory.find(w => w.date === dateStr);
    const isDraft = activeDraft && activeDraft.date === dateStr;
    
    body.innerHTML = `<h2 class="section-title modern-header">${dateStr}</h2>`;
    
    if(workout) {
        body.innerHTML += `
            <div class="card glass" style="margin-bottom:15px;">
                <h3>${workout.name}</h3>
                <p style="color:var(--text-light); margin-bottom:15px;">Varaktighet: ${workout.duration}</p>
        `;
        
        workout.exercises.forEach(ex => {
            body.innerHTML += `<p style="margin:5px 0;"><strong>${ex.name}:</strong> ${ex.sets.length} set</p>`;
        });
        
        body.innerHTML += `
                <button class="mode-btn glass-border" style="margin-top:15px;" onclick="viewWorkoutDetails(${workout.id})">Visa detaljer</button>
                <button class="mode-btn glass-border" style="margin-top:10px; color:var(--danger); border-color:var(--danger);" onclick="deleteWorkout(${workout.id})">Ta bort pass</button>
            </div>
        `;
    } else if(isDraft) {
        body.innerHTML += `<p style="color:var(--warning); text-align:center;">Pågående träningspass</p>`;
        body.innerHTML += `<button class="mode-btn orange" onclick="closeModal(); renderActiveWorkout();">Fortsätt träning</button>`;
    } else {
        body.innerHTML += `<p style="color:var(--text-light); text-align:center;">Inget pass denna dag</p>`;
    }
    
    modal.classList.remove("hidden");
}

function viewWorkoutDetails(workoutId) {
    const workout = workoutHistory.find(w => w.id === workoutId);
    if(!workout) return;
    
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    
    body.innerHTML = `
        <h2 class="section-title modern-header">${workout.name}</h2>
        <p style="text-align:center; color:var(--text-light); margin-bottom:20px;">${workout.date} • ${workout.duration}</p>
    `;
    
    workout.exercises.forEach(ex => {
        body.innerHTML += `
            <div class="card glass" style="margin-bottom:15px;">
                <h3 style="margin-bottom:10px;">${ex.name}</h3>
        `;
        
        ex.sets.forEach((set, idx) => {
            const checkmark = set.checked ? '✅' : '';
            body.innerHTML += `<p style="margin:5px 0;">Set ${idx + 1}: ${set.weight}kg × ${set.reps} reps ${checkmark}</p>`;
        });
        
        body.innerHTML += `</div>`;
    });
    
    body.innerHTML += `<button class="mode-btn glass-border" style="margin-top:15px; color:var(--secondary); border-color:var(--secondary);" onclick="repeatWorkout(${workoutId})">Upprepa detta pass</button>`;
    body.innerHTML += `<button class="mode-btn glass-border" style="margin-top:10px; color:var(--danger); border-color:var(--danger);" onclick="deleteWorkout(${workoutId})">Ta bort pass</button>`;
}

function repeatWorkout(workoutId) {
    const workout = workoutHistory.find(w => w.id === workoutId);
    if(!workout) return;
    
    const program = {
        name: workout.name,
        exercises: workout.exercises.map(ex => ({ name: ex.name, category: "" }))
    };
    
    const data = workout.exercises.map(ex => ({
        sets_ex.sets.map(s => ({ weight: s.weight, reps: s.reps, checked: false })),
        isCompleted: false
    }));
    
    closeModal();
    startWorkout(program, data, new Date().toISOString().split('T')[0], false, workout.duration);
}

function deleteWorkout(workoutId) {
    if(confirm("Ta bort detta träningspass permanent?")) {
        workoutHistory = workoutHistory.filter(w => w.id !== workoutId);
        saveData();
        closeModal();
        renderCalendar();
    }
}

function renderStats() {
    showView("stats-view");
    
    const container = document.getElementById("chart-container");
    container.innerHTML = "";
    
    const monthCounts = {};
    
    workoutHistory.forEach(w => {
        const date = new Date(w.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    
    const sortedKeys = Object.keys(monthCounts).sort();
    
    if(sortedKeys.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-light);">Ingen träningshistorik än.</p>`;
        return;
    }
    
    const maxCount = Math.max(...Object.values(monthCounts));
    
    const chartDiv = document.createElement("div");
    chartDiv.style.cssText = "display:flex; align-items:flex-end; justify-content:space-around; height:250px; padding:20px 10px;";
    
    sortedKeys.forEach(key => {
        const count = monthCounts[key];
        const height = (count / maxCount) * 100;
        
        const bar = document.createElement("div");
        bar.style.cssText = `
            flex:1;
            max-width:60px;
            height:${height}%;
            background:linear-gradient(180deg, var(--primary), var(--secondary));
            border-radius:8px 8px 0 0;
            margin:0 5px;
            position:relative;
            display:flex;
            align-items:flex-end;
            justify-content:center;
            padding-bottom:5px;
            color:white;
            font-weight:700;
            font-size:14px;
        `;
        bar.textContent = count;
        
        const label = document.createElement("div");
        label.style.cssText = "text-align:center; font-size:11px; color:var(--text-light); margin-top:5px;";
        label.textContent = key;
        
        const wrapper = document.createElement("div");
        wrapper.style.cssText = "display:flex; flex-direction:column; align-items:center; flex:1;";
        wrapper.appendChild(bar);
        wrapper.appendChild(label);
        
        chartDiv.appendChild(wrapper);
    });
    
    container.appendChild(chartDiv);
}

renderHome();

function openMonthPicker() {
    const modal = document.getElementById("workout-modal");
    const body = document.getElementById("modal-body");
    
    body.innerHTML = `<h2 class="section-title modern-header">Välj månad</h2>`;
    
    const monthNames = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"];
    
    const yearDiv = document.createElement("div");
    yearDiv.style.cssText = "display:flex; justify-content:center; align-items:center; gap:20px; margin-bottom:20px;";
    yearDiv.innerHTML = `
        <button class="nav-arrow" onclick="changeYear(-1)">❮</button>
        <h3 id="year-picker-label" style="margin:0; min-width:80px; text-align:center;">${currentYear}</h3>
        <button class="nav-arrow" onclick="changeYear(1)">❯</button>
    `;
    body.appendChild(yearDiv);
    
    const monthGrid = document.createElement("div");
    monthGrid.style.cssText = "display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;";
    
    monthNames.forEach((name, idx) => {
        const btn = document.createElement("button");
        btn.className = "mode-btn glass-border";
        btn.style.cssText = "padding:15px; font-size:14px;";
        btn.textContent = name;
        
        if(idx === currentMonth) {
            btn.style.borderColor = "var(--primary)";
            btn.style.background = "rgba(34, 211, 238, 0.15)";
        }
        
        btn.onclick = () => {
            currentMonth = idx;
            closeModal();
            renderCalendar();
        };
        
        monthGrid.appendChild(btn);
    });
    
    body.appendChild(monthGrid);
    modal.classList.remove("hidden");
}

function changeYear(delta) {
    currentYear += delta;
    document.getElementById("year-picker-label").textContent = currentYear;
}

    

