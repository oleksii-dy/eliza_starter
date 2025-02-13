export const XTREAMLY_API_URL = 'https://api.xtreamly.io/';

export enum XtreamlyAPIPath {
    health = '',
    volatility = 'volatility_prediction',
    volatilityHistorical = 'volatility_historical',
    state = 'state_recognize',
    stateHistorical = 'state_historical',
}

export class XtreamlyAPI {
    async get(path: XtreamlyAPIPath, params?: Record<string, string>) {
        const url = new URL(XTREAMLY_API_URL + path);

        if (params) {
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.append(key, value);
            }
        }

        return fetch(url.toString()).then((res) => res.json());
    }

    async is_ok(): Promise<boolean> {
        const res = await this.get(XtreamlyAPIPath.health);
        return res.status === 'ok';
    }
}
