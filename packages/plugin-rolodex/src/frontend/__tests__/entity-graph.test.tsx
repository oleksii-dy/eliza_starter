/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EntityGraph } from '../ui/entity-graph';
import { type Entity, type Relationship, stringToUuid } from '@elizaos/core';

// Create a minimal component to satisfy type checking
// The actual ForceGraph2D would be tested with integration tests
const MockForceGraph2D = () => <div data-testid="force-graph">Mock Graph</div>;

describe('EntityGraph', () => {
  it('renders with entities and relationships', () => {
    const mockEntities: Entity[] = [
      {
        id: stringToUuid('entity-1'),
        agentId: stringToUuid('agent-1'),
        names: ['Alice'],
        metadata: {},
      },
      {
        id: stringToUuid('entity-2'), 
        agentId: stringToUuid('agent-1'),
        names: ['Bob'],
        metadata: {},
      },
    ];

    const mockRelationships: Relationship[] = [
      {
        id: stringToUuid('rel-1'),
        sourceEntityId: stringToUuid('entity-1'),
        targetEntityId: stringToUuid('entity-2'),
        agentId: stringToUuid('agent-1'),
        tags: ['friend'],
        metadata: {},
      },
    ];

    const { getByTestId } = render(
      <EntityGraph 
        entities={mockEntities}
        relationships={mockRelationships}
      />
    );

    // For now, just verify the component renders
    // Actual graph testing would require more complex setup
    expect(getByTestId('entity-graph-container')).toBeInTheDocument();
  });
});
