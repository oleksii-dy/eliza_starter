import { z } from 'zod';

export interface RetrieveVolatilityPredictionReq {
    symbol?: string;
}

export const RetrieveVolatilityPredictionSchema = z.object({
    symbol: z.string(),
});

export const isRetrieveVolatilityPrediction = (
    obj: unknown
): obj is RetrieveVolatilityPredictionReq => {
    return RetrieveVolatilityPredictionSchema.safeParse(obj).success;
};
