/**
 * useNPCFilters.js - Custom hook for NPC filtering and sorting
 *
 * Manages filter state for NPC lists including:
 * - Role filtering
 * - Search by name
 * - Status filtering
 * - Sorting by various fields
 * - Pagination
 */

import { useState, useMemo } from 'react';

/**
 * Custom hook for filtering and sorting NPCs
 * @param {Array} npcs - Array of NPC objects
 * @param {Object} options - Configuration options
 * @returns {Object} Filtered NPCs and control functions
 */
const useNPCFilters = (npcs = [], options = {}) => {
  const {
    itemsPerPage = 10,
    initialSortBy = 'name',
    initialSortOrder = 'asc',
  } = options;

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sort state
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Filter and sort NPCs
   */
  const filteredAndSortedNPCs = useMemo(() => {
    if (!npcs || npcs.length === 0) return [];

    let result = [...npcs];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(npc =>
        (npc.name && npc.name.toLowerCase().includes(term)) ||
        (npc.role && npc.role.toLowerCase().includes(term)) ||
        (npc.id && npc.id.toString().includes(term))
      );
    }

    // Apply role filter
    if (roleFilter && roleFilter !== 'ALL') {
      result = result.filter(npc => npc.role === roleFilter);
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'ASSIGNED') {
        result = result.filter(npc => npc.assignedBuilding || npc.assignedBuildingId);
      } else if (statusFilter === 'IDLE') {
        result = result.filter(npc => !npc.assignedBuilding && !npc.assignedBuildingId);
      } else {
        result = result.filter(npc => npc.status === statusFilter);
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle special cases
      if (sortBy === 'assignment') {
        aValue = a.assignedBuilding || a.assignedBuildingId || '';
        bValue = b.assignedBuilding || b.assignedBuildingId || '';
      } else if (sortBy === 'happiness') {
        aValue = a.happiness || a.morale || 0;
        bValue = b.happiness || b.morale || 0;
      }

      // Handle undefined values
      if (aValue === undefined) aValue = '';
      if (bValue === undefined) bValue = '';

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [npcs, searchTerm, roleFilter, statusFilter, sortBy, sortOrder]);

  /**
   * Paginated NPCs
   */
  const paginatedNPCs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedNPCs.slice(startIndex, endIndex);
  }, [filteredAndSortedNPCs, currentPage, itemsPerPage]);

  /**
   * Total pages
   */
  const totalPages = Math.ceil(filteredAndSortedNPCs.length / itemsPerPage);

  /**
   * Toggle sort order or change sort field
   */
  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Change field, default to ascending
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1); // Reset to first page
  };

  /**
   * Reset all filters
   */
  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setSortBy(initialSortBy);
    setSortOrder(initialSortOrder);
    setCurrentPage(1);
  };

  /**
   * Go to specific page
   */
  const goToPage = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  /**
   * Next page
   */
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  /**
   * Previous page
   */
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return {
    // Filtered data
    filteredNPCs: filteredAndSortedNPCs,
    paginatedNPCs,
    totalNPCs: filteredAndSortedNPCs.length,

    // Filter state
    searchTerm,
    roleFilter,
    statusFilter,

    // Sort state
    sortBy,
    sortOrder,

    // Pagination state
    currentPage,
    totalPages,
    itemsPerPage,

    // Filter setters
    setSearchTerm,
    setRoleFilter,
    setStatusFilter,

    // Sort functions
    handleSort,

    // Pagination functions
    goToPage,
    nextPage,
    prevPage,

    // Utility functions
    resetFilters,
  };
};

export default useNPCFilters;
