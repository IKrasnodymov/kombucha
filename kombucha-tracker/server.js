const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();

// CORS configuration
const corsOptions = {
    origin: ['http://localhost:3000', 'https://ikrasnodymov.github.io', 'http://ikrasnodymov.github.io'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Use file-based database instead of memory
const dbPath = path.join(__dirname, 'kombucha.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to the SQLite database.');
        // Create tables if they don't exist
        db.run(`CREATE TABLE IF NOT EXISTS kombucha_jars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            volume REAL,
            sugar_spoons INTEGER,
            tea_type TEXT,
            additives TEXT,
            start_date TEXT,
            last_refresh_date TEXT,
            updates TEXT,
            organic_acids REAL,
            vitamin_c REAL,
            vitamin_b1 REAL,
            vitamin_b2 REAL,
            probiotics REAL,
            sweetness_level REAL,
            carbonation REAL,
            ph REAL,
            alcohol REAL
        )`);
    }
});

// Функция для расчета текущих значений банки
const calculateCurrentValues = (jar) => {
    const daysSinceStart = (new Date() - new Date(jar.start_date)) / (1000 * 60 * 60 * 24);
    const sugarGrams = jar.sugar_spoons * 4; // 1 ложка = 4г
    
    // Органические кислоты: acid(t) = S0 * (1 - e^(-kt))
    const S0 = (sugarGrams / 180.16) * 3 * 60.05 * 1000; // Преобразование сахара в кислоты
    const k = 0.15; // коэффициент скорости ферментации
    const organicAcids = S0 * (1 - Math.exp(-k * daysSinceStart));
    
    // Витамин C: vitC(t) = 5 * tea_factor * ln(t+1)
    const teaFactor = jar.tea_type.toLowerCase() === 'зеленый' ? 2 : 1;
    const vitaminC = 5 * teaFactor * Math.log(daysSinceStart + 1);
    
    // Витамины B1 и B2 (увеличиваются по мере ферментации)
    // Максимум 10 единиц, логарифмическая зависимость
    const vitaminB1 = Math.min(10, 2 * Math.log(daysSinceStart + 1));
    const vitaminB2 = Math.min(10, 2.5 * Math.log(daysSinceStart + 1));
    
    // Пробиотики: P(t) = P_max / (1 + (P_max - P0) * e^(-rt))
    const P_max = 1e6; // КОЕ/мл
    const P0 = 1000;   // начальное значение
    const r = 0.8;     // скорость роста
    const probiotics = P_max / (1 + (P_max - P0) * Math.exp(-r * daysSinceStart));
    
    // Уровень сладости (экспоненциальный распад)
    const sweetness_level = 100 * Math.exp(-0.1 * daysSinceStart);
    
    // Газация (на основе производства CO₂)
    const sugar_consumed = sugarGrams;
    const co2_moles = (sugar_consumed / 180.16) * 2;
    const carbonation = Math.min(10, co2_moles * 0.1);
    
    // pH (эмпирическая формула)
    const ph = 4.5 - 0.05 * daysSinceStart + 0.001 * (daysSinceStart ** 2);

    // Алкоголь (постепенное увеличение до максимума 3%)
    // Модель: A(t) = A_max * (1 - e^(-at))
    const A_max = 3.0; // максимальный процент алкоголя
    const a = 0.1;     // скорость образования
    const alcohol = A_max * (1 - Math.exp(-a * daysSinceStart));
    
    return {
        organic_acids: Math.round(organicAcids * 100) / 100,
        vitamin_c: Math.round(vitaminC * 10) / 10,
        vitamin_b1: Math.round(vitaminB1 * 10) / 10,
        vitamin_b2: Math.round(vitaminB2 * 10) / 10,
        probiotics: Math.round(probiotics),
        sweetness_level: Math.round(sweetness_level * 10) / 10,
        carbonation: Math.round(carbonation * 10) / 10,
        ph: Math.round(ph * 10) / 10,
        alcohol: Math.round(alcohol * 100) / 100
    };
};

db.serialize(() => {
    // Добавляем тестовую банку
    const stmt = db.prepare(`
        INSERT INTO kombucha_jars (
            name, volume, sugar_spoons, tea_type, additives,
            start_date, last_refresh_date, updates,
            organic_acids, vitamin_c, vitamin_b1, vitamin_b2,
            probiotics, sweetness_level, carbonation, ph, alcohol
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    stmt.run(
        'Первая банка',    // name
        1.0,               // volume
        5,                 // sugar_spoons
        'черный',          // tea_type
        'ягоды',          // additives
        now,              // start_date
        now,              // last_refresh_date
        '[]',             // updates
        0.0,              // organic_acids
        0.0,              // vitamin_c
        0.0,              // vitamin_b1
        0.0,              // vitamin_b2
        1000.0,           // probiotics
        100.0,            // sweetness_level
        0.0,              // carbonation
        4.5,              // ph
        0.0               // alcohol
    );
    stmt.finalize();

    app.get('/jars', (req, res) => {
        db.all("SELECT * FROM kombucha_jars", [], (err, rows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            // Обновляем значения для каждой банки перед отправкой
            const updatedRows = rows.map(jar => {
                const currentValues = calculateCurrentValues(jar);
                return {
                    ...jar,
                    organic_acids: currentValues.organic_acids,
                    vitamin_c: currentValues.vitamin_c,
                    vitamin_b1: currentValues.vitamin_b1,
                    vitamin_b2: currentValues.vitamin_b2,
                    probiotics: currentValues.probiotics,
                    sweetness_level: currentValues.sweetness_level,
                    carbonation: currentValues.carbonation,
                    ph: currentValues.ph,
                    alcohol: currentValues.alcohol
                };
            });
            res.json(updatedRows);
        });
    });

    app.post('/jars', (req, res) => {
        const { name, volume, sugar_spoons, tea_type, additives } = req.body;
        const start_date = new Date().toISOString();
        const last_refresh_date = start_date;
        const updates = '[]';
        const organic_acids = 0.0;
        const vitamin_c = 0.0;
        const vitamin_b1 = 0.0;
        const vitamin_b2 = 0.0;
        const probiotics = 0.0;
        const sweetness_level = 100.0;
        const carbonation = 0.0;
        const ph = 4.5;
        const alcohol = 0.0;

        db.run(
            "INSERT INTO kombucha_jars (name, volume, sugar_spoons, tea_type, additives, start_date, last_refresh_date, updates, organic_acids, vitamin_c, vitamin_b1, vitamin_b2, probiotics, sweetness_level, carbonation, ph, alcohol) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [name, volume, sugar_spoons, tea_type, additives, start_date, last_refresh_date, updates, organic_acids, vitamin_c, vitamin_b1, vitamin_b2, probiotics, sweetness_level, carbonation, ph, alcohol],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ id: this.lastID });
            }
        );
    });

    app.post('/jars/:id/update', (req, res) => {
        const { id } = req.params;
        const { updates } = req.body;
        
        db.get("SELECT * FROM kombucha_jars WHERE id = ?", [id], (err, jar) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (!jar) {
                res.status(404).json({ error: "Банка не найдена" });
                return;
            }

            const currentValues = calculateCurrentValues(jar);
            const currentUpdates = JSON.parse(jar.updates || '[]');
            const updateEntry = {
                date: new Date().toISOString(),
                notes: updates,
                measurements: {
                    organic_acids: currentValues.organic_acids,
                    vitamin_c: currentValues.vitamin_c,
                    vitamin_b1: currentValues.vitamin_b1,
                    vitamin_b2: currentValues.vitamin_b2,
                    probiotics: currentValues.probiotics,
                    sweetness_level: currentValues.sweetness_level,
                    carbonation: currentValues.carbonation,
                    ph: currentValues.ph,
                    alcohol: currentValues.alcohol
                }
            };
            currentUpdates.push(updateEntry);

            db.run(
                "UPDATE kombucha_jars SET updates = ?, organic_acids = ?, vitamin_c = ?, vitamin_b1 = ?, vitamin_b2 = ?, probiotics = ?, sweetness_level = ?, carbonation = ?, ph = ?, alcohol = ? WHERE id = ?",
                [JSON.stringify(currentUpdates), currentValues.organic_acids, currentValues.vitamin_c, currentValues.vitamin_b1, currentValues.vitamin_b2, currentValues.probiotics, currentValues.sweetness_level, currentValues.carbonation, currentValues.ph, currentValues.alcohol, id],
                function(err) {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ 
                        message: "Обновление сохранено",
                        currentValues: currentValues,
                        updateEntry: updateEntry
                    });
                }
            );
        });
    });

    app.post('/jars/:id/refresh', (req, res) => {
        const jarId = req.params.id;
        const currentDate = new Date().toISOString();
        
        db.get('SELECT * FROM kombucha_jars WHERE id = ?', [jarId], (err, jar) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (!jar) {
                res.status(404).json({ error: 'Банка не найдена' });
                return;
            }

            // Сохраняем текущие значения в updates перед обновлением
            const updates = JSON.parse(jar.updates || '[]');
            updates.push({
                date: jar.last_refresh_date || jar.start_date,
                measurements: {
                    organic_acids: jar.organic_acids,
                    vitamin_c: jar.vitamin_c,
                    vitamin_b1: jar.vitamin_b1,
                    vitamin_b2: jar.vitamin_b2,
                    probiotics: jar.probiotics,
                    sweetness_level: jar.sweetness_level,
                    carbonation: jar.carbonation,
                    ph: jar.ph,
                    alcohol: jar.alcohol
                }
            });

            // Обновляем дату начала и дату последнего обновления
            db.run(
                `UPDATE kombucha_jars 
                 SET start_date = ?,
                     last_refresh_date = ?,
                     updates = ?
                 WHERE id = ?`,
                [currentDate, currentDate, JSON.stringify(updates), jarId],
                (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }

                    // Получаем обновленную банку
                    db.get('SELECT * FROM kombucha_jars WHERE id = ?', [jarId], (err, updatedJar) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }

                        // Рассчитываем новые значения
                        const newValues = calculateCurrentValues(updatedJar);

                        // Обновляем значения в базе
                        db.run(
                            `UPDATE kombucha_jars 
                             SET organic_acids = ?,
                                 vitamin_c = ?,
                                 vitamin_b1 = ?,
                                 vitamin_b2 = ?,
                                 probiotics = ?,
                                 sweetness_level = ?,
                                 carbonation = ?,
                                 ph = ?,
                                 alcohol = ?
                             WHERE id = ?`,
                            [
                                newValues.organic_acids,
                                newValues.vitamin_c,
                                newValues.vitamin_b1,
                                newValues.vitamin_b2,
                                newValues.probiotics,
                                newValues.sweetness_level,
                                newValues.carbonation,
                                newValues.ph,
                                newValues.alcohol,
                                jarId
                            ],
                            (err) => {
                                if (err) {
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                res.json({ message: 'Банка успешно обновлена', ...newValues });
                            }
                        );
                    });
                }
            );
        });
    });

    app.delete('/jars/:id', (req, res) => {
        const { id } = req.params;
        db.run("DELETE FROM kombucha_jars WHERE id = ?", id, function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        });
    });
});

// Start the server
const PORT = process.env.PORT || 3002;

// Start HTTP server
app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
});

// If SSL certificates exist, also start HTTPS server
const sslPath = '/etc/letsencrypt/live/kombucha.ikrasnodymov.com';
if (fs.existsSync(sslPath)) {
    const privateKey = fs.readFileSync(`${sslPath}/privkey.pem`, 'utf8');
    const certificate = fs.readFileSync(`${sslPath}/cert.pem`, 'utf8');
    const ca = fs.readFileSync(`${sslPath}/chain.pem`, 'utf8');

    const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
    };

    const httpsServer = https.createServer(credentials, app);
    httpsServer.listen(443, () => {
        console.log('HTTPS Server running on port 443');
    });
}