const tg = window.Telegram.WebApp;
const API_URL = 'https://your-app.onrender.com/api';
const ADMIN_ID = "6661055636";

tg.expand();

document.addEventListener('DOMContentLoaded', function() {
    if (!tg.initDataUnsafe.user || tg.initDataUnsafe.user.id.toString() !== ADMIN_ID) {
        alert('Доступ запрещен');
        window.location.href = 'index.html';
        return;
    }

    setupAdmin();
});

function setupAdmin() {
    document.getElementById('add-giveaway-form').addEventListener('submit', addGiveaway);
    document.getElementById('block-user-btn').addEventListener('click', blockUser);
    
    loadAdminData();
}

async function addGiveaway(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const giveaway = {
        adminId: ADMIN_ID,
        title: document.getElementById('giveaway-title').value,
        description: document.getElementById('giveaway-description').value,
        prize: document.getElementById('giveaway-prize').value,
        endDate: document.getElementById('giveaway-end-date').value,
        starsRequired: parseInt(document.getElementById('giveaway-stars').value) || 0
    };

    try {
        const response = await fetch(`${API_URL}/admin/add-giveaway`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(giveaway)
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Розыгрыш создан!');
            e.target.reset();
            loadAdminData();
        } else {
            alert('Ошибка: ' + result.error);
        }
    } catch (error) {
        alert('Ошибка соединения');
    }
}

async function blockUser() {
    const userId = document.getElementById('block-user-id').value.trim();
    
    if (!userId) {
        alert('Введите ID пользователя');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/block-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId: ADMIN_ID,
                userId: userId
            })
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Пользователь заблокирован');
            document.getElementById('block-user-id').value = '';
            loadAdminData();
        } else {
            alert('Ошибка: ' + result.error);
        }
    } catch (error) {
        alert('Ошибка соединения');
    }
}

async function loadAdminData() {
    // Загрузка активных розыгрышей
    try {
        const response = await fetch(`${API_URL}/giveaways`);
        const giveaways = await response.json();
        displayActiveGiveaways(giveaways);
        
        // Обновление статистики
        document.getElementById('active-giveaways-count').textContent = giveaways.length;
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

function displayActiveGiveaways(giveaways) {
    const container = document.getElementById('active-giveaways-list');
    container.innerHTML = '';

    giveaways.forEach(giveaway => {
        const giveawayEl = document.createElement('div');
        giveawayEl.className = 'giveaway';
        giveawayEl.innerHTML = `
            <h4>${giveaway.title}</h4>
            <p>${giveaway.description}</p>
            <p>Приз: ${giveaway.prize} | До: ${new Date(giveaway.endDate).toLocaleString()}</p>
            <button onclick="endGiveaway('${giveaway.id}')">Завершить и выбрать победителя</button>
        `;
        container.appendChild(giveawayEl);
    });
}

async function endGiveaway(giveawayId) {
    if (!confirm('Завершить розыгрыш и выбрать победителя?')) return;

    try {
        const response = await fetch(`${API_URL}/admin/end-giveaway`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                adminId: ADMIN_ID,
                giveawayId: giveawayId
            })
        });

        const result = await response.json();
        
        if (result.success) {
            if (result.winner) {
                alert(`Победитель: ${result.winner.username}`);
            } else {
                alert('Нет участников');
            }
            loadAdminData();
        } else {
            alert('Ошибка: ' + result.error);
        }
    } catch (error) {
        alert('Ошибка соединения');
    }
}
