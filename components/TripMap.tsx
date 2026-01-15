import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Spot } from '../types';
import { Navigation, MapPin } from 'lucide-react';

// Fix for default marker icon in Leaflet + Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
    spots: Spot[];
    activeSpotId?: string | null;
}

// Component to handle map view updates
const MapUpdater: React.FC<{ spots: Spot[] }> = ({ spots }) => {
    const map = useMap();

    useEffect(() => {
        if (spots.length > 0) {
            const coords = spots
                .filter(s => s.lat !== undefined && s.lng !== undefined)
                .map(s => [s.lat!, s.lng!] as L.LatLngExpression);

            if (coords.length > 0) {
                const bounds = L.latLngBounds(coords);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
            }
        }
    }, [spots, map]);

    return null;
};

const TripMap: React.FC<Props> = ({ spots, activeSpotId }) => {
    const [routeCoords, setRouteCoords] = useState<L.LatLngExpression[]>([]);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    const spotsWithCoords = spots.filter(s => s.lat !== undefined && s.lng !== undefined);

    useEffect(() => {
        const fetchRoute = async () => {
            if (spotsWithCoords.length < 2) {
                setRouteCoords([]);
                return;
            }

            setIsLoadingRoute(true);
            try {
                // Construct OSRM API URL
                // Format: lng,lat;lng,lat
                const coordinates = spotsWithCoords
                    .map(s => `${s.lng},${s.lat}`)
                    .join(';');

                const response = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
                );
                const data = await response.json();

                if (data.code === 'Ok' && data.routes && data.routes[0]) {
                    // OSRM returns [lng, lat], Leaflet needs [lat, lng]
                    const coords = data.routes[0].geometry.coordinates.map((coord: [number, number]) =>
                        [coord[1], coord[0]] as L.LatLngExpression
                    );
                    setRouteCoords(coords);
                } else {
                    // Fallback to straight lines if API fails
                    setRouteCoords(spotsWithCoords.map(s => [s.lat!, s.lng!] as L.LatLngExpression));
                }
            } catch (error) {
                console.error('Failed to fetch route:', error);
                // Fallback to straight lines
                setRouteCoords(spotsWithCoords.map(s => [s.lat!, s.lng!] as L.LatLngExpression));
            } finally {
                setIsLoadingRoute(false);
            }
        };

        fetchRoute();
    }, [spots]);

    const handleOpenNavigation = (spot: Spot) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`;
        window.open(url, '_blank');
    };

    return (
        <div className="w-full h-full min-h-[400px] rounded-[2rem] overflow-hidden shadow-inner border border-slate-100 relative">
            {isLoadingRoute && (
                <div className="absolute top-4 right-4 z-[1000] bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-slate-200 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-bold text-slate-600">正在規劃最佳路線...</span>
                </div>
            )}
            <MapContainer
                center={[35.6895, 139.6917]} // Default to Tokyo if no spots
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {spotsWithCoords.map((spot, index) => (
                    <Marker
                        key={spot.id}
                        position={[spot.lat!, spot.lng!]}
                    >
                        <Popup className="custom-popup">
                            <div className="p-1">
                                <h4 className="font-black text-slate-800 text-base mb-1">{spot.name}</h4>
                                <div className="flex items-center text-xs text-slate-500 mb-2">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    第 {index + 1} 站 · {spot.startTime}
                                </div>
                                <button
                                    onClick={() => handleOpenNavigation(spot)}
                                    className="w-full bg-blue-600 text-white py-2 rounded-xl text-xs font-black flex items-center justify-center hover:bg-blue-700 transition-colors"
                                >
                                    <Navigation className="w-3 h-3 mr-2" />
                                    Google 地圖導航
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {routeCoords.length > 1 && (
                    <Polyline
                        positions={routeCoords}
                        color="#3b82f6"
                        weight={5}
                        opacity={0.8}
                        lineJoin="round"
                    />
                )}

                <MapUpdater spots={spots} />
            </MapContainer>
        </div>
    );
};

export default TripMap;
