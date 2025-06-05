// ==UserScript==
// @name         GeoFS Airport Taxi Charts (GitHub Data)
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Display airport taxi charts in GeoFS, fetching data from a GitHub JSON file.
// @author       Mansoor Barri
// @match        https://geo-fs.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const CHART_DATA_URL = 'https://raw.githubusercontent.com/mansoorbarri/geofs-charts/refs/heads/main/charts.json'; // <--- IMPORTANT: REPLACE THIS WITH YOUR RAW JSON URL
    const CHART_DISPLAY_ID = 'geofs-taxi-chart-display';
    const CHART_BUTTON_ID = 'geofs-taxi-chart-button';
    let airportChartData = {}; // This will store our loaded JSON data

    // --- Helper Functions ---

    /**
     * Fetches airport chart data from the specified GitHub JSON URL.
     */
    function loadChartData() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: CHART_DATA_URL,
                onload: function(response) {
                    try {
                        airportChartData = JSON.parse(response.responseText);
                        console.log('GeoFS Taxi Charts: Chart data loaded successfully.', airportChartData);
                        resolve();
                    } catch (e) {
                        console.error('GeoFS Taxi Charts: Error parsing JSON data:', e);
                        reject(new Error('Failed to parse chart data.'));
                    }
                },
                onerror: function(response) {
                    console.error('GeoFS Taxi Charts: Error fetching chart data:', response.status, response.statusText);
                    reject(new Error(`Failed to fetch chart data: ${response.status} ${response.statusText}`));
                }
            });
        });
    }

    /**
     * Attempts to get the current airport ICAO code from GeoFS.
     */
    function getCurrentAirportICAO() {
        // This part is the same as before, as it relies on GeoFS's internal structure.
        // It's still the most fragile part of the mod.
        if (window.geofs && window.geofs.flightPlan && window.geofs.flightPlan.route && window.geofs.flightPlan.route.length > 0) {
            const lastWaypoint = window.geofs.flightPlan.route[window.geofs.flightPlan.route.length - 1];
            if (lastWaypoint && lastWaypoint.type === 'DST' && lastWaypoint.ident) {
                return lastWaypoint.ident.toUpperCase();
            }
        }
        // If you found other reliable ways during your inspection, add them here.
        // E.g., if geofs.currentAirport.icao exists:
        // if (window.geofs && window.geofs.currentAirport && window.geofs.currentAirport.icao) {
        //     return window.geofs.currentAirport.icao.toUpperCase();
        // }


        console.warn("Could not determine current airport ICAO. Ensure a flight plan is set to a destination airport.");
        return null;
    }

    function displayChart(icao) {
        const airportInfo = airportChartData[icao];
        const displayDiv = document.getElementById(CHART_DISPLAY_ID);

        if (airportInfo && airportInfo.taxi_chart_url) {
            const chartHtml = `<img src="${airportInfo.taxi_chart_url}" alt="Taxi Chart for ${icao}" style="max-width: 100%; height: auto;">`;
            const infoLink = airportInfo.info_url ? `<p><a href="${airportInfo.info_url}" target="_blank" style="color: lightblue;">More info for ${airportInfo.name || icao}</a></p>` : '';
            displayDiv.innerHTML = `
                <p>Taxi Chart for ${airportInfo.name || icao}</p>
                ${chartHtml}
                ${infoLink}
            `;
            displayDiv.style.display = 'block'; // Show the panel
        } else {
            displayDiv.innerHTML = `<p>No taxi chart found for ${icao}.</p>`;
            displayDiv.style.display = 'block';
        }
    }

    function hideChart() {
        document.getElementById(CHART_DISPLAY_ID).style.display = 'none';
    }

    // --- UI Creation ---

    function createUI() {
        const existingPanel = document.querySelector('.geofs-ui-panel');
        if (existingPanel) {
            const button = document.createElement('button');
            button.id = CHART_BUTTON_ID;
            button.className = 'geofs-button';
            button.innerText = 'Taxi Chart';
            button.title = 'Show Airport Taxi Chart';
            button.onclick = () => {
                const currentICAO = getCurrentAirportICAO();
                if (currentICAO) {
                    displayChart(currentICAO);
                } else {
                    alert('Could not determine current airport. Please ensure you are near an airport or have a flight plan set.');
                }
            };
            existingPanel.appendChild(button);
        } else {
            console.error('Could not find GeoFS UI panel to attach button.');
        }

        const chartDisplayDiv = document.createElement('div');
        chartDisplayDiv.id = CHART_DISPLAY_ID;
        chartDisplayDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.8);
            border: 2px solid #333;
            padding: 15px;
            z-index: 10000;
            max-width: 90vw;
            max-height: 90vh;
            overflow: auto;
            color: white;
            display: none;
            border-radius: 8px; /* Slightly rounded corners */
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Subtle shadow */
        `;
        document.body.appendChild(chartDisplayDiv);

        const closeButton = document.createElement('button');
        closeButton.innerText = 'X';
        closeButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            font-size: 1.2em;
            cursor: pointer;
            width: 30px;
            height: 30px;
            border-radius: 50%; /* Circular button */
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        closeButton.onmouseover = function() { this.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; };
        closeButton.onmouseout = function() { this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'; };
        closeButton.onclick = hideChart;
        chartDisplayDiv.appendChild(closeButton);

        // Add some basic styling for chart image within the display div
        GM_addStyle(`
            #${CHART_DISPLAY_ID} img {
                border: 1px solid #555;
                margin-top: 10px;
                display: block; /* Remove extra space below image */
            }
            #${CHART_DISPLAY_ID} p {
                margin: 5px 0;
                text-align: center;
            }
            #${CHART_BUTTON_ID} {
                /* Add more specific GeoFS button styling if needed */
                font-weight: bold;
            }
        `);
    }

    // --- Main Execution ---

    // Load chart data first, then create UI
    window.addEventListener('load', () => {
        loadChartData()
            .then(() => {
                setTimeout(createUI, 3000); // Give GeoFS some time to load after data is ready
            })
            .catch(error => {
                console.error('Failed to initialize GeoFS Taxi Charts mod due to data loading error:', error);
                alert('GeoFS Taxi Charts mod could not load airport data. See console for details.');
            });
    });

})();
