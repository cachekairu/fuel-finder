let map;
let userLocation = null;
let markers = [];
let userMarker = null;
let directionsService;
let directionsRenderer;

function initMap() {
    const defaultLocation = { lat: 14.5869, lng: 121.1758 };
    
    // Clean and minimalist light map style
    const lightMapStyle = [
        {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }] // Hide POI clutter for a cleaner view
        },
        {
            featureType: "transit",
            stylers: [{ visibility: "off" }]
        }
    ];

    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 14,
        styles: lightMapStyle,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    const findButton = document.getElementById("findBtn");
    if (findButton) {
        findButton.addEventListener("click", findGasStations);
    }
}

function findGasStations() {
    if (!navigator.geolocation) {
        alert("Your browser does not support geolocation.");
        return;
    }

    const stationList = document.getElementById("stationList");
    const stationCount = document.getElementById("stationCount");
    
    stationList.innerHTML = `<div class="empty-state"><p>📍 Getting your location...</p></div>`;
    stationCount.textContent = "Locating...";

    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            map.setCenter(userLocation);
            map.setZoom(15);

            if (userMarker) {
                userMarker.setMap(null);
            }

            // High-visibility Custom User Marker (Blue circle with white border)
            userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: "You are here",
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: "#2563eb",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 4
                },
                zIndex: 999
            });

            searchGasStations();
        },
        function(error) {
            console.error("Location error:", error);
            stationList.innerHTML = `<div class="empty-state"><p>❌ Unable to get your location.</p></div>`;
            stationCount.textContent = "0 found";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

async function searchGasStations() {
    const stationList = document.getElementById("stationList");
    const stationCount = document.getElementById("stationCount");

    stationList.innerHTML = `<div class="empty-state"><p>⛽ Searching nearby gas stations...</p></div>`;

    try {
        const { Place } = await google.maps.importLibrary("places");

        const request = {
            fields: ["displayName", "location", "formattedAddress"],
            locationRestriction: {
                center: userLocation,
                radius: 5000
            },
            includedPrimaryTypes: ["gas_station"],
            maxResultCount: 5
        };

        const result = await Place.searchNearby(request);
        const places = result.places;

        if (!places || places.length === 0) {
            stationList.innerHTML = `<div class="empty-state"><p>⛽ No gas stations found nearby.</p></div>`;
            stationCount.textContent = "0 found";
            return;
        }

        markers.forEach(marker => marker.setMap(null));
        markers = [];
        stationList.innerHTML = "";
        stationCount.textContent = `${places.length} found`;

        places.sort((a, b) => {
            const distA = calculateDistance(userLocation.lat, userLocation.lng, a.location.lat(), a.location.lng());
            const distB = calculateDistance(userLocation.lat, userLocation.lng, b.location.lat(), b.location.lng());
            return distA - distB;
        });

        places.forEach((place, index) => {
            createStationCard(place, index);
        });

    } catch (error) {
        console.error("Gas station search error:", error);
        stationList.innerHTML = `<div class="empty-state"><p>❌ Unable to load gas stations.</p></div>`;
        stationCount.textContent = "0 found";
    }
}

function createStationCard(place, index) {
    const stationList = document.getElementById("stationList");
    const distance = calculateDistance(userLocation.lat, userLocation.lng, place.location.lat(), place.location.lng());

    const lat = place.location.lat();
    const lng = place.location.lng();

    // High-visibility Custom Gas Station Marker (Amber pin)
    const marker = new google.maps.Marker({
        map: map,
        position: place.location,
        title: place.displayName,
        icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 1.5,
            anchor: new google.maps.Point(12, 22)
        }
    });

    markers.push(marker);

    marker.addListener("click", () => {
        focusStation(place.location);
    });

    const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    const card = document.createElement("div");
    card.className = "station-card";
    card.innerHTML = `
        <h3>⛽ ${escapeHTML(place.displayName)}</h3>
        <div class="station-info">
            <p>📍 ${escapeHTML(place.formattedAddress || "Address unavailable")}</p>
            <p>📏 ${distance.toFixed(2)} km away</p>
            <p class="fuel-price">🤖 Generating AI price estimate...</p>
        </div>
        <div class="card-actions">
            <button class="map-button" type="button">View on Map</button>
            <a href="${googleMapsNavUrl}" target="_blank" class="direction-button">Get Directions 🧭</a>
        </div>
    `;

    const mapButton = card.querySelector(".map-button");
    mapButton.addEventListener("click", () => {
        focusStation(place.location);
    });

    stationList.appendChild(card);

    setTimeout(() => {
        loadFuelPrice(card, place.displayName, place.formattedAddress);
    }, index * 500);
}

function focusStation(location) {
    map.setCenter(location);
    map.setZoom(17);
    document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "start" });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function escapeHTML(text) {
    if (text === null || text === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}

async function loadFuelPrice(card, station, location) {
    const priceElement = card.querySelector(".fuel-price");

    try {
        const response = await fetch("/estimate-price", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ station, location })
        });

        const data = await response.json();

        if (data.success) {
            priceElement.innerHTML = `💰 ${escapeHTML(data.result)}`;
        } else {
            priceElement.innerHTML = `💰 <strong>Price estimation unavailable</strong>`;
        }
    } catch (error) {
        console.error("Price fetch error:", error);
        priceElement.innerHTML = `💰 <strong>Price estimation unavailable</strong>`;
    }
}

window.initMap = initMap;