/**
 * NPCListView.test.js - Unit tests for NPCListView component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NPCListView from '../NPCListView';

describe('NPCListView', () => {
  const mockNPCs = [
    {
      id: 'npc_1',
      name: 'Alice',
      role: 'GUARD',
      assignedBuilding: 'building_1',
      health: 90,
      morale: 75,
    },
    {
      id: 'npc_2',
      name: 'Bob',
      role: 'FARMER',
      assignedBuilding: null,
      health: 80,
      morale: 60,
    },
    {
      id: 'npc_3',
      name: 'Charlie',
      role: 'CRAFTER',
      assignedBuilding: 'building_2',
      health: 50,
      morale: 40,
    },
  ];

  const mockBuildings = [
    { id: 'building_1', type: 'BARRACKS', name: 'Barracks' },
    { id: 'building_2', type: 'WORKSHOP', name: 'Workshop' },
  ];

  const defaultProps = {
    npcs: mockNPCs,
    onNPCClick: jest.fn(),
    selectedNPC: null,
    sortBy: 'name',
    sortOrder: 'asc',
    onSort: jest.fn(),
    currentPage: 1,
    totalPages: 1,
    onPageChange: jest.fn(),
    onPrevPage: jest.fn(),
    onNextPage: jest.fn(),
    buildings: mockBuildings,
    selectedNPCs: [],
    onNPCSelect: jest.fn(),
    batchMode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders NPC table with correct headers', () => {
    render(<NPCListView {...defaultProps} />);

    expect(screen.getByText(/Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Role/i)).toBeInTheDocument();
    expect(screen.getByText(/Assignment/i)).toBeInTheDocument();
    expect(screen.getByText(/Happiness/i)).toBeInTheDocument();
    expect(screen.getByText(/Health/i)).toBeInTheDocument();
  });

  test('renders all NPCs in the table', () => {
    render(<NPCListView {...defaultProps} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  test('displays correct building assignments', () => {
    render(<NPCListView {...defaultProps} />);

    // Alice is assigned to building_1 (BARRACKS)
    expect(screen.getByText('BARRACKS')).toBeInTheDocument();

    // Bob is not assigned
    const bobRow = screen.getByText('Bob').closest('tr');
    expect(bobRow).toHaveTextContent('None');

    // Charlie is assigned to building_2 (WORKSHOP)
    expect(screen.getByText('WORKSHOP')).toBeInTheDocument();
  });

  test('calls onNPCClick when row is clicked', () => {
    const onNPCClick = jest.fn();
    render(<NPCListView {...defaultProps} onNPCClick={onNPCClick} />);

    const aliceRow = screen.getByText('Alice').closest('tr');
    fireEvent.click(aliceRow);

    expect(onNPCClick).toHaveBeenCalledWith(mockNPCs[0]);
  });

  test('calls onSort when header is clicked', () => {
    const onSort = jest.fn();
    render(<NPCListView {...defaultProps} onSort={onSort} />);

    const nameHeader = screen.getByText(/Name/i);
    fireEvent.click(nameHeader);

    expect(onSort).toHaveBeenCalledWith('name');
  });

  test('displays sort indicator for current sort field', () => {
    render(<NPCListView {...defaultProps} sortBy="name" sortOrder="asc" />);

    const nameHeader = screen.getByText(/Name/i);
    expect(nameHeader).toHaveTextContent('↑');
  });

  test('shows pagination controls when totalPages > 1', () => {
    render(<NPCListView {...defaultProps} totalPages={3} currentPage={2} />);

    expect(screen.getByText(/Page 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/Prev/i)).toBeInTheDocument();
    expect(screen.getByText(/Next/i)).toBeInTheDocument();
  });

  test('hides pagination controls when totalPages = 1', () => {
    render(<NPCListView {...defaultProps} totalPages={1} />);

    expect(screen.queryByText(/Page/i)).not.toBeInTheDocument();
  });

  test('disables prev button on first page', () => {
    render(<NPCListView {...defaultProps} totalPages={3} currentPage={1} />);

    const prevButton = screen.getByText(/Prev/i);
    expect(prevButton).toBeDisabled();
  });

  test('disables next button on last page', () => {
    render(<NPCListView {...defaultProps} totalPages={3} currentPage={3} />);

    const nextButton = screen.getByText(/Next/i);
    expect(nextButton).toBeDisabled();
  });

  test('calls onPrevPage when prev button is clicked', () => {
    const onPrevPage = jest.fn();
    render(
      <NPCListView
        {...defaultProps}
        totalPages={3}
        currentPage={2}
        onPrevPage={onPrevPage}
      />
    );

    const prevButton = screen.getByText(/Prev/i);
    fireEvent.click(prevButton);

    expect(onPrevPage).toHaveBeenCalled();
  });

  test('calls onNextPage when next button is clicked', () => {
    const onNextPage = jest.fn();
    render(
      <NPCListView
        {...defaultProps}
        totalPages={3}
        currentPage={2}
        onNextPage={onNextPage}
      />
    );

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    expect(onNextPage).toHaveBeenCalled();
  });

  test('shows "No NPCs found" when npcs array is empty', () => {
    render(<NPCListView {...defaultProps} npcs={[]} />);

    expect(screen.getByText(/No NPCs found/i)).toBeInTheDocument();
  });

  test('shows checkbox column in batch mode', () => {
    render(<NPCListView {...defaultProps} batchMode={true} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // 1 header checkbox + 3 NPC checkboxes
    expect(checkboxes).toHaveLength(4);
  });

  test('hides checkbox column when not in batch mode', () => {
    render(<NPCListView {...defaultProps} batchMode={false} />);

    const checkboxes = screen.queryAllByRole('checkbox');
    expect(checkboxes).toHaveLength(0);
  });

  test('calls onNPCSelect when checkbox is clicked in batch mode', () => {
    const onNPCSelect = jest.fn();
    render(
      <NPCListView {...defaultProps} batchMode={true} onNPCSelect={onNPCSelect} />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    // Click the first NPC checkbox (index 1, since index 0 is header)
    fireEvent.click(checkboxes[1]);

    expect(onNPCSelect).toHaveBeenCalledWith(mockNPCs[0]);
  });

  test('highlights selected NPC row', () => {
    render(<NPCListView {...defaultProps} selectedNPC={mockNPCs[0]} />);

    const aliceRow = screen.getByText('Alice').closest('tr');
    expect(aliceRow).toHaveClass('npc-table-row-selected');
  });

  test('displays health bar with correct color for high health', () => {
    render(<NPCListView {...defaultProps} />);

    const aliceRow = screen.getByText('Alice').closest('tr');
    const healthBar = aliceRow.querySelector('.npc-health-fill');

    expect(healthBar).toHaveStyle({ width: '90%', backgroundColor: '#4caf50' });
  });

  test('displays health bar with correct color for medium health', () => {
    render(<NPCListView {...defaultProps} />);

    const bobRow = screen.getByText('Bob').closest('tr');
    const healthBar = bobRow.querySelector('.npc-health-fill');

    expect(healthBar).toHaveStyle({ width: '80%', backgroundColor: '#4caf50' });
  });

  test('displays health bar with correct color for low health', () => {
    render(<NPCListView {...defaultProps} />);

    const charlieRow = screen.getByText('Charlie').closest('tr');
    const healthBar = charlieRow.querySelector('.npc-health-fill');

    expect(healthBar).toHaveStyle({ width: '50%', backgroundColor: '#ff9800' });
  });

  test('displays correct happiness emoji for high morale', () => {
    render(<NPCListView {...defaultProps} />);

    const aliceRow = screen.getByText('Alice').closest('tr');
    expect(aliceRow).toHaveTextContent('😊');
  });

  test('displays correct happiness emoji for medium morale', () => {
    render(<NPCListView {...defaultProps} />);

    const bobRow = screen.getByText('Bob').closest('tr');
    expect(bobRow).toHaveTextContent('😐');
  });

  test('displays correct happiness emoji for low morale', () => {
    render(<NPCListView {...defaultProps} />);

    const charlieRow = screen.getByText('Charlie').closest('tr');
    expect(charlieRow).toHaveTextContent('😞');
  });

  test('displays role badges', () => {
    render(<NPCListView {...defaultProps} />);

    expect(screen.getByText('GUARD')).toHaveClass('npc-role-badge');
    expect(screen.getByText('FARMER')).toHaveClass('npc-role-badge');
    expect(screen.getByText('CRAFTER')).toHaveClass('npc-role-badge');
  });
});
