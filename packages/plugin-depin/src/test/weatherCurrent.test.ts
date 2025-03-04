import { describe, expect, it, vi, beforeEach } from "vitest";
import { weatherDataProvider } from "../providers/weatherDataProvider";
import { elizaLogger } from "@elizaos/core";

vi.mock("@elizaos/core", async () => {
    const actual = await vi.importActual("@elizaos/core");
    return {
        ...actual,
        elizaLogger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        },
    };
});

vi.mock("../services/quicksilver", () => ({
    getRawDataFromQuicksilver: vi.fn().mockResolvedValue({
        location_name: "New York",
        temperature: 22.5,
        condition: "Clear",
        condition_desc: "Clear sky",
        condition_code: 800,
        temperature_min: 20.1,
        temperature_max: 24.3,
        feels_like: 23.0,
        pressure: 1013,
        humidity: 65,
        wind_speed: 5.2,
        wind_direction: 180,
        uv: 4,
        luminance: 10000,
        elevation: 0,
        rain: 0,
        wet_bulb: 0,
    }),
}));

import { getRawDataFromQuicksilver } from "../services/quicksilver";

describe("WeatherDataProvider", () => {
    let mockRuntime: any;
    let mockMessage: any;
    let mockState: any;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup mock runtime, message, and state
        mockRuntime = {
            getSetting: vi.fn(),
            cacheManager: {},
        };
        mockMessage = { content: { text: "test message" } };
        mockState = {};
    });

    describe("getWeatherForRandomCity", () => {
        it("should fetch weather data for a random city", async () => {
            mockRuntime.getSetting.mockReturnValue("New York,London,Tokyo");
            (getRawDataFromQuicksilver as any).mockResolvedValueOnce({
                lat: 40.7128,
                lon: -74.006,
            });
            const result = await weatherDataProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(mockRuntime.getSetting).toHaveBeenCalledWith(
                "WEATHER_CITIES"
            );

            expect(getRawDataFromQuicksilver).toHaveBeenCalledWith(
                "weather-current",
                { lat: 40.7128, lon: -74.006 }
            );
            expect(result).toEqual(
                `
            #### **Current Weather for New York**
            Temperature: 22.5°C
            Condition: Clear
            Condition Description: Clear sky
            Condition Code: 800
            Temperature Min: 20.1°C
            Temperature Max: 24.3°C
            Feels Like: 23°C
            Pressure: 1013 hPa
            Humidity: 65%
            Wind Speed: 5.2 km/h
            Wind Direction: 180°
            UV Index: 4
            Luminance: 10000 lx
            Elevation: 0 m
            Rain: 0 mm
            Wet Bulb: 0°C
        `
            );
        });

        it("should return null when WEATHER_CITIES is not set", async () => {
            mockRuntime.getSetting.mockReturnValue("");

            const result = await weatherDataProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(elizaLogger.error).toHaveBeenCalledWith(
                "Error fetching weather data:",
                "WEATHER_CITIES is not set"
            );
            expect(result).toBeNull();
        });

        it("should handle errors from getRawDataFromQuicksilver", async () => {
            (getRawDataFromQuicksilver as any).mockRejectedValueOnce(
                new Error("Quicksilver error")
            );

            const result = await weatherDataProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );
            expect(result).toBeNull();
        });
    });
    it("should handle errors in getWeatherForRandomCity", async () => {
        mockRuntime.getSetting.mockReturnValue("New York");
        (getRawDataFromQuicksilver as any).mockRejectedValueOnce(
            new Error("Quicksilver error")
        );

        const result = await weatherDataProvider.get(
            mockRuntime,
            mockMessage,
            mockState
        );

        expect(result).toBeNull();
        expect(elizaLogger.error).toHaveBeenCalled();
    });
});
