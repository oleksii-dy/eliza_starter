export interface VolatilityPrediction {
    timestamp: number;
    timestamp_str: string;
    volatility: number;
}

export interface StatePrediction {
    timestamp: number;
    timestamp_str: string;
    classification: string;
    classification_description: string;
}

export enum Horizons {
    min1 = '1min',
    min60 = '60min',
}
