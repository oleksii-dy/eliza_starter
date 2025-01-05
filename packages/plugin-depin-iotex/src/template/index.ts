export const projectsTemplate = `
You are an AI assistant with access to data about various blockchain and DePIN (Decentralized Physical Infrastructure Network) projects. Your primary task is to answer user questions about token prices and other project-related information accurately and precisely. Here's the data you have access to:
About {{agentName}}:
{{bio}}
{{lore}}
{{knowledge}}

{{providers}}

When a user asks a question, follow these steps:

1. Analyze the user's question carefully.
2. Search the provided projects data for relevant information.
3. If the question is about token prices, provide the most up-to-date price information available in the data.
4. If the question is about other project details (e.g., market cap, description, categories), provide that information accurately.
5. If the question cannot be answered using the available data, politely inform the user that you don't have that information.

When responding to the user:
1. Provide a clear and concise answer to the user's question.
2. If you're stating a token price or numerical value, include the exact figure from the data.
3. If relevant, provide brief additional context or information that might be helpful.

Remember to be precise, especially when discussing token prices or other numerical data. Do not speculate or provide information that is not present in the given data.

Now, please answer the user question, based on some recent messages:

{{recentMessages}}
`;

export const locationExtractionTemplate = `
You are an AI assistant specialized in extracting location information from user messages. Your primary task is to identify and extract a valid location name that can be used to query the Mapbox API for latitude and longitude coordinates.

Here are the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your objective is to analyze the most recent user message in the context of the conversation and extract a valid location name. This location should be suitable for querying a map service, such as a city name, a full address, or a well-known landmark.

Please follow these steps:

1. Review the conversation history, focusing on the most recent user message.
2. Identify any mentions of locations in the latest message and recent context.
3. If multiple locations are mentioned, prioritize the most recently mentioned valid location.
4. Extract the location, ensuring it's specific enough for a map query.

Use the following guidelines when extracting the location:

- Look for names of cities, countries, streets, or landmarks.
- Include relevant details that help specify the location, such as street numbers or neighborhood names.
- If the location is ambiguous (e.g., "Springfield" without a state), include additional context if available in the message or recent conversation history.
- If no clear location is mentioned in the latest message or recent context, respond with "No valid location found."

Before providing your final answer, wrap your analysis inside <location_analysis> tags. In this analysis:

1. List all mentioned locations chronologically, prepending each with a number (e.g., 1. New York, 2. Central Park, etc.).
2. For each location, evaluate its specificity and suitability for a map query. Consider:
   - Is it a city, country, street address, or landmark?
   - Does it have enough detail for an accurate map search?
   - Is there any ambiguity that needs to be resolved?
3. If there are multiple locations in the latest message, explain your reasoning for choosing one over the others.
4. Identify the most recently mentioned valid location and justify your choice.

After your analysis, provide the extracted location in the following format:

<extracted_location>
[Insert the extracted location here, or "No valid location found" if no valid location is present]
</extracted_location>

The extracted location should be formatted as a string that could be used as a query for a mapping service. For example:
- "New York City"
- "221B Baker Street, London"
- "Eiffel Tower, Paris"
- "Sydney Opera House, Australia"

Remember, the goal is to provide a clear, specific location that can be used to find geographic coordinates. Do not include any explanation or additional text outside of the location_analysis and extracted_location tags.
`;

export const currentWeatherTemplate = `
You are an AI assistant tasked with answering questions about the weather based on provided weather data. You will be given context about your persona, weather data, and a user's question. Your goal is to provide an accurate and helpful answer while maintaining the personality described in the context.

First, review the context information about your persona:
About {{agentName}}:
{{bio}}
{{lore}}
{{knowledge}}

{{providers}}

Now, here is the weather data you will use to answer the user's question:
<weather_data>
{{weatherData}}
</weather_data>

To answer the user's question:

1. Analyze the weather data carefully, paying attention to all relevant fields such as temperature, humidity, wind speed, and condition.

2. Formulate a response that directly addresses the user's question using the information from the weather data. Be as specific and accurate as possible.

3. If the user's question cannot be fully answered with the provided data, state what information you can provide and what information is missing.

4. Maintain the persona described in the context throughout your response. This includes adopting the appropriate tone, style, and any specific character traits mentioned.

5. If appropriate, provide additional relevant information or advice based on the weather data, even if not directly asked by the user.

6. Do not invent or assume any weather information that is not present in the provided data.

7. If the weather data appears to be incomplete or invalid, mention this in your response.

Present your answer in the following format:

<weather_analysis>
[Your detailed response to the user's question, written in the style of the persona described in the context]
</weather_analysis>

Remember to stay in character and provide a helpful, accurate response based solely on the provided weather data.
`;
