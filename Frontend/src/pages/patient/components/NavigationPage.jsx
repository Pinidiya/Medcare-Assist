import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { ArrowLeft, Navigation, Loader2, Map as MapIcon } from 'lucide-react';

// Fix default marker icon issue in leaflet with webpack/vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function RoutingMachine({ startCoords, endCoords }) {
  const map = useMap();

  const startLat = startCoords?.[0];
  const startLng = startCoords?.[1];
  const endLat = endCoords?.[0];
  const endLng = endCoords?.[1];

  useEffect(() => {
    if (!map || !startLat || !startLng || !endLat || !endLng) return;

    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(startLat, startLng),
        L.latLng(endLat, endLng)
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#2563EB', weight: 6 }]
      },
      createMarker: function(i, wp, nWps) {
        if (i === 0) {
          return L.marker(wp.latLng).bindPopup('<b>Your Location</b>');
        } else if (i === nWps - 1) {
          return L.marker(wp.latLng).bindPopup('<b>Pharmacy Location</b>');
        }
      }
    }).addTo(map);

    return () => {
      try {
        map.removeControl(routingControl);
      } catch (e) {
        // Handle cleanup error silently
      }
    };
  }, [map, startLat, startLng, endLat, endLng]);

  return null;
}

export default function NavigationPage({ pharmacyData, onBack }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Expect state to pass pharmacy details (name, address, lat, lng)
  const [pharmacy, setPharmacy] = useState(pharmacyData || location.state?.pharmacy || null);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);

  useEffect(() => {
    let activePharmacy = pharmacy;

    // Check query params if state is not present
    if (!activePharmacy) {
      const params = new URLSearchParams(location.search);
      const lat = parseFloat(params.get('lat'));
      const lng = parseFloat(params.get('lng'));
      const name = params.get('name');
      const address = params.get('address');
      const pin = params.get('pin');
      
      if (lat && lng) {
        const queryPharmacy = {
          name: name || 'Pharmacy Center',
          address: address || 'Pharmacy Location',
          pin: pin || null,
          lat,
          lng
        };
        setPharmacy(queryPharmacy);
        activePharmacy = queryPharmacy;
      }
    }

    // No pharmacy data available - go back
    if (!activePharmacy) {
      alert('Location not available for this pharmacy.');
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/patient/dashboard');
      }
      return;
    }

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location", error);
          // Fallback to Colombo
          setUserLocation([6.9271, 79.8612]);
          setLoadingLocation(false);
        }
      );
    } else {
      setUserLocation([6.9271, 79.8612]);
      setLoadingLocation(false);
    }
  }, [pharmacy, location.search]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      window.close();
    }
  };

  // If no user location yet, show loader
  if (loadingLocation) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] animate-fadeIn">
        <Loader2 className="w-12 h-12 text-[#1A73E8] spin mb-4" />
        <p className="text-[#0F172A] font-semibold text-lg">Finding your location...</p>
        <p className="text-sm text-[#64748B] mt-2">Make sure location services are enabled.</p>
      </div>
    );
  }

  const pharmacyCoords = pharmacy ? [pharmacy.lat, pharmacy.lng] : null;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Clean Header */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <button 
          onClick={handleBack} 
          className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5 flex-1 truncate">
          <Navigation className="w-4 h-4 text-[#1A73E8]" /> 
          Navigating to {pharmacy?.name}
        </h2>
        
        {pharmacy?.pin && (
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 shrink-0">
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Pickup PIN:</span>
            <span className="text-base font-black text-emerald-700 tracking-[0.1em]">{pharmacy.pin}</span>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 overflow-hidden h-[65vh] relative z-0">
        {userLocation && pharmacyCoords && (
          <MapContainer 
            center={userLocation} 
            zoom={13} 
            style={{ height: '100%', width: '100%', borderRadius: '12px' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RoutingMachine startCoords={userLocation} endCoords={pharmacyCoords} />
          </MapContainer>
        )}
        
        <div className="absolute bottom-6 right-6 z-[1000] bg-white p-4 rounded-2xl shadow-xl border border-gray-100 max-w-xs">
          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-2">
            <MapIcon className="w-4 h-4 text-blue-600" /> Route Info
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            The blue line indicates the fastest route to the pharmacy. Keep following the path indicated on the map.
          </p>
        </div>
      </div>
    </div>
  );
}
