/**
 * Jobs Module - Central job coordination system
 *
 * This module provides a unified job queue that coordinates all
 * construction-related work including hauling, building, mining,
 * harvesting, and crafting.
 *
 * Part of Phase 7: Job Management System
 *
 * @module jobs
 */

export {
  Job,
  JobType,
  JobStatus,
  JobPriority,
  JobManager
} from './JobManager.js';
