// src/types.ts
export interface Coordinates {
    lat: number;
    lng: number;
}

export interface AirQualityResponse {
    found: boolean;
    datetime: string;
    index: {
      index_type: string;
      index_name: string;
      qualification: string;
      icon: string | null;
      color: string;
      description: string;
      value: number;
      main_pollutants: string[];
    };
    pollutants: {
      [key: string]: {
        shortcode: string;
        name: string;
        unit: string;
        found: boolean;
        value: number;
        confidence: number;
        index: {
          index_type: string;
          index_name: string;
          qualification: string;
          icon: string | null;
          color: string;
          description: string;
          value: number;
        };
      };
    };
    health_recommendations: {
      [key: string]: string;
    };
  }
  

export interface WaterQualityResponse {
    found: boolean;
    datetime: string;
    index: {
      index_type: string;
      index_name: string;
      qualification: string;
      description: string;
      icon: string | null;
      color: string;
      value: number;
      main_pollutants: string[];
    };
    pollutants: {
      [key: string]: {
        shortcode: string;
        name: string;
        value: number;
        unit: string;
        found: boolean;
        confidence: number;
        index: {
          index_type: string;
          index_name: string;
          qualification: string;
          description: string;
          icon: string | null;
          color: string;
          value: number;
        };
      };
    };
    health_recommendations: {
      [key: string]: string;
    };
  }
  

export interface LocationContent {
    city: string;
    country: string;
    error?: string;
}