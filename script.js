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
if (localStorage.getItem('indriver_shift_start')) {
    shiftActive = true;
    shiftStartTime = parseInt(localStorage.getItem('indriver_shift_start'));
    shiftTimerInterval = setInterval(updateShiftTimer, 1000);
    updateShiftUI();
}

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

function addQuickFare(amount, btnEl) {
    if (_chipCooldown) return;
    _chipCooldown = true;

    addIncome(amount, true);

    if (btnEl) {
        const originalText = btnEl.textContent;
        btnEl.textContent = '✓';
        btnEl.classList.add('chip-confirmed');

        document.querySelectorAll('.fare-chip').forEach(c => c.classList.add('chip-cooldown'));

        setTimeout(() => {
            btnEl.textContent = originalText;
            btnEl.classList.remove('chip-confirmed');
            document.querySelectorAll('.fare-chip').forEach(c => c.classList.remove('chip-cooldown'));
            _chipCooldown = false;
        }, 500);
    } else {
        setTimeout(() => { _chipCooldown = false; }, 500);
    }
}

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
function undoLastEntry(id, type) {
    if (type === 'Fare') {
        const index = incomes.findIndex(inc => inc.id === id);
        if (index === -1) return;
        const deleted = incomes.splice(index, 1)[0];
        saveData();
        render();
        showUndoToast(deleted, index, 'income');
    } else {
        const index = expenses.findIndex(exp => exp.id === id);
        if (index === -1) return;
        const deleted = expenses.splice(index, 1)[0];
        saveData();
        render();
        showUndoToast(deleted, index, 'expense');
    }
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
}

// --- Toast Undo System ---
function showUndoToast(entry, originalIndex, type) {
    // Cancel any previous undo window
    if (_undoTimer) clearTimeout(_undoTimer);

    _undoState = { entry, originalIndex, type };

    const toastEl = document.getElementById('undo-toast');
    const textEl = document.getElementById('undo-toast-text') || toastEl.querySelector('.undo-toast-text');

    const label = type === 'income'
        ? `Fare ${entry.amount} EGP deleted`
        : `${entry.category || 'Expense'} ${entry.amount} EGP deleted`;
    textEl.textContent = label;

    toastEl.classList.remove('hidden');
    toastEl.classList.remove('toast-exit');
    void toastEl.offsetWidth; // force reflow for re-animation
    toastEl.classList.add('toast-enter');

    _undoTimer = setTimeout(() => {
        dismissUndoToast();
    }, 5000);
}

function undoDelete() {
    if (!_undoState) return;

    const { entry, originalIndex, type } = _undoState;

    if (type === 'income') {
        incomes.splice(originalIndex, 0, entry);
    } else {
        expenses.splice(originalIndex, 0, entry);
    }

    saveData();
    render();
    dismissUndoToast();
    _undoState = null;
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
}

function dismissUndoToast() {
    const toastEl = document.getElementById('undo-toast');
    toastEl.classList.remove('toast-enter');
    toastEl.classList.add('toast-exit');
    setTimeout(() => {
        toastEl.classList.add('hidden');
        toastEl.classList.remove('toast-exit');
    }, 300);
    if (_undoTimer) {
        clearTimeout(_undoTimer);
        _undoTimer = null;
    }
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
    const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = totalIncome - totalExpenses;
    
    // Build CSV content
    let csvContent = 'Type,Amount (EGP),Category,Date\n';
    
    // Add incomes
    incomes.forEach(income => {
        csvContent += `Income,${income.amount},-,"${income.date}"\n`;
    });
    
    // Add expenses
    expenses.forEach(expense => {
        csvContent += `Expense,${expense.amount},"${expense.category}","${expense.date}"\n`;
    });
    
    // Add net income row
    csvContent += `NET INCOME,${netIncome},-,-\n`;
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `indriver-report-${today}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportPDF() {
    const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = totalIncome - totalExpenses;
    
    // Combine and sort all transactions by date (newest first)
    const allTransactions = [
        ...incomes.map(item => ({ ...item, type: 'Income' })),
        ...expenses.map(item => ({ ...item, type: 'Expense' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Generate HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>InDriver Income Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            color: #2E7D32;
            font-size: 28px;
        }
        .date {
            color: #666;
            font-size: 14px;
            margin-top: 5px;
        }
        .summary {
            margin-bottom: 30px;
        }
        .summary h2 {
            color: #333;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
            font-size: 20px;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .summary-table th, .summary-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .summary-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .income { color: #2E7D32; font-weight: bold; }
        .expense { color: #FF9800; font-weight: bold; }
        .net-positive { color: #2E7D32; font-weight: bold; }
        .net-negative { color: #FF5252; font-weight: bold; }
        .transactions {
            margin-top: 30px;
        }
        .transactions h2 {
            color: #333;
            border-bottom: 1px solid #ccc;
            padding-bottom: 10px;
            font-size: 20px;
        }
        .transaction-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .transaction-table th, .transaction-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        .transaction-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .transaction-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        @media print {
            body { margin: 15px; }
            .header { page-break-after: avoid; }
            .summary, .transactions { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>InDriver Income Report</h1>
        <div class="date">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <table class="summary-table">
            <tr>
                <th>Total Income</th>
                <td class="income">${totalIncome.toLocaleString()} EGP</td>
            </tr>
            <tr>
                <th>Total Expenses</th>
                <td class="expense">${totalExpenses.toLocaleString()} EGP</td>
            </tr>
            <tr>
                <th>Net Income</th>
                <td class="${netIncome >= 0 ? 'net-positive' : 'net-negative'}">${netIncome.toLocaleString()} EGP</td>
            </tr>
        </table>
    </div>
    
    <div class="transactions">
        <h2>All Transactions</h2>
        <table class="transaction-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount (EGP)</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
                ${allTransactions.map(transaction => `
                    <tr>
                        <td>${transaction.date}</td>
                        <td>${transaction.type}</td>
                        <td class="${transaction.type.toLowerCase() === 'income' ? 'income' : 'expense'}">${transaction.amount.toLocaleString()}</td>
                        <td>${transaction.category || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;
    
    // Open new window with content
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

function initChart() {
    const canvas = document.getElementById('earnings-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Income',
                    backgroundColor: '#69F0AE',
                    data: []
                },
                {
                    label: 'Expenses',
                    backgroundColor: '#FF9800',
                    data: []
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#B0B0B0'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#B0B0B0'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.06)'
                    }
                },
                y: {
                    ticks: {
                        color: '#B0B0B0'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.06)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

function getDateKey(dateStr) {
    return dateStr.split(' ')[0];
}

function updateChart(mode) {
    if (!chartInstance) return;
    
    if (mode === 'weekly') {
        const labels = [];
        const incomeData = [];
        const expenseData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateKey = date.toLocaleDateString();
            labels.push(dateKey);
            
            const dayIncome = incomes
                .filter(item => getDateKey(item.date) === dateKey)
                .reduce((sum, item) => sum + item.amount, 0);
            incomeData.push(dayIncome);
            
            const dayExpenses = expenses
                .filter(item => getDateKey(item.date) === dateKey)
                .reduce((sum, item) => sum + item.amount, 0);
            expenseData.push(dayExpenses);
        }
        
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = incomeData;
        chartInstance.data.datasets[1].data = expenseData;
    } else if (mode === 'monthly') {
        const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        const incomeData = [0, 0, 0, 0];
        const expenseData = [0, 0, 0, 0];
        
        const today = new Date();
        
        incomes.forEach(item => {
            const itemDate = new Date(item.date);
            const daysDiff = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 6) incomeData[0] += item.amount;
            else if (daysDiff <= 13) incomeData[1] += item.amount;
            else if (daysDiff <= 20) incomeData[2] += item.amount;
            else if (daysDiff <= 27) incomeData[3] += item.amount;
        });
        
        expenses.forEach(item => {
            const itemDate = new Date(item.date);
            const daysDiff = Math.floor((today - itemDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 6) expenseData[0] += item.amount;
            else if (daysDiff <= 13) expenseData[1] += item.amount;
            else if (daysDiff <= 20) expenseData[2] += item.amount;
            else if (daysDiff <= 27) expenseData[3] += item.amount;
        });
        
        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = incomeData.reverse();
        chartInstance.data.datasets[1].data = expenseData.reverse();
    }
    
    chartInstance.update();
}

function updateStats() {
    const todayKey = new Date().toLocaleDateString();
    
    // Today's income
    const statToday = incomes
        .filter(item => getDateKey(item.date) === todayKey)
        .reduce((sum, item) => sum + item.amount, 0);
    
    // This week's income (last 7 days)
    const last7Days = new Set();
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.add(date.toLocaleDateString());
    }
    
    const statWeek = incomes
        .filter(item => last7Days.has(getDateKey(item.date)))
        .reduce((sum, item) => sum + item.amount, 0);
    
    // Best day
    const dailyTotals = {};
    incomes.forEach(item => {
        const dateKey = getDateKey(item.date);
        dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + item.amount;
    });
    
    const statBest = Object.values(dailyTotals).length > 0 
        ? Math.max(...Object.values(dailyTotals))
        : 0;
    
    document.getElementById('stat-today').textContent = statToday.toLocaleString() + ' EGP';
    document.getElementById('stat-week').textContent = statWeek.toLocaleString() + ' EGP';
    document.getElementById('stat-best').textContent = statBest.toLocaleString() + ' EGP';
}

function switchTab(mode) {
    activeTab = mode;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById('tab-' + mode).classList.add('active');
    updateChart(mode);
}

function renderAnalytics() {
    updateStats();
    updateChart(activeTab);
}

function setDailyGoal() {
    const goalInput = document.getElementById('goal-input');
    const value = parseFloat(goalInput.value);
    
    if (!value || value <= 0) {
        alert('Please enter a valid goal amount');
        return;
    }
    
    dailyGoal = value;
    localStorage.setItem('indriver_daily_goal', dailyGoal);
    renderGoal();
    
    goalInput.value = '';
    goalInput.blur();
    if (navigator.vibrate) navigator.vibrate(50);
}

function renderGoal() {
    const todayKey = new Date().toLocaleDateString();
    const todayIncome = incomes
        .filter(item => getDateKey(item.date) === todayKey)
        .reduce((sum, item) => sum + item.amount, 0);
    
    if (dailyGoal === 0) {
        document.getElementById('goal-progress-text').textContent = 'Set a goal to track your daily progress';
        document.getElementById('goal-bar-fill').style.width = '0%';
        document.getElementById('goal-bar-fill').style.backgroundColor = 'var(--primary-color)';
        document.getElementById('goal-status').textContent = '';
        return;
    }
    
    const percent = Math.min((todayIncome / dailyGoal) * 100, 100);
    
    document.getElementById('goal-progress-text').textContent = 
        todayIncome.toLocaleString() + ' / ' + dailyGoal.toLocaleString() + ' EGP';
    document.getElementById('goal-bar-fill').style.width = percent.toFixed(1) + '%';
    
    if (percent >= 100) {
        document.getElementById('goal-bar-fill').style.backgroundColor = '#69F0AE';
        document.getElementById('goal-status').textContent = 'Goal reached!';
        document.getElementById('goal-status').style.color = '#69F0AE';
    } else if (percent >= 70) {
        document.getElementById('goal-bar-fill').style.backgroundColor = '#FF9800';
        document.getElementById('goal-status').textContent = percent.toFixed(0) + '% there — keep going';
        document.getElementById('goal-status').style.color = '#FF9800';
    } else {
        document.getElementById('goal-bar-fill').style.backgroundColor = '#69F0AE';
        document.getElementById('goal-status').textContent = percent.toFixed(0) + '% of daily goal';
        document.getElementById('goal-status').style.color = 'var(--text-secondary)';
    }
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
