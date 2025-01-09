#!/bin/bash
pnpm build && pnpm start --characters="characters/portfolio.json,characters/advisor.json,characters/baby.json,characters/trader.json" > logs/agent.log 2>&1 &
