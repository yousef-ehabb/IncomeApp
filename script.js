// State
let incomes = JSON.parse(localStorage.getItem('indriver_incomes')) || [];

// DOM Elements
const inputEl = document.getElementById('income-input');
const listEl = document.getElementById('income-list');
const totalEl = document.getElementById('total-amount');
const todayEl = document.getElementById('today-amount');
const modalEl = document.getElementById('confirm-modal');

// Initial Render
render();

function addIncome() {
    const amountVal = inputEl.value;

    if (!amountVal || amountVal <= 0) {
        alert('Please enter a valid amount');
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
    inputEl.value = '';
    inputEl.blur(); // Close keyboard
    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
}

function deleteIncome(id) {
    if (confirm('Delete this entry?')) {
        incomes = incomes.filter(inc => inc.id !== id);
        saveData();
        render();
    }
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
}

function exportCSV() {
    if (incomes.length === 0) {
        alert('No data to export');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Amount,Date\n";

    incomes.forEach(function(item) {
        let row = `${item.id},${item.amount},"${item.date}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "indriver_income.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function render() {
    // Calculate Total
    const total = incomes.reduce((sum, item) => sum + item.amount, 0);
    totalEl.textContent = total.toLocaleString() + ' EGP';

    // Calculate Today's Total
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const todayTotal = incomes.reduce((sum, item) => {
        if (item.id >= startOfDay) {
            return sum + item.amount;
        }
        return sum;
    }, 0);
    todayEl.textContent = todayTotal.toLocaleString() + ' EGP';

    // Render List
    listEl.innerHTML = '';

    if (incomes.length === 0) {
        listEl.innerHTML = '<li class="empty-state">No rides recorded yet.<br>Start driving safely! 🚗</li>';
        return;
    }

    // Optimization: using DocumentFragment for better performance
    const fragment = document.createDocumentFragment();

    incomes.forEach(item => {
        const li = document.createElement('li');
        li.className = 'income-item';
        li.innerHTML = `
            <div class="income-info">
                <span class="income-amount">${item.amount.toLocaleString()} EGP</span>
                <span class="income-date">${item.date}</span>
            </div>
            <button class="delete-btn" onclick="deleteIncome(${item.id})" aria-label="Delete entry">
                &times;
            </button>
        `;
        fragment.appendChild(li);
    });

    listEl.appendChild(fragment);
}

// Allow Enter key to submit
inputEl.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        addIncome();
    }
});
