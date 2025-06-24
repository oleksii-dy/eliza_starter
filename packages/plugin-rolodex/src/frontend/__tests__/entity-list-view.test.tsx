/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, mock, beforeEach  } from 'bun:test';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EntityListView } from '../ui/entity-list-view';
import { type Entity, type Relationship, type UUID, stringToUuid } from '@elizaos/core';

describe('EntityListView', () => {
  const mockEntities: Entity[] = [
    {
      id: stringToUuid('entity-1'),
      agentId: stringToUuid('agent-1'),
      names: ['Alice Johnson', 'AJ', 'Alice J'],
      metadata: {
        type: 'person',
        bio: 'Software engineer and friend',
        trustMetrics: {
          helpfulness: 0.8,
          suspicionLevel: 0.1
        },
        platformIdentities: [
          { platform: 'github', handle: 'alicej' },
          { platform: 'twitter', handle: '@alice_j' }
        ]
      }
    },
    {
      id: stringToUuid('entity-2'),
      agentId: stringToUuid('agent-1'),
      names: ['Bob Smith', 'Bobby'],
      metadata: {
        type: 'person',
        bio: 'Product manager',
        trustMetrics: {
          helpfulness: 0.6,
          suspicionLevel: 0.2
        },
        platformIdentities: [
          { platform: 'linkedin', handle: 'bob-smith' }
        ]
      }
    },
    {
      id: stringToUuid('entity-3'),
      agentId: stringToUuid('agent-1'),
      names: ['Tech Startup Inc', 'TSI'],
      metadata: {
        type: 'organization',
        bio: 'Innovative tech company',
        trustMetrics: {
          helpfulness: 0.7,
          suspicionLevel: 0.1
        },
        platformIdentities: []
      }
    }
  ];

  const mockRelationships: Relationship[] = [
    {
      id: stringToUuid('rel-1'),
      sourceEntityId: stringToUuid('entity-1'),
      targetEntityId: stringToUuid('entity-2'),
      agentId: stringToUuid('agent-1'),
      tags: ['works_with'],
      metadata: {
        relationshipType: 'colleague',
        strength: 0.9
      },
      strength: 0.9
    },
    {
      id: stringToUuid('rel-2'),
      sourceEntityId: stringToUuid('entity-1'),
      targetEntityId: stringToUuid('entity-3'),
      agentId: stringToUuid('agent-1'),
      tags: ['works_for'],
      metadata: {
        relationshipType: 'employment',
        strength: 0.7
      },
      strength: 0.7
    }
  ];

  const mockOnEntityClick = mock();

  beforeEach(() => {
    mock.restore();
  });

  it('renders entity list with all entities', () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Check if all entities are rendered
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Tech Startup Inc')).toBeInTheDocument();
  });

  it('displays entity types correctly', () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Check entity types
    const personBadges = screen.getAllByText('person');
    expect(personBadges).toHaveLength(2);
    expect(screen.getByText('organization')).toBeInTheDocument();
  });

  it('shows platform identities', () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Check if platform badges are displayed
    expect(screen.getByText('github')).toBeInTheDocument();
    expect(screen.getByText('twitter')).toBeInTheDocument();
    expect(screen.getByText('linkedin')).toBeInTheDocument();
  });

  it('handles entity click', () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Click on an entity name
    const aliceLink = screen.getByText('Alice Johnson');
    fireEvent.click(aliceLink);

    expect(mockOnEntityClick).toHaveBeenCalledWith(mockEntities[0]);
  });

  it('filters entities by search term', async () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Find and use search input
    const searchInput = screen.getByPlaceholderText(/search entities/i);
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Tech Startup Inc')).not.toBeInTheDocument();
    });
  });

  it('filters by minimum strength', async () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Find strength filter input
    const strengthInput = screen.getByDisplayValue('0');
    fireEvent.change(strengthInput, { target: { value: '0.85' } });

    await waitFor(() => {
      // With 0.85 threshold:
      // - Alice has avg strength 0.8 (from 0.9 + 0.7 / 2), so should be filtered out
      // - Bob has avg strength 0.9 (single incoming connection), so should remain
      // - Tech Startup has avg strength 0.7 (single incoming), so should be filtered out
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.queryByText('Tech Startup Inc')).not.toBeInTheDocument();
    });
  });

  it('expands and shows entity connections', async () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Click expand button for Alice
    const aliceRow = screen.getByText('Alice Johnson').closest('tr');
    const expandButton = within(aliceRow!).getByRole('button');
    fireEvent.click(expandButton);

    // Should show connections
    await waitFor(() => {
      expect(screen.getByText(/Connections \(2\)/)).toBeInTheDocument();
      expect(screen.getByText('colleague')).toBeInTheDocument();
      expect(screen.getByText('employment')).toBeInTheDocument();
    });
  });

  it('displays trust levels correctly', () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Alice has high trust (0.8 - 0.1 = 0.7)
    const aliceRow = screen.getByText('Alice Johnson').closest('tr');
    expect(within(aliceRow!).getByText('0.70')).toBeInTheDocument();

    // Bob has medium trust (0.6 - 0.2 = 0.4)
    const bobRow = screen.getByText('Bob Smith').closest('tr');
    expect(within(bobRow!).getByText('0.40')).toBeInTheDocument();
  });

  it('displays relationship counts', () => {
    render(
      <EntityListView
        entities={mockEntities}
        relationships={mockRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Alice has 2 connections
    const aliceRow = screen.getByText('Alice Johnson').closest('tr');
    expect(within(aliceRow!).getByText('2 total')).toBeInTheDocument();

    // Bob has 1 connection
    const bobRow = screen.getByText('Bob Smith').closest('tr');
    expect(within(bobRow!).getByText('1 total')).toBeInTheDocument();
  });

  it('renders empty state when no entities', () => {
    render(
      <EntityListView
        entities={[]}
        relationships={[]}
        onEntityClick={mockOnEntityClick}
      />
    );

    expect(screen.getByText(/Showing 0 of 0 entities/i)).toBeInTheDocument();
  });

  it('shows bidirectional relationships', async () => {
    const bidirectionalRelationships: Relationship[] = [
      ...mockRelationships,
      {
        id: stringToUuid('rel-3'),
        sourceEntityId: stringToUuid('entity-2'),
        targetEntityId: stringToUuid('entity-1'),
        agentId: stringToUuid('agent-1'),
        tags: ['works_with'],
        metadata: {
          relationshipType: 'colleague'
        },
        strength: 0.9
      }
    ];

    render(
      <EntityListView
        entities={mockEntities}
        relationships={bidirectionalRelationships}
        onEntityClick={mockOnEntityClick}
      />
    );

    // Expand Alice's connections
    const aliceRow = screen.getByText('Alice Johnson').closest('tr');
    const expandButton = within(aliceRow!).getByRole('button');
    fireEvent.click(expandButton);

    // Should show bidirectional badge
    await waitFor(() => {
      expect(screen.getByText('↔ Bidirectional')).toBeInTheDocument();
    });
  });
});
