import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { useApi } from '../../utils/api';
import { RotateCw } from 'lucide-react';

const SERENGETI_BOUNDS = [[-2.8, 34.4], [-0.9, 35.8]]; // [southWest, northEast]
const SERENGETI_CENTER = [-1.85, 35.1];

function HeatLayer({ points, intensity = 0.8 }) {
  const map = useMap();

  useEffect(() => {
    if (!map) {
      console.warn('⚠️  Map not ready');
      return;
    }

    console.log('🔄 HeatLayer updating with', points?.length || 0, 'points');

    // Remove existing heat layers (if any)
    map.eachLayer(layer => {
      if (layer && layer._heat) {
        console.log('🗑️  Removing old heat layer');
        map.removeLayer(layer);
      }
    });

    if (!points || points.length === 0) {
      console.log('📭 No points to display');
      return;
    }

    console.log('🎨 Creating heat layer with points:', points.map(p => [p.lat, p.lon]));

    // Convert points to heat layer format: [lat, lng, intensity]
    const heatPoints = points.map(p => {
      const lat = parseFloat(p.lat);
      const lon = parseFloat(p.lon);
      console.log(`  Point: [${lat}, ${lon}] intensity: ${intensity}`);
      return [lat, lon, intensity];
    });

    const heat = L.heatLayer(heatPoints, {
      radius: 50,
      blur: 40,
      maxZoom: 18,
      minOpacity: 0.3,
      gradient: {
        0.0: '#0000ff',    // blue
        0.2: '#00ff00',    // green
        0.4: '#ffff00',    // yellow
        0.6: '#ff8800',    // orange
        0.8: '#ff0000',    // red
        1.0: '#ffffff'     // white
      }
    });
    
    // mark for removal detection
    heat._heat = true;
    heat.addTo(map);
    console.log('✅ Heat layer added to map');

    return () => {
      console.log('🧹 Cleaning up heat layer');
      heat.remove();
    };
  }, [map, points, intensity]);

  return null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export default function HeatmapMap({ className = 'h-[600px] w-full', autoRefresh = true, refreshInterval = 5000 }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { makeRequest } = useApi();
  const refreshTimeoutRef = useRef(null);

  const fetchPoints = async () => {
    try {
      // Use the central API helper so the Clerk token is attached
      const data = await makeRequest('media/heatmap');
      console.log('🗺️  Heatmap API Response:', data);
      setPoints(data.points || []);
      setError(null);
      console.log(`✅ Heatmap loaded: ${data.points?.length || 0} points found`);
      
      if (data.points && data.points.length > 0) {
        console.log('📍 Heatmap Points:', data.points.map(p => ({
          id: p.id,
          lat: p.lat,
          lon: p.lon
        })));
      }
    } catch (e) {
      console.error('❌ Heatmap fetch error:', e);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    console.log('🔄 Manual heatmap refresh triggered');
    setIsRefreshing(true);
    await fetchPoints();
  };

  useEffect(() => {
    fetchPoints();

    // Auto-refresh heatmap data if enabled
    let refreshInterval_id = null;
    if (autoRefresh) {
      refreshInterval_id = setInterval(fetchPoints, refreshInterval);
      console.log(`⏰ Heatmap auto-refresh enabled (interval: ${refreshInterval}ms)`);
    }

    return () => {
      if (refreshInterval_id) {
        clearInterval(refreshInterval_id);
      }
    };
  }, [autoRefresh, refreshInterval, makeRequest]);

  return (
    <div className="relative">
      <div className={className}>
        <MapContainer
          center={SERENGETI_CENTER}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          maxBounds={SERENGETI_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          <HeatLayer points={points} />
        </MapContainer>

        {loading && (
          <div className="absolute right-4 bottom-4 bg-white/95 p-3 rounded shadow-lg border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full border-2 border-gray-300 border-t-green-800 h-4 w-4" />
              <span className="text-sm text-gray-700 font-medium">Loading heatmap...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute right-4 bottom-4 bg-red-50 text-red-700 p-3 rounded shadow-lg border border-red-200">
            <p className="text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="absolute left-4 top-4 bg-white hover:bg-gray-50 text-gray-700 p-2.5 rounded-lg shadow-lg border border-gray-200 transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          title="Refresh heatmap data"
        >
          <RotateCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          <span className="text-sm font-medium hidden sm:inline">Refresh</span>
        </button>

        {/* Data Info */}
        <div className="absolute left-4 bottom-4 bg-white/95 p-3 rounded shadow-lg border border-gray-200">
          <p className="text-xs text-gray-700 font-medium">
            <strong>{points.length}</strong> location{points.length !== 1 ? 's' : ''} detected
          </p>
          {points.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Click Refresh to update
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
