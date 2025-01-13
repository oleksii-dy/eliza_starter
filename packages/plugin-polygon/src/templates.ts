export const FinancialSummarizationTemplate = `
# Financial Statement Details:
{{financial}}

Summarization objective: {{objective}}

# Instructions: Summarize the financial statement.
- Focus on key metrics like revenue, profit margins, and growth rates
- Keep the language clear and concise
- Format numbers consistently (e.g. millions/billions)
- Include both positive and negative developments
- Note any one-time events that impact the numbers
- Provide context for industry-specific metrics
- Make sure to maintain dates and fiscal periods
- Provide an analyis of how, Jawk, a value investor would interpret the financial statement.
- List whether you are bullish or bearish on the stock based on the financial statement.

Return a 1 paragraph natural summary that a retail investor could understand based on the objective and the financial statement.`;

export const FinancialMapReduceSummarizationTemplate = `
# Financial Statement Summaries:
{{summaries}}

Summarization objective: {{objective}}

# Instructions: Analyze the financial statements across multiple years.
- Make sure all numbers are accurate
- Identify key trends in revenue, profit margins, and growth rates over time
- Compare year-over-year changes in important metrics
- Highlight significant improvements or declines between periods
- Note any cyclical patterns or seasonality
- Call out major shifts in business performance or strategy
- Keep the language clear and concise for retail investors
- Format numbers consistently (e.g. millions/billions)
- Maintain chronological context with dates and fiscal periods
- Consider macroeconomic factors that may have impacted different years
- Evaluate the overall trajectory of the company's financial health

Return a paragraph natural summary that analyzes the financial trends over time, focusing on the most important developments and changes between periods. The summary should help retail investors understand how the company has performed historically and what that suggests about its current position.
`;


export const ExtractNewsBasedonTickerTemplate = `
# News:
{{formattedNews}}

Extract news based on the ticker: {{ticker}}

Return a paragraph natural summary that analyzes the news extracting the information that pertains to the ticker.
`;

export const PriceHistoryRangeTemplate = `
# User Query we are basing all decisions on:
{{userQuery}}


# Instructions: {{senderName}} is requesting the price history of the following ticker: {{ticker}}. Your goal is to determine their objective, the range of dates that their request converse, along with a period which is the interval in which the price data will be collected. 
Do not worry about getting the pricing data; just the objective, start, end, and period.
The "objective" is a detailed description of what the user wants to price history on, if the user wants the current price, set "start" to "0 minutes ago" and "end" to "2 hours ago", and the "period" to "day". 
The "start" and "end" are the range of dates that the user wants to summarize, relative to the current time. The "start" and "end" should be relative to the current time, and measured in seconds, minutes, hours and days. The format is "2 days ago" or "3 hours ago" or "4 minutes ago" or "1 year ago", i.e. "<integer> <unit> ago". If you aren't sure, you can use a default range of "0 minutes ago" to "1 day ago" or more. Better to err on the side of including too much than too little. 
The “period” is the interval in which the pricing data is to be collected. The format can be “minute”, “day”, “year”. If you aren’t sure, please respond with “day”.


Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "objective": "<What the user wants to summarize>",
  “period”: “day”,
  "start": "0 minutes ago",
  "end": "2 hours ago"
}
\`\`\`
`;

export const CurrentPriceTemplate = `
# User Query we are basing all decisions on:
{{userQuery}}

# Current Price:
The price of {{ticker}} as of {{closeDate}} is: {{closePrice}}

Return the current price of the stock.
`;  

