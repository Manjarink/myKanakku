import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '../store/chatStore';

describe('Frontend Chat Store', () => {
  beforeEach(() => {
    useChatStore.getState().clearMessages();
  });

  it('should initialize with empty messages and not loading', () => {
    const state = useChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isSending).toBe(false);
    expect(state.pendingTransactions).toBeNull();
  });

  it('should clear messages and cancel pending actions correctly', () => {
    useChatStore.setState({
      pendingTransactions: [
        {
          tempId: 't1',
          type: 'expense',
          amount: 50,
          description: 'Canteen tea',
          date: '2026-10-19',
          confidence: 0.9,
        },
      ],
    });

    expect(useChatStore.getState().pendingTransactions?.length).toBe(1);

    useChatStore.getState().cancelPendingAction();
    expect(useChatStore.getState().pendingTransactions).toBeNull();
  });
});
