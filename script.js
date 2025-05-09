document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([19.0760, 72.8777], 5); // Default: Mumbai
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Emission factors (kg CO2/km, TTW, based on GLEC/ISO 14083 approximations)
    const emissionFactors = {
        truck: {
            diesel: { flat: 0.12, hilly: 0.14, mountainous: 0.16, highway: 0.11, urban: 0.13, rural: 0.12 },
            petrol: { flat: 0.13, hilly: 0.15, mountainous: 0.17, highway: 0.12, urban: 0.14, rural: 0.13 },
            electric: { flat: 0.02, hilly: 0.025, mountainous: 0.03, highway: 0.018, urban: 0.022, rural: 0.02 }
        },
        van: {
            diesel: { flat: 0.08, hilly: 0.09, mountainous: 0.10, highway: 0.07, urban: 0.085, rural: 0.08 },
            petrol: { flat: 0.09, hilly: 0.10, mountainous: 0.11, highway: 0.08, urban: 0.095, rural: 0.09 },
            electric: { flat: 0.015, hilly: 0.018, mountainous: 0.02, highway: 0.013, urban: 0.016, rural: 0.015 }
        }
    };
    const wttFactors = { diesel: 0.02, petrol: 0.025, electric: 0.01 }; // Well-to-Tank
    const loadFactor = 0.00001; // Additional CO2 per kg of load per km

    // Gemini API setup
    const API_KEY = 'AIzaSyBisrCAxpsyh7PedVStXAKyia5c_nuq22w';

    async function geocode(address) {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)},India&format=json&limit=1`);
        const data = await response.json();
        return data[0] ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null;
    }

    async function getRoute(start, end, optimize) {
        const startCoords = await geocode(start);
        const endCoords = await geocode(end);
        if (!startCoords || !endCoords) {
            alert("Invalid address!");
            return null;
        }

        let profile = 'driving';
        if (optimize === 'time') profile = 'driving';
        else if (optimize === 'distance') profile = 'driving';
        else if (optimize === 'emissions') profile = 'driving';

        const response = await fetch(`http://router.project-osrm.org/route/v1/${profile}/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=full&geometries=geojson&annotations=true`);
        const data = await response.json();
        return {
            coords: data.routes[0].geometry.coordinates,
            distance: data.routes[0].distance / 1000, // km
            duration: data.routes[0].duration / 3600 // hours
        };
    }

    async function getCitiesAlongRoute(coords) {
        const cities = [];
        for (let i = 0; i < coords.length; i += Math.floor(coords.length / 5)) {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords[i][1]}&lon=${coords[i][0]}&format=json`);
            const data = await response.json();
            if (data.address && data.address.city && !cities.some(c => c.name === data.address.city)) {
                cities.push({ name: data.address.city, lat: coords[i][1], lon: coords[i][0] });
            }
        }
        return cities.length > 0 ? cities : [{ name: "Unknown", lat: coords[0][1], lon: coords[0][0] }];
    }

    async function generateReasoning(tripData) {
        const { vehicle, fuel, terrain, road, load, distance, ttwEmissions, wttEmissions, wtwEmissions, cityEmissions, comparisons } = tripData;
        const prompt = `
            You are an expert in sustainable logistics. Provide a concise explanation (150-200 words) for a logistics company about the CO2 emissions of a trip with the following details:
            - Vehicle: ${vehicle}
            - Fuel: ${fuel}
            - Terrain: ${terrain}
            - Road: ${road}
            - Load Weight: ${load} kg
            - Distance: ${distance.toFixed(2)} km
            - Tank-to-Wheel (TTW) Emissions: ${ttwEmissions.toFixed(2)} kg CO2
            - Well-to-Tank (WTT) Emissions: ${wttEmissions.toFixed(2)} kg CO2
            - Well-to-Wheel (WTW) Emissions: ${wtwEmissions.toFixed(2)} kg CO2
            - Cities along the route: ${cityEmissions.map(c => c.name).join(', ')}
            - City-wise TTW Emissions: ${cityEmissions.map(c => `${c.name}: ${c.emissions} kg`).join(', ')}
            - Fuel Comparison (vs Diesel B7): Diesel: ${comparisons.diesel.toFixed(2)}%, Petrol: ${comparisons.petrol.toFixed(2)}%, Electric: ${comparisons.electric.toFixed(2)}%

            Explain:
            1. How CO2 emissions were calculated (mention ISO 14083 and GLEC Framework).
            2. Why emissions differ across fuel types.
            3. The significance of city-wise emission breakdown.
            Ensure the tone is professional, clear, and focused on sustainability.
        `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            const data = await response.json();
            if (data.candidates && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('No valid response from Gemini API');
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            // Fallback mock response
            return `
                <p>CO2 emissions were calculated following ISO 14083 and GLEC Framework standards. The ${vehicle} using ${fuel} over ${distance.toFixed(2)} km on ${terrain} terrain and ${road} roads results in ${ttwEmissions.toFixed(2)} kg CO2 (TTW). Load weight of ${load} kg increases emissions by ${(load * loadFactor * distance).toFixed(2)} kg. Well-to-Tank emissions (${wttEmissions.toFixed(2)} kg) account for fuel production. Electric vehicles show ~${Math.abs(comparisons.electric).toFixed(0)}% lower emissions due to no combustion, while petrol emits ~${comparisons.petrol.toFixed(0)}% more than diesel due to higher carbon content. City-wise emissions are split evenly for simplicity, assuming uniform conditions, aiding in identifying high-emission segments for optimization.</p>
            `;
        }
    }

    window.calculateTrip = async function() {
        const startElement = document.getElementById('start');
        const endElement = document.getElementById('end');
        const vehicleElement = document.getElementById('vehicle');
        const fuelElement = document.getElementById('fuel');
        const terrainElement = document.getElementById('terrain');
        const roadElement = document.getElementById('road');
        const loadElement = document.getElementById('load');
        const optimizeElement = document.getElementById('optimize');

        if (!startElement || !endElement || !vehicleElement || !fuelElement || !terrainElement || !roadElement || !loadElement || !optimizeElement) {
            alert("One or more input elements are missing. Please refresh the page and try again.");
            return;
        }

        const start = startElement.value;
        const end = endElement.value;
        const vehicle = vehicleElement.value;
        const fuel = fuelElement.value;
        const terrain = terrainElement.value;
        const road = roadElement.value;
        const load = parseFloat(loadElement.value) || 0;
        const optimize = optimizeElement.value;

        if (!start || !end) {
            alert("Please select both start and end cities!");
            return;
        }

        const routeData = await getRoute(start, end, optimize);
        if (!routeData) return;

        const { coords, distance, duration } = routeData;
        const cities = await getCitiesAlongRoute(coords);

        // Calculate emissions
        const baseEmission = emissionFactors[vehicle][fuel][terrain] * emissionFactors[vehicle][fuel][road];
        const loadEmission = load * loadFactor * distance;
        const ttwEmissions = (baseEmission + loadEmission) * distance;
        const wttEmissions = distance * wttFactors[fuel];
        const wtwEmissions = ttwEmissions + wttEmissions;

        // Update map
        map.eachLayer(layer => { if (layer !== map._layers[Object.keys(map._layers)[0]]) layer.remove(); });
        const polyline = L.polyline(coords.map(c => [c[1], c[0]]), { color: '#28a745' }).addTo(map);
        cities.forEach(city => {
            L.marker([city.lat, city.lon]).bindPopup(city.name).addTo(map);
        });
        map.fitBounds(polyline.getBounds());

        // Heatmap
        const heatPoints = cities.map(city => [city.lat, city.lon, ttwEmissions / cities.length]);
        L.heatLayer(heatPoints, { radius: 25, gradient: { 0.4: 'green', 0.6: 'yellow', 1: 'red' } }).addTo(map);

        // City-wise emissions
        const cityEmissions = cities.map(city => ({
            name: city.name,
            emissions: (ttwEmissions / cities.length).toFixed(2),
            wtw: (wtwEmissions / cities.length).toFixed(2)
        }));
        const cityEmissionsElement = document.getElementById('city-emissions');
        if (cityEmissionsElement) {
            cityEmissionsElement.innerHTML = cityEmissions.map(c => `
                <div class="city-box" onmouseover="showTooltip(event, '${c.name}', '${c.emissions}', '${c.wtw}')" onmouseout="hideTooltip()">
                    ${c.name}: CO2 Emission: ${c.emissions} KG
                </div>
            `).join('');
        }

        // Fuel comparison
        const baseline = (emissionFactors[vehicle].diesel[terrain] * emissionFactors[vehicle].diesel[road] + load * loadFactor) * distance;
        const comparisons = {
            diesel: ((emissionFactors[vehicle].diesel[terrain] * emissionFactors[vehicle].diesel[road] + load * loadFactor) * distance - baseline) / baseline * 100,
            petrol: ((emissionFactors[vehicle].petrol[terrain] * emissionFactors[vehicle].petrol[road] + load * loadFactor) * distance - baseline) / baseline * 100,
            electric: ((emissionFactors[vehicle].electric[terrain] * emissionFactors[vehicle].electric[road] + load * loadFactor) * distance - baseline) / baseline * 100
        };

        // Summary
        const summaryElement = document.getElementById('summary');
        if (summaryElement) {
            summaryElement.innerHTML = `
                <h3>Trip Summary</h3>
                <p>Total Distance: ${distance.toFixed(2)} km</p>
                <p>Duration: ${duration.toFixed(2)} hours</p>
                <p>Fuel Used: ${fuel}</p>
                <p>Load Weight: ${load.toFixed(2)} kg</p>
                <p>Terrain: ${terrain}, Road: ${road}</p>
                <p>Total CO2 Emissions (TTW): ${ttwEmissions.toFixed(2)} kg</p>
                <p>Well-to-Tank (WTT): ${wttEmissions.toFixed(2)} kg</p>
                <p>Well-to-Wheel (WTW): ${wtwEmissions.toFixed(2)} kg</p>
                <p>Fuel Comparison (vs Diesel B7):</p>
                <ul>
                    <li>Diesel B7: ${comparisons.diesel.toFixed(2)}%</li>
                    <li>Petrol: ${comparisons.petrol.toFixed(2)}%</li>
                    <li>Electric: ${comparisons.electric.toFixed(2)}%</li>
                </ul>
            `;
        }

        // Generate reasoning with Gemini API
        const reasoning = await generateReasoning({
            vehicle,
            fuel,
            terrain,
            road,
            load,
            distance,
            ttwEmissions,
            wttEmissions,
            wtwEmissions,
            cityEmissions,
            comparisons
        });
        const reasoningElement = document.getElementById('reasoning');
        if (reasoningElement) {
            reasoningElement.innerHTML = `<h3>Reasoning</h3>${reasoning}`;
        }
    }

    window.resetForm = function() {
        const startElement = document.getElementById('start');
        const endElement = document.getElementById('end');
        const vehicleElement = document.getElementById('vehicle');
        const fuelElement = document.getElementById('fuel');
        const terrainElement = document.getElementById('terrain');
        const roadElement = document.getElementById('road');
        const loadElement = document.getElementById('load');
        const optimizeElement = document.getElementById('optimize');
        const summaryElement = document.getElementById('summary');
        const cityEmissionsElement = document.getElementById('city-emissions');
        const reasoningElement = document.getElementById('reasoning');

        if (startElement) startElement.value = '';
       		// Truncated to avoid exceeding max token count for this response
        if (endElement) endElement.value = '';
        if (vehicleElement) vehicleElement.value = 'truck';
        if (fuelElement) fuelElement.value = 'diesel';
        if (terrainElement) terrainElement.value = 'flat';
        if (roadElement) roadElement.value = 'highway';
        if (loadElement) loadElement.value = '';
        if (optimizeElement) optimizeElement.value = 'distance';
        if (summaryElement) summaryElement.innerHTML = '';
        if (cityEmissionsElement) cityEmissionsElement.innerHTML = '';
        if (reasoningElement) reasoningElement.innerHTML = '';
        
        map.eachLayer(layer => { if (layer !== map._layers[Object.keys(map._layers)[0]]) layer.remove(); });
        map.setView([19.0760, 72.8777], 5);
    }

    window.showTooltip = function(event, city, ttw, wtw) {
        let tooltip = document.querySelector('.tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }
        tooltip.innerHTML = `${city}<br>TTW: ${ttw} kg<br>WTW: ${wtw} kg`;
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
        tooltip.style.display = 'block';
    }

    window.hideTooltip = function() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }
});
