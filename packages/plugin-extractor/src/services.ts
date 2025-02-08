import { IExtractorScore } from "./types";

export const fetchExtractorScore: () => Promise<IExtractorScore> = () => {
    return new Promise((res) => {
        res({
            id: "01",
            risk: 0,
            score: 0,
            error: null,
        });
    }) as Promise<IExtractorScore>;
};
