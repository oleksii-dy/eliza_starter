#!/bin/bash
pnpm build && pnpm start --characters="characters/trial/portfolio.json,characters/trial/advisor.json,characters/trial/trader.json > logs/agent.log 2>&1 &
