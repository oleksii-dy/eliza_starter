export const extractTickerFromMessageTemplate = `
Extract the following details from a message given a company name or it's stock ticker:
- **ticker** (string): Ticker of the stock

If no ticker or company name is provided, please return an empty string as the ticker.

Provide the values in the following JSON format:

\`\`\`json
{
    "ticker": "<ticker>"
}
\`\`\`


Here are the recent user messages for context:
{{currentQuery}}
`;
