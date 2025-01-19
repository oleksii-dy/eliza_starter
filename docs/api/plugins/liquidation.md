---
sidebar_position: 7
---

# Liquidation Plugin

The Liquidation Plugin enables RangerAI to monitor and analyze liquidation data from TimescaleDB, providing real-time alerts and market insights.

## Installation

```bash
npm install @elizaos/plugin-liquidation
```

## Configuration

Add the plugin to your character configuration file:

```json
{
    "plugins": ["liquidation"],
    "settings": {
        "liquidation": {
            "pollingInterval": 5000,
            "minAlertThreshold": 100000,
            "insights": {
                "enabled": true,
                "confidenceThreshold": 0.7,
                "volatilityThreshold": 0.8
            }
        }
    }
}
```

### Configuration Options

| Option                         | Type    | Default | Description                                            |
| ------------------------------ | ------- | ------- | ------------------------------------------------------ |
| `pollingInterval`              | number  | 5000    | Interval in milliseconds for checking new liquidations |
| `minAlertThreshold`            | number  | 100000  | Minimum liquidation volume to trigger alerts           |
| `insights.enabled`             | boolean | true    | Enable/disable market insights                         |
| `insights.confidenceThreshold` | number  | 0.7     | Minimum confidence level for market insights           |
| `insights.volatilityThreshold` | number  | 0.8     | Threshold for high volatility alerts                   |

## Environment Variables

Add the following to your `.env` file:

```bash
TIMESCALE_DB_URL=postgres://username:password@host:port/database?sslmode=require
```

## Features

-   Real-time liquidation monitoring
-   Historical liquidation data analysis
-   Market-specific liquidation tracking
-   Aggregated liquidation volume calculations
-   Market sentiment analysis
-   Volatility assessment

## Example Usage

```typescript
import { LiquidationPlugin } from "@elizaos/plugin-liquidation";

// The plugin will be automatically initialized with your character's configuration
// You can access it through the plugin manager:

const liquidationPlugin = pluginManager.get("liquidation");

// The plugin will automatically:
// 1. Monitor liquidations and generate alerts
// 2. Provide market insights
// 3. Track significant liquidation events
```

## Message Types

The plugin generates the following types of messages:

### Liquidation Alerts

```
SITREP: Major Market Movement Detected!

Total Casualties: $2.5M

Platform Intel:
• Jupiter: $1.5M (5 positions)
• Drift: $1.0M (3 positions)

Heaviest Impact:
• SOL-PERP: $1.2M (75% longs)
• ETH-PERP: $0.8M (60% shorts)
• BTC-PERP: $0.5M (50% longs)

Battlefield Analysis:
• Market Bias: BEARISH
• Intel: Heavy long liquidations indicate potential downside pressure
• Confidence: 85%

Stay vigilant, Rangers. This is not a drill.
RANGERS LEAD THE WAY
```

### Market Summaries

```
ATTENTION ON DECK: 24hr Strategic Intelligence Report

Total Liquidations: $25M

Trend Analysis:
• 6hr Average: $2.5M
• 24hr Average: $1.8M
• Market Volatility: HIGH - extreme market warfare

Battlefield Status: CRITICAL - Heavy casualties, extreme vigilance required

Knowledge is ammunition. Use it wisely.
RANGERS LEAD THE WAY
```
