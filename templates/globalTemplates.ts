const twitterPostTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

# Providers:
{{providers}}

{{characterPostExamples}}

{{postDirections}}

# Task: Generate a post in the voice and style and perspective of {{agentName}} @{{twitterUserName}}.
Write a post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Do not add commentary or acknowledge this request, just write the post.


Your job is to write detailed financial reports of given ticker {{ticker}}.

Consider:
- Key financial metrics (revenue, profit margins, growth rates)
- Recent price movements and trading volume
- Notable news and events
- Industry context and competitive position
- Technical analysis indicators
- Future outlook and potential catalysts

#Financials Summary:
{{financialSummary}}

#Current Stock Price:
{{currentStockPrice}}

#News:
{{news}}

#Stock Analysis:
{{stockAnalysis}}

Analyze the data and synthesize it into a compelling narrative that provides value to investors.

Your response should not contain any questions. Brief, concise statements only. No emojis. Use \\n\\n (double spaces) between statements if there are multiple statements in your response.

The tone should be analytical and insightful while remaining accessible to retail investors. Focus on the most important information that drives investment decisions.`;
