const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('.'));

// База данных
const DB_FILE = 'database.json';

function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const defaultDB = {
                giveaways: [],
                participants: {},
                users: {},
                blockedUsers: [],
                adminId: "6661055636",
                supportReceived: 0
            };
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
            return defaultDB;
        }
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (error) {
        console.error('Error reading DB:', error);
        return { giveaways: [], participants: {}, users: {}, blockedUsers: [], adminId: "6661055636", supportReceived: 0 };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing DB:', error);
        return false;
    }
}

// API Routes

// Получить все розыгрыши
app.get('/api/giveaways', (req, res) => {
    const db = readDB();
    res.json(db.giveaways.filter(g => !g.ended));
});

// Участие в розыгрыше
app.post('/api/participate', (req, res) => {
    const { giveawayId, username, userId } = req.body;
    const db = readDB();
    
    // Проверка блокировки
    if (db.blockedUsers.includes(userId.toString())) {
        return res.json({ success: false, error: 'Вы заблокированы' });
    }
    
    // Проверка существующего участия
    if (!db.participants[giveawayId]) {
        db.participants[giveawayId] = [];
    }
    
    if (db.participants[giveawayId].some(p => p.userId === userId)) {
        return res.json({ success: false, error: 'Вы уже участвуете' });
    }
    
    // Добавление участника
    db.participants[giveawayId].push({
        userId,
        username,
        participatedAt: new Date().toISOString()
    });
    
    writeDB(db);
    res.json({ success: true });
});

// Админ API
app.post('/api/admin/add-giveaway', (req, res) => {
    const { adminId, title, description, prize, endDate, starsRequired } = req.body;
    const db = readDB();
    
    if (adminId !== db.adminId) {
        return res.json({ success: false, error: 'Доступ запрещен' });
    }
    
    const newGiveaway = {
        id: Date.now().toString(),
        title,
        description,
        prize,
        endDate,
        starsRequired: starsRequired || 0,
        ended: false,
        createdAt: new Date().toISOString()
    };
    
    db.giveaways.push(newGiveaway);
    writeDB(db);
    res.json({ success: true, giveaway: newGiveaway });
});

// Завершение розыгрыша и выбор победителя
app.post('/api/admin/end-giveaway', (req, res) => {
    const { adminId, giveawayId } = req.body;
    const db = readDB();
    
    if (adminId !== db.adminId) {
        return res.json({ success: false, error: 'Доступ запрещен' });
    }
    
    const giveaway = db.giveaways.find(g => g.id === giveawayId);
    if (!giveaway) {
        return res.json({ success: false, error: 'Розыгрыш не найден' });
    }
    
    const participants = db.participants[giveawayId] || [];
    
    if (participants.length === 0) {
        giveaway.ended = true;
        writeDB(db);
        return res.json({ success: true, winner: null, message: 'Нет участников' });
    }
    
    // Случайный выбор победителя
    const winner = participants[Math.floor(Math.random() * participants.length)];
    giveaway.ended = true;
    giveaway.winner = winner;
    giveaway.endedAt = new Date().toISOString();
    
    writeDB(db);
    
    // Здесь можно добавить отправку уведомления ботом
    console.log(`ПОБЕДИТЕЛЬ: ${winner.username} в розыгрыше "${giveaway.title}"`);
    
    res.json({ success: true, winner });
});

// Блокировка пользователя
app.post('/api/admin/block-user', (req, res) => {
    const { adminId, userId } = req.body;
    const db = readDB();
    
    if (adminId !== db.adminId) {
        return res.json({ success: false, error: 'Доступ запрещен' });
    }
    
    if (!db.blockedUsers.includes(userId.toString())) {
        db.blockedUsers.push(userId.toString());
        writeDB(db);
    }
    
    res.json({ success: true });
});

// Поддержка проекта
app.post('/api/support', (req, res) => {
    const { userId, amount } = req.body;
    const db = readDB();
    
    // В реальном приложении здесь была бы интеграция с платежной системой
    db.supportReceived += amount;
    writeDB(db);
    
    res.json({ 
        success: true, 
        message: `Спасибо за поддержку! Вы отправили ${amount} звезд`,
        totalSupport: db.supportReceived 
    });
});

// Автоматическая проверка окончания розыгрышей
cron.schedule('0 * * * *', () => {
    const db = readDB();
    const now = new Date();
    
    db.giveaways.forEach(giveaway => {
        if (!giveaway.ended && new Date(giveaway.endDate) < now) {
            console.log(`Автоматическое завершение розыгрыша: ${giveaway.title}`);
            // Здесь можно автоматически выбрать победителя
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
