const express = require('express');
const fs = require('fs');
const ical = require('ical');

const app = express();

// 🔹 chemin vers ton fichier Pronote
const ICS_PATH = './mesinformations.ics';

// 🔹 API Pronote
app.get('/api/pronote', (req, res) => {
    try {
        const icsData = fs.readFileSync(ICS_PATH, 'utf8');
        const parsed = ical.parseICS(icsData);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const cours = [];

        for (const key in parsed) {
            const event = parsed[key];
            if (event.type !== 'VEVENT') continue;

            const start = new Date(event.start);
            const end = new Date(event.end);

            start.setHours(start.getHours() + 1); // correction Pronote
            end.setHours(end.getHours() + 1);

            if (start.toDateString() === today.toDateString()) {
                cours.push({
                    matiere: event.summary || "Cours",
                    heure: `${start.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })} - ${end.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}`,
                    salle: event.location || "Non précisée",
                    professeur: extraireProf(event.description)
                });
            }
        }

        res.json({
            success: true,
            data: {
                jour: today.toLocaleDateString('fr-FR', { weekday: 'long' }),
                date: today.toLocaleDateString('fr-FR'),
                cours
            }
        });

    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// 🔍 Extraction professeur Pronote
function extraireProf(desc = "") {
    const match = desc.match(/Professeur\s*:\s*(.*)/i);
    return match ? match[1].split('\n')[0].trim() : "Non précisé";
}

app.listen(3000, () => {
    console.log("✅ API Pronote prête → http://localhost:3000/api/pronote");
});
