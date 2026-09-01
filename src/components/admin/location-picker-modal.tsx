'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Crosshair, X, Check, ExternalLink, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    google?: any;
  }
}

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (location: { name: string; latitude: number; longitude: number }) => Promise<void> | void;
  initialLocation?: { name?: string; latitude: number; longitude: number } | null;
  radiusMeters?: number;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  initialLocation,
  radiusMeters = 200,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [locationName, setLocationName] = useState<string>(
    initialLocation?.name || 'Main Office — Kathmandu'
  );
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLocation?.latitude || 27.7172453,
    lng: initialLocation?.longitude || 85.3239605,
  });
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);

  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const circleInstanceRef = useRef<any>(null);

  // Update state when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setLocationName(initialLocation.name || 'Main Office');
      setSelectedCoords({
        lat: Number(initialLocation.latitude) || 27.7172453,
        lng: Number(initialLocation.longitude) || 85.3239605,
      });
    }
  }, [initialLocation, isOpen]);

  // Load Google Maps Script
  useEffect(() => {
    if (!isOpen) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setLoadError('Google Maps API key is missing. Please check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local');
      return;
    }

    if (window.google?.maps) {
      initMap();
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initMap();
      };
      script.onerror = () => {
        setLoadError('Failed to load Google Maps script. Please check your network or API key.');
      };
      document.head.appendChild(script);
    } else {
      // Script is already in DOM, check periodically if google.maps is ready
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, [isOpen]);

  const updateCoordinates = (lat: number, lng: number, updateMap = false) => {
    setSelectedCoords({ lat, lng });

    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition({ lat, lng });
    }
    if (circleInstanceRef.current) {
      circleInstanceRef.current.setCenter({ lat, lng });
    }
    if (updateMap && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
    }
  };

  const initMap = () => {
    if (!mapContainerRef.current || !window.google?.maps) return;

    try {
      const center = selectedCoords;

      const map = new window.google.maps.Map(mapContainerRef.current, {
        center,
        zoom: 17,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }],
          },
        ],
      });
      mapInstanceRef.current = map;

      // Draggable Marker
      const marker = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
        title: 'Office Location Pin (Drag to refine position)',
        animation: window.google.maps.Animation.DROP,
      });
      markerInstanceRef.current = marker;

      // Geofence Radius Circle Overlay
      const circle = new window.google.maps.Circle({
        map,
        center,
        radius: radiusMeters,
        fillColor: '#8b5cf6',
        fillOpacity: 0.2,
        strokeColor: '#7c3aed',
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });
      circleInstanceRef.current = circle;

      // Drag event on Marker
      marker.addListener('dragend', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        updateCoordinates(lat, lng, false);
      });

      // Click event on Map to move marker
      map.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        updateCoordinates(lat, lng, false);
      });

      // Places Search Autocomplete
      if (searchInputRef.current && window.google.maps.places) {
        const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current);
        autocomplete.bindTo('bounds', map);

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place.geometry || !place.geometry.location) return;

          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          if (place.name && !locationName) {
            setLocationName(place.name);
          }

          updateCoordinates(lat, lng, true);
          map.setZoom(17);
        });
      }

      setIsMapLoaded(true);
    } catch (err: any) {
      console.error('Map init error:', err);
      setLoadError('Error initializing Google Map: ' + (err.message || ''));
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateCoordinates(lat, lng, true);
        setIsLocatingUser(false);
      },
      (err) => {
        alert('Could not detect location: ' + err.message);
        setIsLocatingUser(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!locationName.trim()) {
      alert('Please enter a location name (e.g. Main Office — Kathmandu)');
      return;
    }

    try {
      setIsSaving(true);
      await onSelectLocation({
        name: locationName.trim(),
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
      });
      onClose();
    } catch (err: any) {
      alert('Failed to save location: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Set Office Building on Google Maps
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Search place, click on map, or drag the purple pin to set exact office building coordinates.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Location Name Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Location Name Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              Office Building Name:
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <Building2 className="w-4 h-4 text-purple-600 shrink-0" />
              <input
                type="text"
                placeholder="e.g. Main Office — Kathmandu"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent focus:outline-none text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Places Search Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              Search Place or Landmark:
            </label>
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search Kathmandu, Putalisadak, Baneshwor..."
                className="w-full text-xs bg-transparent focus:outline-none text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Map View Area */}
        <div className="relative flex-1 min-h-[380px] bg-slate-100 dark:bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

          {/* Quick Floating Action: Use Current GPS */}
          <div className="absolute top-3 right-3 z-10">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleUseCurrentGps}
              disabled={isLocatingUser}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-md text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50 text-xs font-bold gap-1.5"
            >
              {isLocatingUser ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Crosshair className="w-3.5 h-3.5" />
              )}
              <span>Pin to My Current GPS</span>
            </Button>
          </div>

          {/* Loading or Error Overlay */}
          {loadError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/80 text-white text-center gap-3">
              <MapPin className="w-8 h-8 text-rose-500 animate-bounce" />
              <p className="text-sm font-bold text-rose-400">{loadError}</p>
              <p className="text-xs text-slate-400 max-w-md">
                You can still set coordinates manually below if Google Maps cannot load.
              </p>
            </div>
          )}
        </div>

        {/* Footer with Selected Coordinates & Action Buttons */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Pinned Coordinates ({radiusMeters}m Geofence Radius)
            </span>
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Lat: {selectedCoords.lat.toFixed(7)}</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>Lng: {selectedCoords.lng.toFixed(7)}</span>
              <a
                href={`https://maps.google.com/?q=${selectedCoords.lat},${selectedCoords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-purple-600 hover:underline inline-flex items-center gap-0.5 ml-1 text-[11px]"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isSaving}
              isLoading={isSaving}
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 px-6 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Set & Save Location</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};