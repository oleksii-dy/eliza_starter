import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EntityGraph } from '../ui/entity-graph';
import { asUUID, Entity, Relationship } from '@elizaos/core';

// Mock react-force-graph-2d
vi.mock('react-force-graph-2d', () => ({
  default: vi.fn((props) => {
    const { graphData, onNodeClick } = props;
    
    // If no nodes, don't render the force graph
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return null;
    }
    
    // Render nodes based on actual data
    return (
      <div data-testid="force-graph">
        {graphData.nodes.map((node: any) => (
          <div 
            key={node.id}
            data-testid={`node-${node.name.toLowerCase()}`}
            onClick={() => onNodeClick?.(node)}
          >
            {node.name}
          </div>
        ))}
      </div>
    );
  })
}));

describe('EntityGraph', () => {
  const mockEntities: Entity[] = [
    {
      id: asUUID('entity-1'),
      agentId: asUUID('agent-1'),
      names: ['Alice', 'Alice Johnson'],
      metadata: {
        type: 'person',
        bio: 'Test person 1',
        trustMetrics: {
          helpfulness: 0.8,
          suspicionLevel: 0.1,
          engagement: 5
        }
      }
    },
    {
      id: asUUID('entity-2'),
      agentId: asUUID('agent-1'),
      names: ['Bob', 'Bob Smith'],
      metadata: {
        type: 'person',
        bio: 'Test person 2',
        trustMetrics: {
          helpfulness: 0.6,
          suspicionLevel: 0.2,
          engagement: 3
        }
      }
    }
  ];

  const mockRelationships: Relationship[] = [
    {
      id: asUUID('rel-1'),
      sourceEntityId: asUUID('entity-1'),
      targetEntityId: asUUID('entity-2'),
      agentId: asUUID('agent-1'),
      tags: ['knows'],
      metadata: {
        type: 'colleague',
        sentiment: 'positive'
      },
      strength: 0.8
    }
  ];

  const mockOnNodeClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the force graph component', () => {
    render(
      <EntityGraph
        entities={mockEntities}
        relationships={mockRelationships}
        onNodeClick={mockOnNodeClick}
      />
    );

    expect(screen.getByTestId('force-graph')).toBeInTheDocument();
  });

  it('renders entity nodes', () => {
    render(
      <EntityGraph
        entities={mockEntities}
        relationships={mockRelationships}
        onNodeClick={mockOnNodeClick}
      />
    );

    expect(screen.getByTestId('node-alice')).toBeInTheDocument();
    expect(screen.getByTestId('node-bob')).toBeInTheDocument();
  });

  it('handles entity click events', () => {
    render(
      <EntityGraph
        entities={mockEntities}
        relationships={mockRelationships}
        onNodeClick={mockOnNodeClick}
      />
    );

    const aliceNode = screen.getByTestId('node-alice');
    aliceNode.click();

    // The component calls onNodeClick with the entity object
    expect(mockOnNodeClick).toHaveBeenCalledWith(mockEntities[0]);
  });

  it('renders with empty entities', () => {
    render(
      <EntityGraph
        entities={[]}
        relationships={[]}
        onNodeClick={mockOnNodeClick}
      />
    );

    // When there are no entities, the force graph is not rendered
    expect(screen.queryByTestId('force-graph')).not.toBeInTheDocument();
    
    // But the legend and stats should still be visible
    expect(screen.getByText('Filters & Legend')).toBeInTheDocument();
    expect(screen.getByText('Network Stats')).toBeInTheDocument();
    expect(screen.getByText('Entities: 0')).toBeInTheDocument();
  });

  it('updates when entities change', async () => {
    const { rerender } = render(
      <EntityGraph
        entities={[mockEntities[0]]}
        relationships={[]}
        onNodeClick={mockOnNodeClick}
      />
    );

    // Initially only Alice should be rendered
    expect(screen.getByTestId('node-alice')).toBeInTheDocument();
    expect(screen.queryByTestId('node-bob')).not.toBeInTheDocument();

    // Add Bob
    rerender(
      <EntityGraph
        entities={mockEntities}
        relationships={mockRelationships}
        onNodeClick={mockOnNodeClick}
      />
    );

    // Now both should be rendered
    await waitFor(() => {
      expect(screen.getByTestId('node-alice')).toBeInTheDocument();
      expect(screen.getByTestId('node-bob')).toBeInTheDocument();
    });
  });

  it('displays relationship stats', () => {
    render(
      <EntityGraph
        entities={mockEntities}
        relationships={mockRelationships}
        onNodeClick={mockOnNodeClick}
      />
    );

    // Check stats panel - use more specific queries to avoid duplicates
    const statsPanel = screen.getByText('Network Stats').parentElement;
    expect(statsPanel).toHaveTextContent('Entities: 2');
    expect(statsPanel).toHaveTextContent('Relationships: 1');
    expect(statsPanel).toHaveTextContent('Avg Strength: 0.80');
  });

  it('displays entity type counts', () => {
    render(
      <EntityGraph
        entities={mockEntities}
        relationships={mockRelationships}
        onNodeClick={mockOnNodeClick}
      />
    );

    // Check entity type stats in the stats panel
    const statsPanel = screen.getByText('Network Stats').parentElement;
    expect(statsPanel).toHaveTextContent('person: 2');
  });

  it('displays trust level legend', () => {
    render(
      <EntityGraph
        entities={mockEntities}
        relationships={mockRelationships}
        onNodeClick={mockOnNodeClick}
      />
    );

    // Check legend - be more specific about which section
    const legendSection = screen.getByText('Entity Trust Level').parentElement;
    expect(legendSection).toHaveTextContent('Trusted');
    expect(legendSection).toHaveTextContent('Neutral');
    expect(legendSection).toHaveTextContent('Suspicious');
  });

  it('displays relationship type legend', () => {
    render(
      <EntityGraph
        entities={mockEntities}
        relationships={mockRelationships}
        onNodeClick={mockOnNodeClick}
      />
    );

    // Check relationship types in legend
    const relationshipSection = screen.getByText('Relationship Types').parentElement;
    expect(relationshipSection).toHaveTextContent('friend');
    expect(relationshipSection).toHaveTextContent('colleague');
    expect(relationshipSection).toHaveTextContent('community');
    expect(relationshipSection).toHaveTextContent('acquaintance');
  });
});
