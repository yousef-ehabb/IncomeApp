// State
let incomes = JSON.parse(localStorage.getItem('indriver_incomes')) || [];
let expenses = JSON.parse(localStorage.getItem('indriver_expenses')) || [];
let chartInstance = null;
let activeTab = 'weekly';
let dailyGoal = parseFloat(localStorage.getItem('indriver_daily_goal')) || 0;
let shiftActive = false;
let shiftStartTime = null;
let shiftStartIncome = 0;
let shiftTimerInterval = null;
let shiftHistory = JSON.parse(localStorage.getItem('indriver_shifts')) || [];

// DOM Elements
const inputEl = document.getElementById('income-input');
const listEl = document.getElementById('income-list');
const totalEl = document.getElementById('total-amount');
const modalEl = document.getElementById('confirm-modal');
const expenseInputEl = document.getElementById('expense-input');
const expenseListEl = document.getElementById('expense-list');
const totalExpensesEl = document.getElementById('total-expenses');
const netIncomeEl = document.getElementById('net-income');

// Initial Render
render();

// --- NEW: Reload Recovery ---
function showError(el) {
    el.classList.add('input-error');
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    setTimeout(() => el.classList.remove('input-error'), 400);
}

function showSuccess(el) {
    el.classList.add('input-success');
    setTimeout(() => el.classList.remove('input-success'), 400);
}

function addIncome(customAmount = null, suppressFocus = false) {
    const amountVal = customAmount !== null ? customAmount : inputEl.value;

    if (!amountVal || amountVal <= 0) {
        showError(inputEl);
        return;
    }

    const newIncome = {
        id: Date.now(),
        amount: parseFloat(amountVal),
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add to beginning of array
    incomes.unshift(newIncome);
    saveData();
    render();

    // Reset and feedback
    showSuccess(inputEl);
    inputEl.value = '';
    
    if (!suppressFocus) {
        inputEl.focus(); // Focus input automatically after each custom add
    } else {
        inputEl.blur(); // Force close keyboard if chip was tapped
    }
    
    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
}

let _chipCooldown = false;
// --- Undo State ---
let _undoState = null;
let _undoTimer = null;

function deleteIncome(id) {
    const index = incomes.findIndex(inc => inc.id === id);
    if (index === -1) return;
    const deleted = incomes.splice(index, 1)[0];
    saveData();
    render();
    showUndoToast(deleted, index, 'income');
    if (navigator.vibrate) navigator.vibrate(40);
}

function confirmClear() {
    if (incomes.length === 0) return;
    modalEl.classList.remove('hidden');
}

function closeModal() {
    modalEl.classList.add('hidden');
}

function clearAllData() {
    incomes = [];
    saveData();
    render();
    closeModal();
    if (navigator.vibrate) navigator.vibrate(50);
}

function saveData() {
    localStorage.setItem('indriver_incomes', JSON.stringify(incomes));
    localStorage.setItem('indriver_expenses', JSON.stringify(expenses));
}

function render() {
    // Calculate Totals
    const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = totalIncome - totalExpenses;
    
    // Update UI elements
    totalEl.textContent = totalIncome.toLocaleString() + ' EGP';
    totalExpensesEl.textContent = totalExpenses.toLocaleString() + ' EGP';
    netIncomeEl.textContent = netIncome.toLocaleString() + ' EGP';
    
    // Set net income color
    if (netIncome >= 0) {
        netIncomeEl.style.color = 'var(--primary-color)';
        netIncomeEl.classList.remove('negative');
    } else {
        netIncomeEl.style.color = 'var(--danger-color)';
        netIncomeEl.classList.add('negative');
    }

    // --- NEW: Compact Summary & Last Entry Widget Update ---
    const compactSummaryEl = document.querySelector('.compact-summary');
    if (compactSummaryEl) {
        const todayStr = new Date().toLocaleDateString();
        const todayRides = incomes.filter(inc => inc.date.startsWith(todayStr));
        const todayEarnings = todayRides.reduce((sum, item) => sum + item.amount, 0);

        const allEntries = [...incomes.map(i => ({...i, type: 'Fare'})), ...expenses.map(e => ({...e, type: 'Expense'}))].sort((a,b) => b.id - a.id);
        const lastEntry = allEntries[0];

        let lastEntryHTML = '<div class="empty-state" style="padding:10px;text-align:center;color:var(--text-secondary);">No recent activity</div>';
        if (lastEntry) {
            const isFare = lastEntry.type === 'Fare';
            
            let undoBtnHTML = '';
            if (shiftActive && shiftStartTime && lastEntry.id >= shiftStartTime) {
                undoBtnHTML = `
                <button onclick="undoLastEntry(${lastEntry.id}, '${lastEntry.type}')" 
                        style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:var(--text-secondary); padding:4px 10px; border-radius:12px; font-size:0.75rem; margin-top:8px; cursor:pointer; width: fit-content;"
                        onmousedown="this.style.opacity='0.5'" onmouseup="this.style.opacity='1'">
                    ✕ Undo
                </button>`;
            }

            lastEntryHTML = `
                <div class="last-entry-widget" style="display:flex; justify-content:space-between; align-items:center; padding:16px; background:#2C2C2C; border-radius:12px; border-left: 4px solid ${isFare ? 'var(--primary-color)' : 'var(--expense-color)'}">
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:700; font-size:1.1rem; color:${isFare ? 'var(--primary-color)' : 'var(--expense-color)'}">${lastEntry.amount} EGP</span>
                        <span style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">${isFare ? 'Fare added' : 'Expense: ' + lastEntry.category}</span>
                        ${undoBtnHTML}
                    </div>
                    <span style="font-size:0.85rem; color:var(--text-secondary); align-self:flex-start;">${lastEntry.date.split(' ')[1]}</span>
                </div>
            `;
        }

        compactSummaryEl.innerHTML = `
            <div class="daily-summary-widget" style="display:flex; gap:12px; margin-bottom:20px;">
                <div class="summary-col" style="flex:1; background:#2C2C2C; padding:16px; border-radius:12px; text-align:center;">
                    <span style="display:block; font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; margin-bottom:6px;">Today's Rides</span>
                    <strong style="font-size:1.4rem;">${todayRides.length}</strong>
                </div>
                <div class="summary-col" style="flex:1; background:#2C2C2C; padding:16px; border-radius:12px; text-align:center;">
                    <span style="display:block; font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase; margin-bottom:6px;">Today's Earnings</span>
                    <strong style="font-size:1.4rem; color:var(--primary-color)">${todayEarnings.toLocaleString()} <span style="font-size:0.9rem">EGP</span></strong>
                </div>
            </div>
            <div class="list-header" style="margin-bottom:12px;">
                <h3 style="font-size:0.9rem; color:var(--text-secondary); font-weight:600; text-transform:uppercase;">Last Logged Entry</h3>
            </div>
            ${lastEntryHTML}
        `;
    }
    
    // We intentionally bypass old `#income-list` and `#expense-list` updates.
    // The variables `listEl` and `expenseListEl` are securely cached in JS memory 
    // and can safely swallow any updates without crashing even if discarded from DOM.
    listEl.innerHTML = '';
    expenseListEl.innerHTML = '';
    
    // Update analytics if chart is initialized
    if (chartInstance) {
        renderAnalytics();
    }
    
    // Update goal tracking
    renderGoal();
}

// Allow Enter key to submit
inputEl.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        addIncome();
    }
});

expenseInputEl.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        addExpense();
    }
});

function exportCSV() {
if (localStorage.getItem('indriver_shift_start')) {
    shiftActive = true;
    shiftStartTime = parseInt(localStorage.getItem('indriver_shift_start'));
    shiftTimerInterval = setInterval(updateShiftTimer, 1000);
    updateShiftUI();
}

function startShift() {
    if (shiftActive) return;
    
    shiftActive = true;
    shiftStartTime = Date.now();
    
    localStorage.setItem('indriver_shift_start', shiftStartTime);
    shiftTimerInterval = setInterval(updateShiftTimer, 1000);
    
    updateShiftUI();
    if (navigator.vibrate) navigator.vibrate(50);
}

// --- Long-Press End Shift ---
let _endShiftHoldTimer = null;
let _shiftUndoState = null;
let _shiftUndoTimer = null;

function initEndShiftLongPress() {
    const btn = document.getElementById('shift-end-btn');

    function startHold(e) {
        if (!shiftActive || btn.disabled) return;
        e.preventDefault();

        btn.classList.add('holding');
        if (navigator.vibrate) navigator.vibrate(30);

        _endShiftHoldTimer = setTimeout(() => {
            btn.classList.remove('holding');
            btn.classList.add('end-confirmed');
            if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
            executeEndShift();
            setTimeout(() => btn.classList.remove('end-confirmed'), 600);
        }, 800);
    }

    function cancelHold() {
        if (_endShiftHoldTimer) {
            clearTimeout(_endShiftHoldTimer);
            _endShiftHoldTimer = null;
        }
        btn.classList.remove('holding');
    }

    btn.addEventListener('touchstart', startHold, { passive: false });
    btn.addEventListener('touchend', cancelHold);
    btn.addEventListener('touchcancel', cancelHold);
    btn.addEventListener('mousedown', startHold);
    btn.addEventListener('mouseup', cancelHold);
    btn.addEventListener('mouseleave', cancelHold);
}

function executeEndShift() {
    if (!shiftActive) return;

    clearInterval(shiftTimerInterval);

    const now = Date.now();
    const shiftDurationMs = now - shiftStartTime;
    const shiftDurationHours = shiftDurationMs / 3600000;

    const liveIncomes = incomes.filter(inc => inc.id >= shiftStartTime && inc.id <= now).reduce((sum, item) => sum + item.amount, 0);
    const liveExpenses = expenses.filter(exp => exp.id >= shiftStartTime && exp.id <= now).reduce((sum, item) => sum + item.amount, 0);
    const shiftNetEarnings = liveIncomes - liveExpenses;

    const hourlyRate = shiftDurationHours > 0 ? shiftNetEarnings / shiftDurationHours : 0;

    const shiftRecord = {
        id: now,
        startTime: shiftStartTime,
        endTime: now,
        durationMs: shiftDurationMs,
        earnings: shiftNetEarnings,
        hourlyRate: hourlyRate
    };

    // Save snapshot for undo
    _shiftUndoState = {
        shiftStartTime: shiftStartTime,
        shiftRecord: shiftRecord
    };

    shiftHistory.push(shiftRecord);
    localStorage.setItem('indriver_shifts', JSON.stringify(shiftHistory));
    localStorage.removeItem('indriver_shift_start');

    shiftActive = false;
    shiftStartTime = null;
    shiftTimerInterval = null;

    updateShiftUI();
    renderShiftHistory();

    showShiftUndoToast();
}

function showShiftUndoToast() {
    if (_shiftUndoTimer) clearTimeout(_shiftUndoTimer);

    const toastEl = document.getElementById('undo-toast');
    const textEl = toastEl.querySelector('.undo-toast-text');
    textEl.textContent = 'Shift ended';

    // Temporarily swap undo button handler
    const undoBtn = document.getElementById('undo-toast-btn');
    undoBtn.onclick = undoEndShift;

    toastEl.classList.remove('hidden', 'toast-exit');
    void toastEl.offsetWidth;
    toastEl.classList.add('toast-enter');

    _shiftUndoTimer = setTimeout(() => {
        dismissShiftUndoToast();
        _shiftUndoState = null;
    }, 5000);
}

function undoEndShift() {
    if (!_shiftUndoState) return;

    const { shiftStartTime: savedStart, shiftRecord } = _shiftUndoState;

    // Remove the shift record from history
    shiftHistory = shiftHistory.filter(s => s.id !== shiftRecord.id);
    localStorage.setItem('indriver_shifts', JSON.stringify(shiftHistory));

    // Restore active shift state
    shiftActive = true;
    shiftStartTime = savedStart;
    localStorage.setItem('indriver_shift_start', shiftStartTime);
    shiftTimerInterval = setInterval(updateShiftTimer, 1000);

    updateShiftUI();
    renderShiftHistory();
    dismissShiftUndoToast();
    _shiftUndoState = null;

    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
}

function dismissShiftUndoToast() {
    const toastEl = document.getElementById('undo-toast');
    toastEl.classList.remove('toast-enter');
    toastEl.classList.add('toast-exit');
    setTimeout(() => {
        toastEl.classList.add('hidden');
        toastEl.classList.remove('toast-exit');
        // Restore default undo handler
        document.getElementById('undo-toast-btn').onclick = undoDelete;
    }, 300);
    if (_shiftUndoTimer) {
        clearTimeout(_shiftUndoTimer);
        _shiftUndoTimer = null;
    }
}

function updateShiftTimer() {
    if (!shiftActive || shiftStartTime === null) return;
    
    const now = Date.now();
    const elapsed = now - shiftStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const formattedTime = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
    
    document.getElementById('shift-timer-display').textContent = formattedTime;
    
    // Live precise tracking of net earnings
    const liveIncomes = incomes.filter(inc => inc.id >= shiftStartTime && inc.id <= now).reduce((sum, item) => sum + item.amount, 0);
    const liveExpenses = expenses.filter(exp => exp.id >= shiftStartTime && exp.id <= now).reduce((sum, item) => sum + item.amount, 0);
    const currentShiftEarnings = liveIncomes - liveExpenses;
    
    const currentHourly = elapsed > 60000 ? (currentShiftEarnings / (elapsed / 3600000)) : 0;
    
    document.getElementById('shift-earnings-live').textContent = currentShiftEarnings.toLocaleString() + ' EGP';
    document.getElementById('shift-hourly-live').textContent = currentHourly.toFixed(0) + ' EGP/hr';
}

function updateShiftUI() {
    const startBtn = document.getElementById('shift-start-btn');
    const endBtn = document.getElementById('shift-end-btn');
    const timerRow = document.getElementById('shift-timer-row');
    
    if (shiftActive) {
        startBtn.disabled = true;
        startBtn.style.opacity = '0.4';
        endBtn.disabled = false;
        endBtn.style.opacity = '1';
        timerRow.style.display = 'flex';
    } else {
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        endBtn.disabled = true;
        endBtn.style.opacity = '0.4';
        timerRow.style.display = 'none';
        document.getElementById('shift-timer-display').textContent = '00:00:00';
        document.getElementById('shift-earnings-live').textContent = '0 EGP';
        document.getElementById('shift-hourly-live').textContent = '0 EGP/hr';
    }
}

function renderShiftHistory() {
    const historyList = document.getElementById('shift-history-list');
    
    if (shiftHistory.length === 0) {
        historyList.innerHTML = '<li class="empty-state">No completed shifts yet.</li>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    shiftHistory.slice().reverse().forEach(shift => {
        const li = document.createElement('li');
        li.className = 'shift-history-item';
        
        const startTime = new Date(shift.startTime);
        const formattedStart = startTime.toLocaleDateString() + ' ' + 
            startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const duration = Math.floor(shift.durationMs / 3600000) + 'h ' + 
            Math.floor((shift.durationMs % 3600000) / 60000) + 'm';

        // Filter exact incomes/expenses logged during this shift timer
        const shiftIncomes = incomes.filter(inc => inc.id >= shift.startTime && inc.id <= shift.endTime);
        const shiftExpenses = expenses.filter(exp => exp.id >= shift.startTime && exp.id <= shift.endTime);
        
        const totalExpenses = shiftExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Native HTML5 expand/collapse using <details> tag (no JS toggle needed)
        let detailsHTML = `<details style="margin-top: 12px; background:#1E1E1E; padding:8px 12px; border-radius:8px;">
            <summary style="cursor:pointer; color:var(--text-secondary); font-size:0.85rem; font-weight:600; outline:none;">
                View Log (${shiftIncomes.length} rides, ${shiftExpenses.length} expenses)
            </summary>
            <div class="history-nested-entries" style="margin-top:12px; border-top:1px solid #333; padding-top:10px;">`;
        
        shiftIncomes.forEach(inc => {
            detailsHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
                <span style="color:#FFF;">Fare <span style="color:var(--text-secondary);font-size:0.75rem;margin-left:6px">${inc.date.split(' ')[1]}</span></span>
                <span style="color:var(--primary-color);font-weight:700;">+${inc.amount} EGP</span>
            </div>`;
        });
        
        shiftExpenses.forEach(exp => {
            detailsHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem;">
                <span style="color:#FFF;">${exp.category} <span style="color:var(--text-secondary);font-size:0.75rem;margin-left:6px">${exp.date.split(' ')[1]}</span></span>
                <span style="color:var(--expense-color);font-weight:700;">-${exp.amount} EGP</span>
            </div>`;
        });
        
        if (shiftIncomes.length === 0 && shiftExpenses.length === 0) {
            detailsHTML += `<div style="color:var(--text-secondary); font-size:0.85rem; text-align:center; padding: 10px 0;">No logs during timer.</div>`;
        }
        
        detailsHTML += `</div></details>`;

        li.innerHTML = `
            <div class="shift-item-info" style="border-bottom: 1px solid #333; padding-bottom:12px; margin-bottom:12px;">
                <span class="shift-item-date" style="font-weight:700; font-size:1.1rem; color:#FFF;">${formattedStart}</span>
                <span class="shift-item-duration" style="background:#2C2C2C; padding:4px 10px; border-radius:30px; font-size:0.8rem; font-weight:600;">${duration}</span>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                <div style="display:flex; flex-direction:column; padding:10px; background:#1C2621; border-radius:8px;">
                    <span style="font-size:0.7rem; color:var(--primary-color); text-transform:uppercase; font-weight:700; opacity:0.8;">Net Earnings</span>
                    <span style="color:#FFF; font-weight:700; font-size:1.2rem; margin-top:4px;">${shift.earnings.toLocaleString()} <span style="font-size:0.8rem; color:var(--text-secondary)">EGP</span></span>
                </div>
                
                <div style="display:flex; flex-direction:column; padding:10px; background:#2A1F1F; border-radius:8px;">
                    <span style="font-size:0.7rem; color:var(--expense-color); text-transform:uppercase; font-weight:700; opacity:0.8;">Total Expenses</span>
                    <span style="color:#FFF; font-weight:700; font-size:1.2rem; margin-top:4px;">${totalExpenses.toLocaleString()} <span style="font-size:0.8rem; color:var(--text-secondary)">EGP</span></span>
                </div>
            </div>
            
            ${detailsHTML}
        `;
        
        fragment.appendChild(li);
    });
    
    historyList.innerHTML = '';
    historyList.appendChild(fragment);
}

expenseInputEl.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        addExpense();
    }
});

window.addEventListener('load', function() {
    initChart();
    renderAnalytics();
    renderGoal();
    renderShiftHistory();
    initEndShiftLongPress();
    
    // Recover active shift if exists
    if (localStorage.getItem('indriver_shift_start')) {
        shiftStartTime = parseInt(localStorage.getItem('indriver_shift_start'));
        shiftActive = true;
        shiftStartIncome = 0; // Cannot recover exact value, acceptable
        shiftTimerInterval = setInterval(updateShiftTimer, 1000);
        updateShiftUI();
    }
});

let currentExpenseCategory = 'Fuel';

function selectExpenseCategory(btnEl, category) {
    currentExpenseCategory = category;
    document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
    btnEl.classList.add('active');
    if (navigator.vibrate) navigator.vibrate(20);
}

function addExpense() {
    const amountVal = expenseInputEl.value;
    const category = currentExpenseCategory;

    if (!amountVal || amountVal <= 0) {
        showError(expenseInputEl);
        return;
    }

    const newExpense = {
        id: Date.now(),
        amount: parseFloat(amountVal),
        category: category,
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add to beginning of array
    expenses.unshift(newExpense);
    saveData();
    render();

    // Reset and feedback
    showSuccess(expenseInputEl);
    expenseInputEl.value = '';
    
    // Reset category visually and in state
    currentExpenseCategory = 'Fuel';
    const fuelPill = document.querySelector('.category-pill');
    if (fuelPill) {
        document.querySelectorAll('.category-pill').forEach(btn => btn.classList.remove('active'));
        fuelPill.classList.add('active');
    }
    
    expenseInputEl.focus(); // Faster subsequent entry
    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
}

function deleteExpense(id) {
    const index = expenses.findIndex(exp => exp.id === id);
    if (index === -1) return;
    const deleted = expenses.splice(index, 1)[0];
    saveData();
    render();
    showUndoToast(deleted, index, 'expense');
    if (navigator.vibrate) navigator.vibrate(40);
}

// --- Undo Last Entry (from last-entry widget) ---