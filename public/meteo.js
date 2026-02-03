function afficherMeteo() {
    entrerModePleinEcran('🌤️ Météo de Paris');
    const contenu = document.getElementById('contenu-plein-ecran');
    contenu.innerHTML = '<div class="loading"><div class="spinner"></div><p>Chargement de la météo...</p></div>';
    
    fetch('http://api.weatherapi.com/v1/forecast.json?key=4334e8450c28434cbb774244262701&q=Paris&days=3')
        .then(response => response.json())
        .then(data => {
            const current = data.current;
            const location = data.location;
            const forecast = data.forecast.forecastday;
            
            // Fonction pour obtenir l'icône de météo appropriée
            const getWeatherIcon = (condition) => {
                const text = condition.toLowerCase();
                if (text.includes('sunny') || text.includes('clear')) return '☀️';
                if (text.includes('cloud')) return '☁️';
                if (text.includes('rain')) return '🌧️';
                if (text.includes('snow')) return '❄️';
                if (text.includes('storm') || text.includes('thunder')) return '⛈️';
                if (text.includes('wind')) return '💨';
                if (text.includes('overcast')) return '🌫️';
                return '🌤️';
            };
            
            contenu.innerHTML = `
                <div class="meteo-container">
                    <div class="meteo-header">
                        <h1 style="margin: 0 0 5px 0; font-size: 1.8em;">${location.name}</h1>
                        
                    
                    <div class="meteo-current">
                        <div class="current-icon" style="font-size: 4em; margin-bottom: 10px;">${getWeatherIcon(current.condition.text)}</div>
                        <div class="current-main">
                            <div class="current-temp">${current.temp_c}°C</div>
                            
                            <div class="current-feels">Ressenti: ${current.feelslike_c}°C</div>
                        </div>
                    </div>
                    
                    <div class="meteo-grid">
                        <div class="meteo-stat">
                            <div class="stat-label">💧 Humidité</div>
                            <div class="stat-value">${current.humidity}%</div>
                        </div>
                        <div class="meteo-stat">
                            <div class="stat-label">💨 Vent</div>
                            <div class="stat-value">${current.wind_kph} km/h</div>
                        </div>
                        <div class="meteo-stat">
                            <div class="stat-label">⚡ Rafales</div>
                            <div class="stat-value">${current.gust_kph} km/h</div>
                        </div>
                        <div class="meteo-stat">
                            <div class="stat-label">👁️ Visibilité</div>
                            <div class="stat-value">${current.vis_km} km</div>
                        </div>
                    </div>
                    
                    <div class="meteo-divider"></div>
                    
                    <h3 style="margin: 1.5em 0 1em 0; font-size: 1.3em; color: #333;">📅 Prévisions</h3>
                    <div class="forecast-container">
                        ${forecast.map(day => {
                            const date = new Date(day.date);
                            const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' }).charAt(0).toUpperCase() + date.toLocaleDateString('fr-FR', { weekday: 'long' }).slice(1);
                            return `
                            <div class="forecast-card-new">
                                <div class="forecast-day">${dayName}</div>
                                <div class="forecast-icon-new">${getWeatherIcon(day.day.condition.text)}</div>
                                <div class="forecast-temp-range">
                                    <span class="temp-max">${day.day.maxtemp_c}°</span>
                                    <span class="temp-min">${day.day.mintemp_c}°</span>
                                </div>
                                <div class="forecast-condition-new">${day.day.condition.text}</div>
                                <div class="forecast-info">
                                    <div>💧 ${day.day.avghumidity}%</div>
                                    <div>💨 ${day.day.maxwind_kph} km/h</div>
                                    <div>☔ ${day.day.totalprecip_mm}mm</div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>
            `;
        })
        .catch(error => {
            contenu.innerHTML = `<div class="erreur">❌ Erreur lors du chargement: ${error.message}</div>`;
        });
}
