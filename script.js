let map;
let userLocation = null;
let markers = [];
let userMarker = null;
let directionsService;
let directionsRenderer;

function initMap() {
    const defaultLocation = { lat: 14.5869, lng: 121.1758 };
    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 14,
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

            userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: "You are here",
                icon: {
                    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"
                }
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

    const marker = new google.maps.Marker({
        map: map,
        position: place.location,
        title: place.displayName,
        icon: {
            url: "https://maps.google.com/mapfiles/kml/shapes/gas_stations.png",
            scaledSize: new google.maps.Size(32, 32)
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
            <a href="${googleMapsNavUrl}" target="_blank" class="directions-button" style="display:inline-block; margin-left:8px; padding:6px 12px; background:#4285F4; color:white; border-radius:4px; text-decoration:none;">Get Directions 🧭</a>
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

function getDirections(destinationLocation) {
    if (!userLocation) {
        alert("Please find your location first!");
        return;
    }

    const request = {
        origin: userLocation,
        destination: destinationLocation,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(result);
            document.getElementById("map").scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            alert("Could not display directions: " + status);
        }
    });
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