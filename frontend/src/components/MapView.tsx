import { useEffect, useRef } from "react";
import maplibregl, { Map, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPost {
  id: number;
  name: string;
  type: string;
  lat: number;
  lng: number;
  requiredStrength: number;
  presentCount: number;
}

export interface MapSos {
  id: number;
  lat: number;
  lng: number;
  status: string;
  officerName?: string;
  badgeNo?: string;
}

interface Props {
  centerLat: number;
  centerLng: number;
  posts: MapPost[];
  sosAlerts: MapSos[];
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
}

// Free vector basemap (no API key needed) — swap for HERE/TomTom/Google fused
// tiles in production, matching the Nagpur command-dashboard pattern.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

function postColor(post: MapPost) {
  if (post.presentCount >= post.requiredStrength) return "#0F7A4E"; // fully manned
  if (post.presentCount > 0) return "#D97706"; // understrength
  return "#DC2626"; // vacant
}

export default function MapView({ centerLat, centerLng, posts, sosAlerts, onMapClick, height = "100%" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [centerLng, centerLat],
      zoom: 15,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    if (onMapClick) {
      map.on("click", (e) => onMapClick(e.lngLat.lat, e.lngLat.lng));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render post markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    posts.forEach((post) => {
      const el = document.createElement("div");
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.2)";
      el.style.background = postColor(post);
      el.style.cursor = "pointer";

      const popup = new Popup({ offset: 14 }).setHTML(
        `<strong>${post.name}</strong><br/>${post.type}<br/>Strength: ${post.presentCount}/${post.requiredStrength}`
      );

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([post.lng, post.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });

    sosAlerts
      .filter((a) => a.status !== "resolved")
      .forEach((alert) => {
        const el = document.createElement("div");
        el.textContent = "🆘";
        el.style.fontSize = "26px";
        el.style.filter = "drop-shadow(0 0 3px rgba(220,38,38,0.9))";
        el.style.cursor = "pointer";
        if (alert.status === "open") el.style.animation = "pulse 1s infinite";

        const popup = new Popup({ offset: 14 }).setHTML(
          `<strong>SOS</strong><br/>${alert.officerName ?? "Officer"} (${alert.badgeNo ?? "-"})<br/>Status: ${alert.status}`
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([alert.lng, alert.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });
  }, [posts, sosAlerts]);

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}
