import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getTripExpenseSplits, 
  saveTripExpenseSplits, 
  setExpenseSplitMembers, 
  getExpenseSplitMembers, 
  deleteExpenseSplit 
} from '../lib/expenseSplits';

describe('Expense Splits Storage and Mapping', () => {
  const tripId = 'trip-123';

  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty object when no splits are saved', () => {
    expect(getTripExpenseSplits(tripId)).toEqual({});
    expect(getExpenseSplitMembers(tripId, 'exp-1')).toBeUndefined();
  });

  it('saves and retrieves split mappings correctly', () => {
    setExpenseSplitMembers(tripId, 'exp-1', ['user-a', 'user-b']);
    
    const splits = getTripExpenseSplits(tripId);
    expect(splits['exp-1']).toEqual(['user-a', 'user-b']);
    expect(getExpenseSplitMembers(tripId, 'exp-1')).toEqual(['user-a', 'user-b']);
  });

  it('deletes expense split mapping cleanly', () => {
    setExpenseSplitMembers(tripId, 'exp-1', ['user-a']);
    setExpenseSplitMembers(tripId, 'exp-2', ['user-b', 'user-c']);

    deleteExpenseSplit(tripId, 'exp-1');

    const splits = getTripExpenseSplits(tripId);
    expect(splits['exp-1']).toBeUndefined();
    expect(splits['exp-2']).toEqual(['user-b', 'user-c']);
  });
});
