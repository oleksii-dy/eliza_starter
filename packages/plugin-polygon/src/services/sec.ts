class EDGARExtractor {
    private headers: Record<string, string>;
    private baseUrl: string;

    constructor(userAgent: string) {
        this.headers = {
            'User-Agent': userAgent
        };
        this.baseUrl = 'https://data.sec.gov';
    }

    /**
     * Get company filing metadata
     * @param {string} cik - Company CIK number (padded with leading zeros to 10 digits)
     * @returns {Promise<Object>} Company submissions data
     */
    async getCompanySubmissions(cik: string) {
        const url = `${this.baseUrl}/submissions/CIK${cik}.json`;
        const response = await fetch(url, { headers: this.headers });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }

    /**
     * Get documents from a specific filing
     * @param {string} accessionNumber - Filing accession number
     * @param {string} cik - Company CIK number
     * @returns {Promise<Object>} Filing documents data
     */
    async getFilingDocuments(accessionNumber, cik) {
        const accessionClean = accessionNumber.replace(/-/g, '');
        const url = `${this.baseUrl}/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
        const response = await fetch(url, { headers: this.headers });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }

    /**
     * Download a specific document from a filing
     * @param {string} accessionNumber - Filing accession number
     * @param {string} cik - Company CIK number
     * @param {string} filename - Name of the document to download
     * @returns {Promise<string>} Document content
     */
    async downloadFilingDocument(accessionNumber, cik, filename) {
        const accessionClean = accessionNumber.replace(/-/g, '');
        const url = `${this.baseUrl}/Archives/edgar/data/${cik}/${accessionClean}/${filename}`;
        const response = await fetch(url, { headers: this.headers });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.text();
    }

    /**
     * Get company facts (financial data points)
     * @param {string} cik - Company CIK number (padded with leading zeros to 10 digits)
     * @returns {Promise<Object>} Company facts data
     */
    async getCompanyFacts(cik) {
        const url = `${this.baseUrl}/api/xbrl/companyfacts/CIK${cik}.json`;
        const response = await fetch(url, { headers: this.headers });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }
}

export const secDataClient = new EDGARExtractor('Folio (folio@folio.ai)');
