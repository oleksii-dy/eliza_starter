// src/services/geocoding.ts

import { Coordinates } from '../types';

// Option 1: Using Nominatim (OpenStreetMap)
export const createNominatimGeocoder = () => {
    const geocodeLocation = async (city: string, country: string): Promise<Coordinates> => {
        try {
            const query = encodeURIComponent(`${city}, ${country}`);
            const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': '@elizaos/plugin-meersens' // Required by Nominatim ToS
                }
            });

            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data || data.length === 0) {
                throw new Error(`No results found for ${city}, ${country}`);
            }

            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
        } catch (error) {
            console.error('Geocoding Error:', error.message);
            throw error;
        }
    };

    return { geocodeLocation };
};

// Option 2: Using OpenCage
export const createOpenCageGeocoder = (apiKey: string) => {
    const geocodeLocation = async (city: string, country: string): Promise<Coordinates> => {
        try {
            const query = encodeURIComponent(`${city}, ${country}`);
            const url = `https://api.opencagedata.com/geocode/v1/json?q=${query}&key=${apiKey}&limit=1`;
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                throw new Error(`No results found for ${city}, ${country}`);
            }

            const { lat, lng } = data.results[0].geometry;
            return { lat, lng };
        } catch (error) {
            console.error('Geocoding Error:', error.message);
            throw error;
        }
    };

    return { geocodeLocation };
};

// Cache wrapper to reduce API calls
export const createCachedGeocoder = (geocoder: { geocodeLocation: (city: string, country: string) => Promise<Coordinates> }) => {
    const cache = new Map<string, Coordinates>();
    
    const geocodeLocation = async (city: string, country: string): Promise<Coordinates> => {
        const key = `${city.toLowerCase()},${country.toLowerCase()}`;
        
        if (cache.has(key)) {
            return cache.get(key)!;
        }
        
        const coordinates = await geocoder.geocodeLocation(city, country);
        cache.set(key, coordinates);
        return coordinates;
    };

    return { geocodeLocation };
};

