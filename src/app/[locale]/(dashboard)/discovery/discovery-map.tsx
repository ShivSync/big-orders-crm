"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const storeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CATEGORY_MARKER_COLORS: Record<string, string> = {
  school: "blue",
  university: "violet",
  company: "grey",
  hotel: "gold",
  event_venue: "orange",
  restaurant: "green",
  club: "yellow",
  hospital: "red",
  government: "black",
  other: "blue",
};

function getCategoryIcon(category: string): L.Icon {
  const color = CATEGORY_MARKER_COLORS[category] || "blue";
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    iconSize: [20, 33],
    iconAnchor: [10, 33],
    popupAnchor: [1, -28],
    shadowSize: [33, 33],
  });
}

interface Store {
  id: string;
  name: string;
  lat: number;
  lng: number;
  territory_radius_km: number;
}

interface Lead {
  id: string;
  full_name: string;
  metadata: {
    lat?: number;
    lng?: number;
    category?: string;
    score?: number;
    distance_km?: number;
  };
}

interface Props {
  stores: Store[];
  leads: Lead[];
  selectedStore: Store | null;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function DiscoveryMap({ stores, leads, selectedStore }: Props) {
  const center: [number, number] = selectedStore
    ? [selectedStore.lat, selectedStore.lng]
    : [16.0, 106.0];
  const zoom = selectedStore ? 14 : 6;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
    >
      <MapUpdater center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {stores.map(store => (
        <Marker
          key={store.id}
          position={[store.lat, store.lng]}
          icon={storeIcon}
        >
          <Popup>
            <strong>{store.name}</strong>
            <br />
            Territory: {store.territory_radius_km} km
          </Popup>
        </Marker>
      ))}

      {selectedStore && (
        <Circle
          center={[selectedStore.lat, selectedStore.lng]}
          radius={selectedStore.territory_radius_km * 1000}
          pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.1 }}
        />
      )}

      {leads.map(lead => {
        if (!lead.metadata?.lat || !lead.metadata?.lng) return null;
        const category = lead.metadata.category || "other";
        return (
          <Marker
            key={lead.id}
            position={[lead.metadata.lat, lead.metadata.lng]}
            icon={getCategoryIcon(category)}
          >
            <Popup>
              <strong>{lead.full_name}</strong>
              <br />
              {lead.metadata.category && <><span style={{ color: CATEGORY_MARKER_COLORS[category] }}>●</span> {lead.metadata.category}<br /></>}
              {lead.metadata.score !== undefined && <>Score: {lead.metadata.score}<br /></>}
              {lead.metadata.distance_km !== undefined && <>Distance: {lead.metadata.distance_km} km</>}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
