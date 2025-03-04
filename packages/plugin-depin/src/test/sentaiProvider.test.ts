import { describe, expect, it, vi, beforeEach } from "vitest";
import { sentaiProvider, ProviderName } from "../providers/sentai";
import { depinDataProvider } from "../providers/depinData";
import { weatherDataProvider } from "../providers/weatherDataProvider";
import { weatherForecastProvider } from "../providers/weatherForecastProvider";

// Mock the providers
vi.mock("../providers/depinData", () => ({
    depinDataProvider: {
        get: vi.fn().mockResolvedValue("Depin Data Result"),
    },
}));

vi.mock("../providers/weatherDataProvider", () => ({
    weatherDataProvider: {
        get: vi.fn().mockResolvedValue("Weather Data Result"),
    },
}));

vi.mock("../providers/weatherForecastProvider", () => ({
    weatherForecastProvider: {
        get: vi.fn().mockResolvedValue("Weather Forecast Result"),
    },
}));

// Mock the elizaLogger
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

describe("SentaiProvider", () => {
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

    describe("Provider Registry", () => {
        it("should work if SENTAI_SOURCES is not set", async () => {
            mockRuntime.getSetting.mockReturnValue(null);

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(depinDataProvider.get).toHaveBeenCalledTimes(0);
            expect(weatherDataProvider.get).toHaveBeenCalledTimes(0);
            expect(weatherForecastProvider.get).toHaveBeenCalledTimes(0);
            expect(result).toBe("No data sources were specified or available.");
        });

        it("should use sources from SENTAI_SOURCES setting", async () => {
            mockRuntime.getSetting.mockReturnValue(
                `${ProviderName.DEPIN},${ProviderName.WEATHER_CURRENT}`
            );

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(depinDataProvider.get).toHaveBeenCalledTimes(1);
            expect(weatherDataProvider.get).toHaveBeenCalledTimes(1);
            expect(weatherForecastProvider.get).toHaveBeenCalledTimes(0);
            expect(result).toContain("Depin Data Result");
            expect(result).toContain("Weather Data Result");
            expect(result).not.toContain("Weather Forecast Result");
        });

        it("should filter out invalid sources", async () => {
            mockRuntime.getSetting.mockReturnValue(
                `${ProviderName.DEPIN},invalid-source`
            );

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(depinDataProvider.get).toHaveBeenCalledTimes(1);
            expect(weatherDataProvider.get).toHaveBeenCalledTimes(0);
            expect(weatherForecastProvider.get).toHaveBeenCalledTimes(0);
            expect(result).toContain("Depin Data Result");
        });

        it("should return a message when no sources are available", async () => {
            mockRuntime.getSetting.mockReturnValue(
                "invalid-source1,invalid-source2"
            );

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(depinDataProvider.get).toHaveBeenCalledTimes(0);
            expect(weatherDataProvider.get).toHaveBeenCalledTimes(0);
            expect(weatherForecastProvider.get).toHaveBeenCalledTimes(0);
            expect(result).toBe("No data sources were specified or available.");
        });
    });

    describe("Error Handling", () => {
        it("should handle errors from providers", async () => {
            mockRuntime.getSetting.mockReturnValue(ProviderName.DEPIN);
            (depinDataProvider.get as any).mockRejectedValueOnce(
                new Error("Provider error")
            );

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBe("No data sources were specified or available.");
        });

        it("should handle errors with two providers where one provider malfunctions", async () => {
            mockRuntime.getSetting.mockReturnValue(
                `${ProviderName.DEPIN},${ProviderName.WEATHER_CURRENT}`
            );
            (depinDataProvider.get as any).mockRejectedValueOnce(
                new Error("Provider error")
            );

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBe("Weather Data Result");
        });

        it("should handle null results from providers", async () => {
            mockRuntime.getSetting.mockReturnValue(ProviderName.DEPIN);
            (depinDataProvider.get as any).mockResolvedValueOnce(null);

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBe("No data sources were specified or available.");
        });

        it("should handle errors in the sentaiProvider itself", async () => {
            mockRuntime.getSetting.mockImplementation(() => {
                throw new Error("Runtime error");
            });

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBe(null);
        });
    });

    describe("Integration", () => {
        it("should pass runtime, message, and state to providers", async () => {
            mockRuntime.getSetting.mockReturnValue(ProviderName.DEPIN);

            await sentaiProvider.get(mockRuntime, mockMessage, mockState);

            expect(depinDataProvider.get).toHaveBeenCalledWith(
                mockRuntime,
                mockMessage,
                mockState
            );
        });

        it("should combine results from multiple providers", async () => {
            mockRuntime.getSetting.mockReturnValue(
                `${ProviderName.DEPIN},${ProviderName.WEATHER_CURRENT}`
            );

            const result = await sentaiProvider.get(
                mockRuntime,
                mockMessage,
                mockState
            );

            expect(result).toBe("Depin Data Result\n\nWeather Data Result");
        });
    });
});
