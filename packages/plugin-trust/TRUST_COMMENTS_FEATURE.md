# Trust Comments Feature

## Overview

The Trust Comments feature automatically generates narrative assessments of users' trust levels whenever there is a significant change (±10 points) in their trust score. This provides a human-readable story about a user's trust evolution without exposing numerical scores.

## Implementation Details

### Database Schema

Added a new `trust_comments` table to store narrative assessments:

```sql
CREATE TABLE IF NOT EXISTS trust_comments (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  evaluator_id TEXT NOT NULL,
  trust_score REAL NOT NULL,
  trust_change REAL NOT NULL,
  comment TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT -- JSON object
)
```

### Components Modified

1. **TrustDatabase** (`src/database/TrustDatabase.ts`)
   - Added methods to save and retrieve trust comments
   - `saveTrustComment()`: Stores a new trust comment
   - `getLatestTrustComment()`: Retrieves the most recent comment for an entity
   - `getTrustCommentHistory()`: Gets historical comments (up to specified limit)

2. **TrustEngine** (`src/managers/TrustEngine.ts`)
   - Modified `recordSemanticEvidence()` to detect significant trust changes
   - Added `generateTrustComment()` method that uses LLM to create narrative assessments
   - Triggers comment generation when trust changes by ±10 points

3. **TrustService** (`src/services/TrustService.ts`)
   - Added public methods to access trust comments:
     - `getLatestTrustComment()`: Get the most recent comment
     - `getTrustCommentHistory()`: Get comment history

4. **trustProfileProvider** (`src/providers/trustProfile.ts`)
   - Enhanced to include the latest trust comment in the provider response
   - Adds narrative assessment to the text output when available

### How It Works

1. When a trust interaction is recorded that causes a trust score change of ±10 points or more, the system automatically generates a narrative comment.

2. The comment generation uses an LLM prompt that includes:
   - Current and previous trust scores
   - The triggering event description
   - Recent trust comment history
   - Recent behavioral patterns
   - Current trust dimensions

3. The LLM is instructed to:
   - Describe overall trust standing without mentioning numbers
   - Explain what caused the change
   - Reference trust evolution if there's history
   - Use natural language reflecting trust levels

4. Trust levels are described as:
   - 80+: "highly trusted member"
   - 60-79: "good trust"
   - 40-59: "establishing trust"
   - 20-39: "trust concerns"
   - <20: "very low trust"

### Example Output

When the trust profile provider is called, it now includes:

```
The user has good trust (75/100) with stable trust trend based on 25 interactions.

Trust Assessment: This user has demonstrated consistent helpful behavior and is establishing themselves as a trusted member of the community. Their recent contributions have significantly improved their standing.
```

### Benefits

1. **Privacy**: Users never see their numerical trust scores
2. **Context**: Provides meaningful narrative about trust evolution
3. **History**: Tracks trust journey over time
4. **Transparency**: Explains trust changes in human terms
5. **Actionable**: Can suggest improvements when trust is low

### Testing

Comprehensive tests are included in `src/providers/__tests__/trustComments.test.ts` covering:
- Trust comment inclusion in provider responses
- Comment generation on significant increases/decreases
- Threshold validation (±10 points)
- Historical context inclusion
- Appropriate language for different trust levels

### Future Enhancements

1. Configurable threshold (currently hardcoded to ±10 points)
2. Different comment templates for different contexts
3. Multi-language support
4. Sentiment analysis of the comments themselves
5. Integration with notification systems for major trust changes 