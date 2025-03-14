// src/templates.ts
export const getLocationTemplate = `Respond with a JSON object containing location information for environmental data.
Extract the location from the most recent message. If no specific location is provided, respond with an error.

The response must include:
- city: The city name
- country: The country code (ISO 2-letter code)

Example response:
\`\`\`json
{
    "city": "Paris",
    "country": "FR"
}
\`\`\`
{{recentMessages}}
Extract the location from the most recent message.
Respond with a JSON markdown block containing both city and country.`;