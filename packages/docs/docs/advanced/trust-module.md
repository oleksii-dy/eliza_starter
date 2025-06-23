---
sidebar_position: 15
title: Trust Module
description: Reputation tracking and enforcement system powering the marketplace of trust.
---

# 🤝 Trust Module

The trust module manages recommender reputation scores used for autonomous trading decisions. It implements the database schema and scoring logic outlined in the community docs.

## Features

- **Recommender registry** – tracks the address and identifiers for each recommender.
- **Metrics tracking** – stores successful calls, performance averages and consistency factors.
- **Trust scoring** – calculates scores from recent activity using weights for success rate, performance and risk.
- **Enforcement helpers** – ensure minimum trust thresholds before executing sensitive actions.

The scoring algorithm is derived from the [Trust Engine](../../versioned_docs/version-0.25.9/advanced/trust-engine.md) documentation.

## Usage

Load the `@elizaos/plugin-trust` plugin and access the `TrustService` to record outcomes or query scores. The `trust` provider injects a user's current score into agent context.

```ts
import { trustPlugin, TrustService } from '@elizaos/plugin-trust';

const eliza = new ElizaOS({ plugins: [trustPlugin] });
const service = eliza.runtime.getService<TrustService>('trust');
service.addRecommender({ id: 'alice', address: '0x...' });
service.recordOutcome('alice', true, 15);
```

Scores range from 0–100. Actions can call `enforceMinimumTrust` to restrict usage when scores fall below a threshold.
