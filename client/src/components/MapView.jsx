import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Lightweight Leaflet map using OpenStreetMap tiles (no API key required).
 * center: [lat, lng]; markers: [{ position: [lat, lng], label?: string }]
 */
export default function MapView({ center, zoom = 13, markers = [], className = 'h-64 w-full rounded-card overflow-hidden z-0' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { scrollWheelZoom: false, zoomControl: true });
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    markers.forEach((m) => {
      if (!m?.position) return;
      const marker = L.marker(m.position).addTo(layer);
      if (m.label) marker.bindPopup(m.label);
    });
  }, [markers]);

  return <div ref={containerRef} className={className} aria-label="Map" />;
}
