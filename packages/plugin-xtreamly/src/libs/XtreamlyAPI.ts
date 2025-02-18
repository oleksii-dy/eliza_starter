export const XTREAMLY_API_URL = 'https://api.xtreamly.io/';

export enum XtreamlyAPIPath {
    health = '',
    volatility = 'volatility_prediction',
    volatilityHistorical = 'volatility_historical',
    state = 'state_recognize',
    stateHistorical = 'state_historical',
}

export class XtreamlyAPI {
    private headers: Headers;

    constructor() {
        const XTREAMLY_API_KEY = process.env.XTREAMLY_API_KEY;

        if (!XTREAMLY_API_KEY) {
            throw new Error(`
                Missing environment variables: XTREAMLY_API_KEY.
                Request your API key here: https://xtreamly.io/api
            `);
        }

        this.headers = new Headers({
            'x-api-key': XTREAMLY_API_KEY,
        });
    }

    async get(path: XtreamlyAPIPath, params?: Record<string, string>) {
        const url = new URL(XTREAMLY_API_URL + path);

        if (params) {
            for (const [key, value] of Object.entries(params)) {
                url.searchParams.append(key, value);
            }
        }

        return fetch(url.toString(), {
            method: 'GET',
            headers: this.headers,
        }).then((res) => res.json());
    }

    async is_ok(): Promise<boolean> {
        const res = await this.get(XtreamlyAPIPath.health);
        return res.status === 'ok';
    }
}
