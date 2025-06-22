#!/bin/bash

echo "🗑️  Deleting theater code from Rolodex plugin..."

# Delete entire security module - 1,827 lines of pure theater
echo "Removing security theater..."
rm -rf src/security/

# Delete fake database management - 436 lines of unused code  
echo "Removing fake database management..."
rm -f src/database/manager.ts
rm -f src/database/migrations.ts

# Delete autonomous features that never run - 483 + 727 lines
echo "Removing autonomous features..."
rm -f src/services/AutonomousRelationshipManager.ts
rm -f src/actions/autonomousRelationshipMaintenance.ts

# Delete trust integration theater - 393 + 320 + 217 lines
echo "Removing trust integration theater..."
rm -f src/services/TrustIntegrationService.ts
rm -f src/actions/createTrustAwareRelationship.ts
rm -f src/actions/TrustAwareAction.ts
rm -f src/types/trust.ts

# Delete message delivery theater - 598 lines
echo "Removing fake message delivery..."
rm -f src/services/MessageDeliveryService.ts

# Delete trust-aware providers - 262 lines
echo "Removing trust-aware providers..."
rm -f src/providers/trustAwareEntities.ts

# Delete unused error handling - 630 lines
echo "Removing complex error handling..."
rm -f src/utils/errorHandling.ts

# Remove empty test files
echo "Removing empty test files..."
rm -f src/tests/e2e.test.ts
rm -f src/tests/entity-graph.test.ts
rm -f src/tests/scenarios.test.ts
rm -f src/tests/index.ts

echo "✅ Deleted ~8,000 lines of theater code!"
echo "📊 Checking remaining code..."
echo ""
echo "Lines remaining:"
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1 