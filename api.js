const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
    const BOT_TOKEN = "8318572264:AAFEd76OTnsYsZmCkJ-emYbWSIu57mNbfgA";
    const ADMIN_ID = "6661055636";
    const DB_FILE = path.join('/tmp', 'database.json');
    
    function readDB() {
        try {
            if (!fs.existsSync(DB_FILE)) {
                const defaultDB = {
                    giveaways: [],
                    participants: {},
                    blockedUsers: [],
                    adminId: ADMIN_ID,
                    supportReceived: 0
                };
                fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
                return defaultDB;
            }
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        } catch (error) {
            return { giveaways: [], participants: {}, blockedUsers: [], adminId: ADMIN_ID, supportReceived: 0 };
        }
    }

    function writeDB(data) {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            return false;
        }
    }

    const { httpMethod, path: eventPath } = event;
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // Получить розыгрыши
        if (httpMethod === 'GET' && eventPath.includes('/api/giveaways')) {
            const db = readDB();
            return {
                statusCode: 200,
                body: JSON.stringify(db.giveaways.filter(g => !g.ended))
            };
        }

        // Участие в розыгрыше
        if (httpMethod === 'POST' && eventPath.includes('/api/participate')) {
            const { giveawayId, username, userId } = body;
            const db = readDB();
            
            if (db.blockedUsers.includes(userId.toString())) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: false, error: 'Вы заблокированы' })
                };
            }
            
            if (!db.participants[giveawayId]) {
                db.participants[giveawayId] = [];
            }
            
            if (db.participants[giveawayId].some(p => p.userId === userId)) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: false, error: 'Вы уже участвуете' })
                };
            }
            
            db.participants[giveawayId].push({
                userId,
                username,
                participatedAt: new Date().toISOString()
            });
            
            writeDB(db);
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true })
            };
        }

        // Поддержка проекта
        if (httpMethod === 'POST' && eventPath.includes('/api/support')) {
            const { userId, amount } = body;
            const db = readDB();
            
            db.supportReceived += amount;
            writeDB(db);
            
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: true, 
                    message: `Спасибо за поддержку! Вы отправили ${amount} звезд`,
                    totalSupport: db.supportReceived 
                })
            };
        }

        // Админ - добавить розыгрыш
        if (httpMethod === 'POST' && eventPath.includes('/api/admin/add-giveaway')) {
            const { adminId, title, description, prize, endDate, starsRequired } = body;
            const db = readDB();
            
            if (adminId !== ADMIN_ID) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ success: false, error: 'Доступ запрещен' })
                };
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
            
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, giveaway: newGiveaway })
            };
        }

        return {
            statusCode: 404,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
