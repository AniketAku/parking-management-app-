export interface PriorityQueueItem<T> {
  item: T;
  priority: number;
}

/**
 * Priority Queue implementation using binary heap
 * Higher priority numbers = higher priority (processed first)
 */
export class PriorityQueue<T> {
  private heap: PriorityQueueItem<T>[] = [];

  constructor() {}

  /**
   * Add item to queue with priority
   * @param item - Item to add
   * @param priority - Priority level (higher = more important)
   */
  enqueue(item: T, priority: number): void {
    const element: PriorityQueueItem<T> = { item, priority };
    this.heap.push(element);
    this.heapifyUp(this.heap.length - 1);
  }

  /**
   * Remove and return highest priority item
   * @returns Highest priority item or null if empty
   */
  dequeue(): T | null {
    if (this.isEmpty()) {
      return null;
    }

    if (this.heap.length === 1) {
      const item = this.heap.pop();
      return item ? item.item : null;
    }

    const highestPriority = this.heap[0];
    const lastElement = this.heap.pop()!;
    this.heap[0] = lastElement;
    this.heapifyDown(0);

    return highestPriority.item;
  }

  /**
   * Peek at highest priority item without removing it
   * @returns Highest priority item or null if empty
   */
  peek(): T | null {
    if (this.isEmpty()) {
      return null;
    }
    return this.heap[0].item;
  }

  /**
   * Check if queue is empty
   * @returns True if queue is empty
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Get number of items in queue
   * @returns Queue size
   */
  size(): number {
    return this.heap.length;
  }

  /**
   * Clear all items from queue
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * Get all items (for debugging/monitoring)
   * @returns Array of all items with priorities
   */
  getAll(): PriorityQueueItem<T>[] {
    return [...this.heap];
  }

  /**
   * Remove specific item from queue
   * @param predicate - Function to identify item to remove
   * @returns True if item was found and removed
   */
  remove(predicate: (item: T) => boolean): boolean {
    const index = this.heap.findIndex(element => predicate(element.item));
    
    if (index === -1) {
      return false;
    }

    // If it's the last element, just remove it
    if (index === this.heap.length - 1) {
      this.heap.pop();
      return true;
    }

    // Replace with last element and reheapify
    const lastElement = this.heap.pop()!;
    this.heap[index] = lastElement;

    // Reheapify both up and down to maintain heap property
    this.heapifyUp(index);
    this.heapifyDown(index);

    return true;
  }

  /**
   * Update priority of an item
   * @param predicate - Function to identify item
   * @param newPriority - New priority value
   * @returns True if item was found and updated
   */
  updatePriority(predicate: (item: T) => boolean, newPriority: number): boolean {
    const index = this.heap.findIndex(element => predicate(element.item));
    
    if (index === -1) {
      return false;
    }

    const oldPriority = this.heap[index].priority;
    this.heap[index].priority = newPriority;

    // Reheapify based on priority change
    if (newPriority > oldPriority) {
      this.heapifyUp(index);
    } else if (newPriority < oldPriority) {
      this.heapifyDown(index);
    }

    return true;
  }

  private heapifyUp(index: number): void {
    if (index === 0) return;

    const parentIndex = Math.floor((index - 1) / 2);
    
    if (this.heap[index].priority > this.heap[parentIndex].priority) {
      this.swap(index, parentIndex);
      this.heapifyUp(parentIndex);
    }
  }

  private heapifyDown(index: number): void {
    const leftChild = 2 * index + 1;
    const rightChild = 2 * index + 2;
    let largest = index;

    if (
      leftChild < this.heap.length &&
      this.heap[leftChild].priority > this.heap[largest].priority
    ) {
      largest = leftChild;
    }

    if (
      rightChild < this.heap.length &&
      this.heap[rightChild].priority > this.heap[largest].priority
    ) {
      largest = rightChild;
    }

    if (largest !== index) {
      this.swap(index, largest);
      this.heapifyDown(largest);
    }
  }

  private swap(index1: number, index2: number): void {
    [this.heap[index1], this.heap[index2]] = [this.heap[index2], this.heap[index1]];
  }
}

/**
 * Priority levels for common use cases
 */
export const PRINT_PRIORITIES = {
  URGENT: 100,    // Emergency reprints, critical documents
  HIGH: 75,       // Exit receipts, payment confirmations
  NORMAL: 50,     // Entry tickets, standard operations
  LOW: 25,        // Reports, batch operations
  BACKGROUND: 10  // Cleanup operations, diagnostics
} as const;

/**
 * Calculate priority based on job characteristics
 */
export function calculatePrintPriority(
  ticketType: string,
  isReprint: boolean = false,
  userPriority: 'normal' | 'high' | 'urgent' = 'normal'
): number {
  let basePriority = PRINT_PRIORITIES.NORMAL;

  // Base priority by ticket type
  switch (ticketType) {
    case 'exit':
    case 'receipt':
      basePriority = PRINT_PRIORITIES.HIGH;
      break;
    case 'entry':
      basePriority = PRINT_PRIORITIES.NORMAL;
      break;
    case 'thermal':
      basePriority = PRINT_PRIORITIES.NORMAL;
      break;
    default:
      basePriority = PRINT_PRIORITIES.LOW;
  }

  // Adjust for user-specified priority
  switch (userPriority) {
    case 'urgent':
      basePriority = Math.max(basePriority, PRINT_PRIORITIES.URGENT);
      break;
    case 'high':
      basePriority = Math.max(basePriority, PRINT_PRIORITIES.HIGH);
      break;
  }

  // Boost priority for reprints
  if (isReprint) {
    basePriority += 10;
  }

  return Math.min(basePriority, PRINT_PRIORITIES.URGENT);
}