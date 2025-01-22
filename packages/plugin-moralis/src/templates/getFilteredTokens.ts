// templates/getFilteredTokens.ts

export const getFilteredTokensTemplate = `Given the most recent message only, convert the user's token discovery request into appropriate filters and sorting criteria for the Moralis token discovery API.

Available metrics for filtering:
- marketCap
- volumeUsd
- holders
- buyers
- sellers
- securityScore
- tokenAge (unix timestamp)
- usdPricePercentChange
- liquidityChangeUSD

Available timeframes:
- oneHour
- oneDay
- oneWeek
- oneMonth

Format the response as a JSON object with these fields:
- filters: array of filter objects with {metric, timeFrame, gt, lt} properties
- sortBy: object with {metric, timeFrame, type} properties

Example responses:

For "Find tokens with high volume and good security":
{
  "filters": [
    {
      "metric": "volumeUsd",
      "timeFrame": "oneDay",
      "gt": 1000000
    },
    {
      "metric": "securityScore",
      "gt": 70
    }
  ],
  "sortBy": {
    "metric": "volumeUsd",
    "timeFrame": "oneDay",
    "type": "DESC"
  }
}

For "Show me new tokens with growing volume":
{
  "filters": [
    {
      "metric": "tokenAge",
      "lt": CURRENT_TIMESTAMP - 604800
    },
    {
      "metric": "volumeUsd",
      "timeFrame": "oneDay",
      "gt": 100000
    }
  ],
  "sortBy": {
    "metric": "volumeUsd",
    "timeFrame": "oneHour",
    "type": "DESC"
  }
}

{{recentMessages}}
Convert the LAST message only into appropriate filters and sorting criteria. Use reasonable default values for thresholds based on the user's intent.`;
