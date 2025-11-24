// ==UserScript==
// @name         GeoFS Charts
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Display airport taxi charts in GeoFS, with a search feature for ICAO codes, fetching data from GitHub.
// @author       MansoorBarri
// @match        https://www.geo-fs.com/geofs.php?v=*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @updateURL    https://github.com/mansoorbarri/geofs-charts/raw/refs/heads/main/geofs-charts.user.js
// @downloadURL  https://github.com/mansoorbarri/geofs-charts/raw/refs/heads/main/geofs-charts.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const CHART_DATA_URL = 'https://raw.githubusercontent.com/mansoorbarri/geofs-charts/refs/heads/main/charts.json';

    const MOD_BUTTON_ID = 'geofs-taxi-chart-mod-button';
    const SEARCH_PANEL_ID = 'geofs-taxi-chart-search-panel';
    const CHART_DISPLAY_ID = 'geofs-taxi-chart-display';

    let airportChartData = {};
    let uiCreated = false;
    let buttonReinsertionInterval;
    let lastSearchedIcao = ''; // New variable to store the last searched ICAO

    // --- Helper Functions ---
    function loadChartData() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: CHART_DATA_URL,
                onload: function(response) {
                    try {
                        airportChartData = JSON.parse(response.responseText);
                        console.log('GeoFS Taxi Charts: Chart data loaded successfully. Number of airports:', Object.keys(airportChartData).length);
                        console.log('GeoFS Taxi Charts: First 5 airport ICAOs loaded:', Object.keys(airportChartData).slice(0, 5));
                        resolve();
                    } catch (e) {
                        console.error('GeoFS Taxi Charts: Error parsing JSON data:', e);
                        reject(new Error('Failed to parse chart data.'));
                    }
                },
                onerror: function(response) {
                    console.error('GeoFS Taxi Charts: Error fetching chart data:', response.status, response.statusText, response);
                    reject(new Error(`Failed to fetch chart data: ${response.status} ${response.statusText}`));
                }
            });
        });
    }

    function displayChart(icao) {
        console.log(`GeoFS Taxi Charts: displayChart called for ICAO: ${icao}`);
        const airportInfo = airportChartData[icao.toUpperCase()];
        const displayDiv = document.getElementById(CHART_DISPLAY_ID);

        if (!displayDiv) {
            console.error('GeoFS Taxi Charts: Chart display div not found!');
            return;
        }

        if (airportInfo) {
            console.log('GeoFS Taxi Charts: Airport info found for ICAO:', icao, airportInfo);
            if (airportInfo.taxi_chart_url) {
                console.log('GeoFS Taxi Charts: Taxi chart URL found:', airportInfo.taxi_chart_url);
                const chartHtml = `<img src="${airportInfo.taxi_chart_url}" alt="Taxi Chart for ${icao}" style="max-width: 100%; height: auto;">`;
                const infoLink = airportInfo.info_url ? `<p><a href="${airportInfo.info_url}" target="_blank" style="color: lightblue;">More info for ${airportInfo.name || icao}</a></p>` : '';
                displayDiv.innerHTML = `
                    <p>Taxi Chart for ${airportInfo.name || icao.toUpperCase()}</p>
                    ${chartHtml}
                    ${infoLink}
                `;
                displayDiv.style.display = 'block';
            } else {
                console.warn('GeoFS Taxi Charts: No taxi_chart_url found for ICAO:', icao);
                displayDiv.innerHTML = `<p>No taxi chart URL found for ${icao.toUpperCase()}.</p>`;
                displayDiv.style.display = 'block';
            }
        } else {
            console.warn('GeoFS Taxi Charts: No airport data found for ICAO:', icao.toUpperCase());
            displayDiv.innerHTML = `<p>No airport data found for ${icao.toUpperCase()}.</p>`;
            displayDiv.style.display = 'block';
        }
        displayDiv.style.setProperty('display', 'block', 'important');
        displayDiv.style.setProperty('z-index', '100000', 'important');
        displayDiv.style.setProperty('background-color', 'rgba(100, 0, 0, 0.9)', 'important'); // Reddish tint
        console.log('GeoFS Taxi Charts: Chart display panel forced visible.');
    }

    function hideChart() {
        document.getElementById(CHART_DISPLAY_ID).style.display = 'none';
        console.log('GeoFS Taxi Charts: Chart display panel hidden.');
    }

    function toggleSearchPanel() {
        const searchPanel = document.getElementById(SEARCH_PANEL_ID);
        const icaoInput = document.getElementById('geofs-icao-search-input');

        if (!searchPanel) {
            console.error('GeoFS Taxi Charts: Search panel div not found!');
            return;
        }

        if (searchPanel.style.display === 'block') {
            // Panel is currently open, so close it
            searchPanel.style.display = 'none';
        } else {
            // Panel is currently closed, so open it and populate with last search
            searchPanel.style.display = 'block';
            if (icaoInput) {
                icaoInput.value = lastSearchedIcao; // Set the input value to the last searched ICAO
                icaoInput.focus(); // Optionally focus the input when panel opens
            }
        }
        console.log(`GeoFS Taxi Charts: Search panel display set to: ${searchPanel.style.display}`);
    }

    // --- Core UI Creation / Re-creation Logic ---
    function createModButtonAndPanels() {
        const targetPanel = document.querySelector('.geofs-ui-right');
        const referenceElement = document.querySelector('.geofs-pads-container'); // Element we want to insert before
        let modButton = document.getElementById(MOD_BUTTON_ID);

        if (!targetPanel) {
            return false;
        }

        // Only create if it doesn't exist AND the reference element is found
        if (!modButton && referenceElement) {
            modButton = document.createElement('button');
            modButton.id = MOD_BUTTON_ID;
            modButton.className = 'geofs-button geofs-icon';
            modButton.innerHTML = '&#x1F50D;'; // Magnifying glass icon (Unicode)
            modButton.title = 'Search Airport Taxi Charts';
            modButton.onclick = toggleSearchPanel;

            // Basic styling for GeoFS button, adjust margins as needed
            modButton.style.cssText = `
                font-size: 1.2em;
                padding: 5px 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 40px;
                line-height: 40px;
                margin-left: 5px; /* Spacing from the left */
                margin-bottom: 10px; /* Spacing above the pads container */
                box-sizing: border-box;
                z-index: 999;
                background-color: grey !important; /* Blue for 'attempted re-insertion' */
                transparency: 50%
                color: white !important;
                border: 2px solid white !important;
                box-shadow: 0 0 10px rgba(255,255,0,0.5) !important;
            `;

            targetPanel.insertBefore(modButton, referenceElement); // Insert before the pads container
            console.log('GeoFS Taxi Charts: Mod button CREATED and inserted before .geofs-pads-container.');
        } else if (modButton && referenceElement && !targetPanel.contains(modButton)) {
            // If button exists but detached and reference element is there, re-insert
            console.log('GeoFS Taxi Charts: Mod button found but not in .geofs-ui-right or not before .geofs-pads-container. Re-inserting.');
            targetPanel.insertBefore(modButton, referenceElement);
            modButton.style.backgroundColor = '#FF5733 !important'; // Orange for 're-inserted'
        } else if (modButton && targetPanel.contains(modButton)) {
            // If button exists and is already in the right place, keep its color green
            // console.log('GeoFS Taxi Charts: Mod button already exists and is correctly placed.');
            modButton.style.backgroundColor = '#4CAF50 !important'; // Green for 'stable'
        } else if (!referenceElement) {
            console.warn('GeoFS Taxi Charts: .geofs-pads-container not found. Cannot precisely place button. Appending to .geofs-ui-right instead.');
            // Fallback: If pads container isn't there, just append to .geofs-ui-right
            if (!modButton) {
                modButton = document.createElement('button');
                modButton.id = MOD_BUTTON_ID;
                modButton.className = 'geofs-button geofs-icon';
                modButton.innerHTML = '&#x1F50D;';
                modButton.title = 'Search Airport Taxi Charts';
                modButton.onclick = toggleSearchPanel;
                modButton.style.cssText = `
                    font-size: 1.2em; padding: 5px 10px; display: flex; align-items: center;
                    justify-content: center; height: 40px; line-height: 40px; margin-left: 5px;
                    box-sizing: border-box; z-index: 999; background-color: #008CBA !important;
                    color: white !important; border: 2px solid yellow !important;
                    box-shadow: 0 0 10px rgba(255,255,0,0.5) !important;
                `;
            }
            targetPanel.appendChild(modButton);
        }


        const checkButton = document.getElementById(MOD_BUTTON_ID);
        if (checkButton) {
            const computedStyle = window.getComputedStyle(checkButton);
            if (computedStyle.display === 'none' || computedStyle.opacity === '0' || computedStyle.visibility === 'hidden' || parseInt(computedStyle.width) === 0 || parseInt(computedStyle.height) === 0) {
                console.warn('GeoFS Taxi Charts: WARNING: Mod button appears to be hidden or zero-sized. Forcing visibility.');
                checkButton.style.setProperty('display', 'flex', 'important');
                checkButton.style.setProperty('opacity', '1', 'important');
                checkButton.style.setProperty('visibility', 'visible', 'important');
                checkButton.style.setProperty('width', '40px', 'important');
                checkButton.style.setProperty('height', '40px', 'important');
            }
        }
        return true;
    }

function createOtherUIElements() {
        if (document.getElementById(SEARCH_PANEL_ID) && document.getElementById(CHART_DISPLAY_ID)) {
            return;
        }

        console.log('GeoFS Taxi Charts: Creating search panel and chart display.');

        const searchPanel = document.createElement('div');
        searchPanel.id = SEARCH_PANEL_ID;
        searchPanel.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.95); border: 2px solid #555; padding: 25px;
            z-index: 100002; color: white; display: none; border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5); text-align: center;
            min-width: 300px;
        `;
        document.body.appendChild(searchPanel);

        const closeSearchButton = document.createElement('button');
        closeSearchButton.innerText = 'X';
        closeSearchButton.style.cssText = `
            position: absolute; top: 8px; right: 8px;
            background: rgba(255, 255, 255, 0.2); border: none; color: white;
            font-size: 1.5em; cursor: pointer; width: 35px; height: 35px; border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            transition: background-color 0.2s;
        `;
        closeSearchButton.onmouseover = function() { this.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'; };
        closeSearchButton.onmouseout = function() { this.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; };
        closeSearchButton.onclick = toggleSearchPanel; // Close search panel
        searchPanel.appendChild(closeSearchButton);

        const inputLabel = document.createElement('label');
        inputLabel.innerText = 'Enter ICAO Code: ';
        inputLabel.style.marginRight = '10px';
        inputLabel.style.fontSize = '1.1em';
        searchPanel.appendChild(inputLabel);

        const icaoInput = document.createElement('input');
        icaoInput.id = 'geofs-icao-search-input';
        icaoInput.type = 'text';
        icaoInput.placeholder = 'e.g., EGLL, KSFO';
        icaoInput.style.cssText = `
            padding: 10px; border: 1px solid #777; background-color: #333;
            color: white; border-radius: 5px; margin-right: 10px;
            width: 150px; text-transform: uppercase; font-size: 1em;
        `;

        // --- NEW CODE FOR EVENT STOPPING ---
        icaoInput.addEventListener('keydown', (event) => {
            event.stopPropagation(); // Prevent the event from bubbling up to the game
        });
        icaoInput.addEventListener('keyup', (event) => {
            event.stopPropagation(); // Prevent the event from bubbling up to the game
        });
        // You might also want to stop 'keypress'
        icaoInput.addEventListener('keypress', (event) => {
            event.stopPropagation(); // Prevent the event from bubbling up to the game
        });
        // --- END NEW CODE ---

        icaoInput.addEventListener('keypress', (event) => { // This listener was already here, keep it for 'Enter' key
            if (event.key === 'Enter') {
                searchButton.click();
            }
        });
        searchPanel.appendChild(icaoInput);

        const searchButton = document.createElement('button');
        searchButton.innerText = 'Search';
        searchButton.className = 'geofs-button';
        searchButton.style.cssText = `
            padding: 10px 20px; font-size: 1em; border-radius: 5px;
            background-color: #007bff; color: white; border: none; cursor: pointer;
            transition: background-color 0.2s;
        `;
        searchButton.onmouseover = function() { this.style.backgroundColor = '#0056b3'; };
        searchButton.onmouseout = function() { this.style.backgroundColor = '#007bff'; };
        searchButton.onclick = () => {
            const icao = icaoInput.value.trim().toUpperCase();
            if (icao) {
                lastSearchedIcao = icao; // Store the searched ICAO
                displayChart(icao);
                toggleSearchPanel(); // Close the search panel
            } else {
                alert('Please enter an ICAO code.');
            }
        };
        searchPanel.appendChild(searchButton);

        const chartDisplayDiv = document.createElement('div');
        chartDisplayDiv.id = CHART_DISPLAY_ID;
        chartDisplayDiv.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.85); border: 2px solid #555; padding: 15px;
            z-index: 100000; max-width: 95vw; max-height: 95vh; overflow: auto;
            color: white; display: none; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        document.body.appendChild(chartDisplayDiv);

        const closeChartButton = document.createElement('button');
        closeChartButton.innerText = 'X';
        closeChartButton.style.cssText = `
            position: absolute; top: 8px; right: 8px;
            background: rgba(255, 255, 255, 0.2); border: none; color: white;
            font-size: 1.5em; cursor: pointer; width: 35px; height: 35px; border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            transition: background-color 0.2s;
        `;
        closeChartButton.onmouseover = function() { this.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'; };
        closeChartButton.onmouseout = function() { this.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; };
        closeChartButton.onclick = hideChart;
        chartDisplayDiv.appendChild(closeChartButton);

        GM_addStyle(`
            #${CHART_DISPLAY_ID} img {
                border: 1px solid #777; margin-top: 10px; display: block;
            }
            #${CHART_DISPLAY_ID} p {
                margin: 5px 0; text-align: center;
            }
            .geofs-button {
                background: linear-gradient(to bottom, #4CAF50, #45a049);
                border: 1px solid #4CAF50;
                color: white;
                font-weight: bold;
                text-shadow: 0px 1px 1px rgba(0,0,0,0.3);
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
                height: 40px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0 15px;
            }
            .geofs-button:hover {
                background: linear-gradient(to bottom, #45a049, #3e8e41);
            }
        `);
    }

    // --- Main Execution ---

    loadChartData()
        .then(() => {
            console.log('GeoFS Taxi Charts: Chart data loaded. Starting UI observation and persistence.');

            createModButtonAndPanels();
            createOtherUIElements();

            const observer = new MutationObserver((mutationsList, observer) => {
                const targetPanel = document.querySelector('.geofs-ui-right');
                const referenceElement = document.querySelector('.geofs-pads-container');
                if (targetPanel && referenceElement && !uiCreated) {
                    console.log('GeoFS Taxi Charts: MutationObserver detected .geofs-ui-right and .geofs-pads-container. Triggering button creation/check.');
                    createModButtonAndPanels();
                    createOtherUIElements();
                    uiCreated = true;
                }
            });

            observer.observe(document.documentElement, { childList: true, subtree: true });

            buttonReinsertionInterval = setInterval(() => {
                const modButton = document.getElementById(MOD_BUTTON_ID);
                const targetPanel = document.querySelector('.geofs-ui-right');
                const referenceElement = document.querySelector('.geofs-pads-container');

                if (!targetPanel) {
                    return;
                }

                // Check if button exists and is in the correct parent and position
                const isButtonCorrectlyPlaced = modButton &&
                                                targetPanel.contains(modButton) &&
                                                (referenceElement ? modButton.nextSibling === referenceElement : true); // Check if it's right before reference or just in target if no reference

                if (!isButtonCorrectlyPlaced) {
                    console.warn('GeoFS Taxi Charts: Persistent check: Mod button disappeared or was detached/misplaced from .geofs-ui-right! Attempting re-insertion.');
                    createModButtonAndPanels(); // This will re-insert it
                }
            }, 2000);

            setTimeout(() => {
                if (!uiCreated) {
                    console.warn('GeoFS Taxi Charts: Long timeout triggered. UI not created by observer or interval. Final attempt at creation.');
                    createModButtonAndPanels();
                    createOtherUIElements();
                    uiCreated = true;
                }
            }, 15000);

        })
        .catch(error => {
            console.error('Failed to initialize GeoFS Taxi Charts mod due to data loading error:', error);
            alert('GeoFS Taxi Charts mod could not load airport data. See console for details.');
        });

    document.addEventListener('click', (event) => {
        const searchPanel = document.getElementById(SEARCH_PANEL_ID);
        const chartDisplay = document.getElementById(CHART_DISPLAY_ID);
        const modButton = document.getElementById(MOD_BUTTON_ID);
        const icaoInput = document.getElementById('geofs-icao-search-input'); // Get the input element

        if (searchPanel && searchPanel.style.display === 'block' &&
            !searchPanel.contains(event.target) && event.target !== modButton) {
            console.log('GeoFS Taxi Charts: Closing search panel via outside click, retaining input.');
            // Don't clear icaoInput.value here
            toggleSearchPanel(); // This will now just close the panel
        }

        if (chartDisplay && chartDisplay.style.display === 'block' &&
            !chartDisplay.contains(event.target) && event.target !== modButton && !searchPanel.contains(event.target) ) {
             console.log('GeoFS Taxi Charts: Closing chart display via outside click.');
             hideChart();
        }
    });

    window.addEventListener('beforeunload', () => {
        if (buttonReinsertionInterval) {
            clearInterval(buttonReinsertionInterval);
            console.log('GeoFS Taxi Charts: Cleared re-insertion interval.');
        }
    });

})();