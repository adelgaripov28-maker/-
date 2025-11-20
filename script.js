const tg = window.Telegram.WebApp;
const API_URL = 'https://your-app.onrender.com/api'; // Замените на ваш URL

tg.expand();
tg.enableClosingConfirmation();

let currentUser = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupTabs();
    loadGiveaways();
    setupSupportButtons();
});

function initApp() {
    if (tg.initDataUnsafe.user) {
        currentUser = tg.initDataUnsafe.user;
        updateProfileInfo();
        
        // Показать админ панель если пользователь админ
        if (currentUser.id.toString() === "6661055636") {
            showAdminButton();
        }
    }
}

function showAdminButton() {
    const tabs = document.querySelector('.tabs');
    const adminTab = document.createElement('div');
    adminTab.className = 'tab';
    adminTab.innerHTML = '⚙️ Админ';
    adminTab.onclick = () => window.location.href = 'admin.html';
    tabs.appendChild(adminTab);
}

function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function loadGiveaways() {
    try {
        const response = await fetch(`${API_URL}/giveaways`);
        const giveaways = await response.json();
        displayGiveaways(giveaways);
    } catch (error) {
        console.error('Error loading giveaways:', error);
    }
}

function displayGiveaways(giveaways) {
    const container = document.getElementById('giveaways-list');
    container.innerHTML = '';

    if (giveaways.length === 0) {
        container.innerHTML = '<p>Нет активных розыгрышей</p>';
        return;
    }

    giveaways.forEach(giveaway => {
        const giveawayEl = document.createElement('div');
        giveawayEl.className = 'giveaway';
        giveawayEl.innerHTML = `
            <div class="giveaway-header">
                <h3>${giveaway.title}</h3>
                <span class="end-date">До: ${new Date(giveaway.endDate).toLocaleDateString()}</span>
            </div>
            <p>${giveaway.description}</p>
            <div class="giveaway-details">
                <span>Приз: ${giveaway.prize}</span>
                ${giveaway.starsRequired > 0 ? `<span>Нужно звёзд: ${giveaway.starsRequired}</span>` : ''}
            </div>
            <input type="text" class="username-input" placeholder="Ваш юзернейм" id="username-${giveaway.id}">
            <button class="participate-btn" onclick="participate('${giveaway.id}')">Участвовать</button>
            <div id="status-${giveaway.id}"></div>
        `;
        container.appendChild(giveawayEl);
    });
}

async function participate(giveawayId) {
    if (!currentUser) {
        showStatus(giveawayId, 'Ошибка: пользователь не определен', 'error');
        return;
    }

    const usernameInput = document.getElementById(`username-${giveawayId}`);
    const username = usernameInput.value.trim();

    if (!username) {
        showStatus(giveawayId, 'Введите ваш юзернейм', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/participate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                giveawayId,
                username,
                userId: currentUser.id
            })
        });

        const result = await response.json();

        if (result.success) {
            showStatus(giveawayId, 'Участие принято! Удачи!', 'success');
            usernameInput.disabled = true;
            document.querySelector(`button[onclick="participate('${giveawayId}')"]`).disabled = true;
        } else {
            showStatus(giveawayId, result.error, 'error');
        }
    } catch (error) {
        showStatus(giveawayId, 'Ошибка соединения', 'error');
    }
}

function showStatus(giveawayId, message, type) {
    const statusEl = document.getElementById(`status-${giveawayId}`);
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
}

function setupSupportButtons() {
    document.querySelectorAll('.support-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.getAttribute('data-amount'));
            sendSupport(amount);
        });
    });
}

async function sendSupport(amount) {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_URL}/support`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                amount: amount
            })
        });

        const result = await response.json();
        
        if (result.success) {
            document.getElementById('support-message').textContent = result.message;
            document.getElementById('support-message').className = 'success';
        }
    } catch (error) {
        document.getElementById('support-message').textContent = 'Ошибка отправки';
        document.getElementById('support-message').className = 'error';
    }
}

function updateProfileInfo() {
    if (currentUser) {
        document.getElementById('profile-id').textContent = currentUser.id;
        document.getElementById('profile-name').textContent = currentUser.first_name || 'Не указано';
        document.getElementById('profile-username').textContent = currentUser.username || 'Не указан';
    }
}
