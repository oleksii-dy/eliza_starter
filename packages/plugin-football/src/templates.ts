export const matchTemplate = `
# Context
Fetch the latest live match data for:
1. League: {{league}}
2. Date: {{date}}
3. Teams: {{teams}}

# Task
Generate live match information, including:
1. Match Score
2. Scorers and significant events (cards, substitutions, etc.)
3. Current match status (live, halftime, full-time)

Return the match data in JSON format like:
{
  "league": "Premier League",
  "matches": [
    {
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "score": "2-1",
      "status": "Full-time",
      "events": ["Goal by Player 1", "Red card for Player 2"]
    }
  ]
}`;
