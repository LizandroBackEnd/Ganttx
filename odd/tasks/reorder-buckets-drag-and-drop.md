# Reorder Buckets Drag and Drop

## Problem & Objective
The user wants to reorder/move buckets in the Kanban board, similar to how task cards are dragged and dropped.

## Scope & Implementation Plan
- [x] 1. In `src/features/tasks/components/task-bucket-column.tsx`:
   - Add a grip handle (`IconGripVertical`) in the bucket header with `draggable` attribute.
   - Handle drag start/end for the bucket using a custom dataTransfer type (`application/x-bucket-id`).
   - Support drag over/leave/drop for bucket reordering with clean visual insertion indicator.
- [x] 2. In `src/features/tasks/components/task-board.tsx`:
   - Add optimistic state for buckets ordering (`useOptimistic`).
   - Implement `handleBucketReorder(draggedBucketId, targetBucketId, side)`.
   - Call `updateProjectCustomOptions(projectId, { customStatuses: currentList })` to persist the new order in PostgreSQL.
- [x] 3. Verification:
   - Run `bun run lint` (passed cleanly).
   - Run `bun run build` (passed cleanly).

