import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";

import { getRawDataFromQuicksilver } from "../services/quicksilver";
import { WeatherData } from "../types/depin";

class WeatherDataProvider {
    async getRandomCityWeather(
        runtime: IAgentRuntime
    ): Promise<WeatherData | null> {
        const citiesArray = this.getCitiesArray(runtime);
        const randomCity = this.pickRandomCity(citiesArray);
        const coordinates = await this.getCoordinates(randomCity);
        const weather = await this.getWeatherData(coordinates);

        return weather;
    }

    pickRandomCity(citiesArray: string[]) {
        return citiesArray[Math.floor(Math.random() * citiesArray.length)];
    }

    getCitiesArray(runtime: IAgentRuntime) {
        const cities = runtime.getSetting("WEATHER_CITIES") || "";
        if (!cities) {
            throw new Error("WEATHER_CITIES is not set");
        }
        return cities.split(",");
    }

    async getCoordinates(city: string) {
        const coordinates = await getRawDataFromQuicksilver("mapbox", {
            location: city,
        });
        return coordinates;
    }

    async getWeatherData(coordinates: { lat: number; lon: number }) {
        const weather = await getRawDataFromQuicksilver("weather-current", {
            lat: coordinates.lat,
            lon: coordinates.lon,
        });
        return weather;
    }

    static formatWeatherData(weather: WeatherData) {
        return `
            #### **Current Weather for ${weather.location_name}**
            Temperature: ${weather.temperature}°C
            Condition: ${weather.condition}
            Condition Description: ${weather.condition_desc}
            Condition Code: ${weather.condition_code}
            Temperature Min: ${weather.temperature_min}°C
            Temperature Max: ${weather.temperature_max}°C
            Feels Like: ${weather.feels_like}°C
            Pressure: ${weather.pressure} hPa
            Humidity: ${weather.humidity}%
            Wind Speed: ${weather.wind_speed} km/h
            Wind Direction: ${weather.wind_direction}°
            UV Index: ${weather.uv}
            Luminance: ${weather.luminance} lx
            Elevation: ${weather.elevation} m
            Rain: ${weather.rain} mm
            Wet Bulb: ${weather.wet_bulb}°C
        `;
    }
}

export const weatherDataProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        try {
            const weatherDataProvider = new WeatherDataProvider();
            const weather =
                await weatherDataProvider.getRandomCityWeather(runtime);
            return WeatherDataProvider.formatWeatherData(weather);
        } catch (error) {
            elizaLogger.error("Error fetching weather data:", error.message);
            return null;
        }
    },
};
