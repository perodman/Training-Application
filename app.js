let programData;
let workoutHistory = JSON.parse(localStorage.getItem("workoutHistory") || "[]");

// 1. Hämta data
fetch("program.json")
    .then(r => r.json())
    .then(json => {
        programData = json;
        renderHome();
    });

// 2. Visa startsida och räkna ut nästa pass
function renderHome() {
    const lastWorkout = workoutHistory[workoutHistory.length - 1];
    let nextIndex = 0;
    
    if (lastWorkout) {
        const lastIdx = programData.routine.findIndex(p => p.id === lastWorkout.programId);
        nextIndex = (lastIdx + 1) % programData.routine.length;
    }
    
    const nextWorkout = programData.routine[nextIndex];
    document.getElementById("next-workout-name").textContent = nextWorkout.name;
    document.getElementById("start-workout-btn").onclick = () => startWorkout(nextWorkout);
    showView("home-view");
}

// 3. Starta träningsläge
function startWorkout(workout) {
    document.getElementById("active-workout-title").textContent = workout.name;
    const list = document.getElementById("exercise-list");
    list.innerHTML = "";

    workout.exercises.forEach((ex, i) => {
        const item = document.createElement("div");
        item.className = "exercise-item";
        item.innerHTML = `
            <strong>${ex.name}</strong>
            <div class="input-row">
                <input type="number" placeholder="Kg" id="w-${i}" class="log-input">
                <input type="number" placeholder="Reps" id="r-${i}" class="log-input">
                <input type="number" placeholder="Set" value="${ex.defaultSets}" id="s-${i}" class="log-input">
            </div>
        `;
        list.appendChild(item);
    });
    
    document.getElementById("save-workout-btn").onclick = () => saveWorkout(workout);
    showView("workout-view");
}

// 4. Spara till LocalStorage
function saveWorkout(workout) {
    const log = {
        date: new Date().toLocaleDateString(),
        programId: workout.id,
        exercises: workout.exercises.map((ex, i) => ({
            name: ex.name,
            weight: document.getElementById(`w-${i}`).value,
            reps: document.getElementById(`r-${i}`).value,
            sets: document.getElementById(`s-${i}`).value
        }))
    };
    
    workoutHistory.push(log);
    localStorage.setItem("workoutHistory", JSON.stringify(workoutHistory));
    renderHome();
}

// 5. Enkel statistik
function renderStats() {
    const container = document.getElementById("stats-content");
    const total = workoutHistory.length;
    container.innerHTML = `<h2>Totalt antal pass: ${total}</h2>`;
    
    workoutHistory.slice().reverse().forEach(w => {
        container.innerHTML += `<p><strong>${w.date}:</strong> ${w.exercises.length} övningar körda.</p>`;
    });
    showView("stats-view");
}

// Navigering
function showView(id) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

document.getElementById("global-home").onclick = () => renderHome();
document.getElementById("stats-mode").onclick = () => renderStats();
