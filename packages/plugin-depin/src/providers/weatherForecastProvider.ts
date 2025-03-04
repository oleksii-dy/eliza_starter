import {
    Provider,
    IAgentRuntime,
    Memory,
    State,
    elizaLogger,
} from "@elizaos/core";

import { getRawDataFromQuicksilver } from "../services/quicksilver";
import { WeatherForecast } from "../types/depin";

class WeatherForecastProvider {
    async getRandomCityWeather(
        runtime: IAgentRuntime
    ): Promise<WeatherForecast | null> {
        try {
            const citiesArray = this.getCitiesArray(runtime);
            const randomCity = this.pickRandomCity(citiesArray);
            const coordinates = await this.getCoordinates(randomCity);
            const forecast = await this.getWeatherData(coordinates);

            return forecast;
        } catch (error) {
            throw error;
        }
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
        const forecast = await getRawDataFromQuicksilver("weather-forecast", {
            lat: coordinates.lat,
            lon: coordinates.lon,
        });
        return forecast;
    }

    static formatWeatherData(forecast: WeatherForecast) {
        if (!forecast || forecast.length === 0) {
            return "No forecast data available.";
        }

        let result = `
            #### **Weather Forecast for ${forecast[0].location_name}**
        `;

        forecast.forEach((day) => {
            result += `
            #### Date: ${day.parsed_timestamp}
            Temperature: ${day.temperature}°C
            Condition: ${day.condition}
            Condition Description: ${day.condition_desc}
            Condition Code: ${day.condition_code}
            Temperature Min: ${day.temperature_min}°C
            Temperature Max: ${day.temperature_max}°C
            Feels Like: ${day.feels_like}°C
            Pressure: ${day.pressure} hPa
            Humidity: ${day.humidity}%
            Wind Speed: ${day.wind_speed} km/h
            Wind Direction: ${day.wind_direction}°
            UV Index: ${day.uv}
            Luminance: ${day.luminance} lx
            Sea Level: ${day.sea_level} m
            Rain: ${day.rain} mm
            Wet Bulb: ${day.wet_bulb}°C
            `;
        });

        return result;
    }
}

export const weatherForecastProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        _message: Memory,
        _state?: State
    ): Promise<string | null> {
        try {
            const weatherForecastProvider = new WeatherForecastProvider();
            const forecast = await weatherForecastProvider.getRandomCityWeather(runtime);
            return WeatherForecastProvider.formatWeatherData(forecast);
        } catch (error) {
            elizaLogger.error("Error fetching weather forecast:", error.message);
            return null;
        }
    },
};
