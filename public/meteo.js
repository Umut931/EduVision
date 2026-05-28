function afficherMeteo(cible, modeAuto = false) {
    if (!cible) {
        entrerModePleinEcran('🌤️ Météo de Paris');
        cible = document.getElementById('contenu-plein-ecran');
        cible.style.overflow = '';
    } else if (modeAuto) {
        cible.style.overflow = 'hidden';
    }
    cible.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement de la météo...</p></div>';

    fetch('/api/meteo')
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                cible.innerHTML = `<div class="erreur">❌ ${data.message || 'Erreur météo'}</div>`;
                return;
            }
            const d = data.data;

            const getWeatherIcon = (condition) => {
                const text = (condition || '').toLowerCase();
                if (text.includes('soleil') || text.includes('sunny') || text.includes('clear')) return '☀️';
                if (text.includes('nuage') || text.includes('cloud')) return '☁️';
                if (text.includes('pluie') || text.includes('rain') || text.includes('drizzle')) return '🌧️';
                if (text.includes('neige') || text.includes('snow')) return '❄️';
                if (text.includes('orage') || text.includes('storm') || text.includes('thunder')) return '⛈️';
                if (text.includes('vent') || text.includes('wind')) return '💨';
                if (text.includes('brouillard') || text.includes('fog') || text.includes('mist') || text.includes('overcast')) return '🌫️';
                return '🌤️';
            };

            const previsions = (d.previsions || []).map(day => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
                const nom = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                return `
                <div class="forecast-card-new">
                    <div class="forecast-day">${nom}</div>
                    <div class="forecast-icon-new">${getWeatherIcon(day.condition)}</div>
                    <div class="forecast-temp-range">
                        <span class="temp-max">${day.maxtemp}°</span>
                        <span class="temp-min">${day.mintemp}°</span>
                    </div>
                    <div class="forecast-condition-new">${day.condition}</div>
                    <div class="forecast-info">
                        <div>💧 ${day.humidite}%</div>
                        <div>💨 ${day.vent} km/h</div>
                        <div>☔ ${day.pluie}mm</div>
                    </div>
                </div>`;
            }).join('');

            cible.innerHTML = `
                <div class="meteo-container">
                    <div class="meteo-header">
                        <h1 style="margin: 0 0 5px 0; font-size: 1.8em;">${d.ville}</h1>
                    </div>
                    <div class="meteo-current">
                        <div class="current-icon" style="font-size: 4em; margin-bottom: 10px;">${getWeatherIcon(d.condition)}</div>
                        <div class="current-main">
                            <div class="current-temp">${d.temperature}°C</div>
                            <div class="current-feels">Ressenti: ${d.ressenti}°C</div>
                        </div>
                    </div>
                    <div class="meteo-grid">
                        <div class="meteo-stat">
                            <div class="stat-label">💧 Humidité</div>
                            <div class="stat-value">${d.humidite}%</div>
                        </div>
                        <div class="meteo-stat">
                            <div class="stat-label">💨 Vent</div>
                            <div class="stat-value">${d.vent} km/h</div>
                        </div>
                        <div class="meteo-stat">
                            <div class="stat-label">💨 Rafales</div>
                            <div class="stat-value">${d.rafales} km/h</div>
                        </div>
                        <div class="meteo-stat">
                            <div class="stat-label">👁️ Visibilité</div>
                            <div class="stat-value">${d.visibilite} km</div>
                        </div>
                    </div>
                    <div class="meteo-divider"></div>
                    <h3 style="margin: 1.5em 0 1em 0; font-size: 1.3em; color: #333;">📅 Prévisions</h3>
                    <div class="forecast-container">${previsions}</div>
                </div>
            `;
        })
        .catch(error => {
            cible.innerHTML = `<div class="erreur">❌ Erreur lors du chargement: ${error.message}</div>`;
        });
}
