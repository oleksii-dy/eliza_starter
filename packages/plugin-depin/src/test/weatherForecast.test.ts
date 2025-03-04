import { describe, expect, it, vi, beforeEach } from "vitest";
import { weatherForecastProvider } from "../providers/weatherForecastProvider";
import { elizaLogger } from "@elizaos/core";

// Mock the external dependencies
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

// Mock the getRawDataFromQuicksilver function
vi.mock("../services/quicksilver", () => ({
    getRawDataFromQuicksilver: vi
        .fn()
        .mockImplementation((endpoint, params) => {
            if (endpoint === "mapbox") {
                return Promise.resolve({ lat: 40.7128, lon: -74.006 });
            } else if (endpoint === "weather-forecast") {
                return Promise.resolve([
                    {
                        location_name: "New York",
                        parsed_timestamp: "2023-06-01",
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
                        sea_level: 0,
                        rain: 0,
                        wet_bulb: 0,
                    },
                    {
                        location_name: "New York",
                        parsed_timestamp: "2023-06-02",
                        temperature: 23.5,
                        condition: "Cloudy",
                        condition_desc: "Partly cloudy",
                        condition_code: 801,
                        temperature_min: 21.1,
                        temperature_max: 25.3,
                        feels_like: 24.0,
                        pressure: 1012,
                        humidity: 68,
                        wind_speed: 4.8,
                        wind_direction: 190,
                        uv: 3,
                        luminance: 9000,
                        sea_level: 0,
                        rain: 0.2,
                        wet_bulb: 0,
                    },
                ]);
            }
            return Promise.reject(new Error("Unknown endpoint"));
        }),
}));

// Import the mocked functions for assertions
import { getRawDataFromQuicksilver } from "../services/quicksilver";

describe("WeatherForecastProvider", () => {
    let mockRuntime: any;
    let mockMessage: any;
    let mockState: any;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup mock runtime, message, and state
        mockRuntime = {
            getSetting: vi.fn().mockReturnValue("New York,London,Tokyo"),
            cacheManager: {},
        };
        mockMessage = { content: { text: "test message" } };
        mockState = {};
    });

    describe("get", () => {
        it("should fetch and format weather forecast data", async () => {
            const result = await weatherForecastProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            // Verify that getRawDataFromQuicksilver was called with the correct parameters
            expect(getRawDataFromQuicksilver).toHaveBeenCalledWith(
                "mapbox",
                expect.any(Object)
            );
            expect(getRawDataFromQuicksilver).toHaveBeenCalledWith(
                "weather-forecast",
                {
                    lat: 40.7128,
                    lon: -74.006,
                }
            );

            // Verify the formatted output
            expect(result).toContain("Weather Forecast for New York");
            expect(result).toContain("Date: 2023-06-01");
            expect(result).toContain("Temperature: 22.5°C");
            expect(result).toContain("Date: 2023-06-02");
            expect(result).toContain("Temperature: 23.5°C");
            expect(result).toContain("Condition: Clear");
            expect(result).toContain("Condition: Cloudy");
        });

        it("should handle errors when WEATHER_CITIES is not set", async () => {
            mockRuntime.getSetting.mockReturnValue("");

            const result = await weatherForecastProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBeNull();
            expect(elizaLogger.error).toHaveBeenCalled();
        });

        it("should handle errors from mapbox service", async () => {
            (getRawDataFromQuicksilver as any).mockImplementationOnce(
                (endpoint) => {
                    if (endpoint === "mapbox") {
                        return Promise.reject(new Error("Mapbox error"));
                    }
                    return Promise.resolve({});
                }
            );

            const result = await weatherForecastProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBeNull();
            expect(elizaLogger.error).toHaveBeenCalledWith(
                "Error fetching weather forecast:",
                "Mapbox error"
            );
        });

        it("should handle errors from weather forecast service", async () => {
            (getRawDataFromQuicksilver as any).mockImplementationOnce(
                (endpoint) => {
                    if (endpoint === "mapbox") {
                        return Promise.resolve({ lat: 40.7128, lon: -74.006 });
                    }
                    return Promise.resolve({});
                }
            );

            (getRawDataFromQuicksilver as any).mockImplementationOnce(
                (endpoint) => {
                    if (endpoint === "weather-forecast") {
                        return Promise.reject(new Error("Weather API error"));
                    }
                    return Promise.resolve({});
                }
            );

            const result = await weatherForecastProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBeNull();
            expect(elizaLogger.error).toHaveBeenCalled();
        });

        it("should handle empty forecast data", async () => {
            (getRawDataFromQuicksilver as any).mockImplementationOnce(
                (endpoint) => {
                    if (endpoint === "mapbox") {
                        return Promise.resolve({ lat: 40.7128, lon: -74.006 });
                    }
                    return Promise.resolve({});
                }
            );

            (getRawDataFromQuicksilver as any).mockImplementationOnce(
                (endpoint) => {
                    if (endpoint === "weather-forecast") {
                        return Promise.resolve([]);
                    }
                    return Promise.resolve({});
                }
            );

            const result = await weatherForecastProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBe("No forecast data available.");
        });
    });
});
