import React from 'react';
import { renderHook as rtlRenderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClient } from 'urql';
import { useWeeklyQueue, useCompleteTask, useDeferTask } from '../src/features/planning/hooks/use-weekly-queue';

jest.mock('urql');

let queryClient: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderHook = <T,>(callback: () => T) => rtlRenderHook(callback, { wrapper });

describe('Weekly queue hooks integration tests', () => {
  let mockClient: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockClient = {
      query: jest.fn(),
      mutation: jest.fn(),
    };
    (useClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useWeeklyQueue comprehensive error handling', () => {
    it('throws with descriptive error when GraphQL error occurs', async () => {
      const error = new Error('GraphQL validation error');
      mockClient.query.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            error: error,
            data: undefined,
          }),
      });

      const { result } = renderHook(() => useWeeklyQueue());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('weekly queue');
    });

    it('handles empty tasks array gracefully', async () => {
      mockClient.query.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { tasks: [] },
            error: null,
          }),
      });

      const { result } = renderHook(() => useWeeklyQueue());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual([]);
    });

    it('throws when tasks field is missing from response', async () => {
      mockClient.query.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { someOtherField: [] },
            error: null,
          }),
      });

      const { result } = renderHook(() => useWeeklyQueue());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('Invalid tasks data');
    });

    it('throws when tasks is not an array', async () => {
      mockClient.query.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { tasks: { nested: 'object' } },
            error: null,
          }),
      });

      const { result } = renderHook(() => useWeeklyQueue());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('Invalid tasks data');
    });

    it('throws when tasks is a string', async () => {
      mockClient.query.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { tasks: 'not an array' },
            error: null,
          }),
      });

      const { result } = renderHook(() => useWeeklyQueue());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('throws when tasks is a number', async () => {
      mockClient.query.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { tasks: 123 },
            error: null,
          }),
      });

      const { result } = renderHook(() => useWeeklyQueue());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('throws when tasks is a boolean', async () => {
      mockClient.query.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { tasks: true },
            error: null,
          }),
      });

      const { result } = renderHook(() => useWeeklyQueue());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('successfully transforms multiple tasks from different apiaries', async () => {
      mockClient.query.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: {
              tasks: [
                {
                  id: 'task-1',
                  title: 'Inspect brood',
                  hive: { id: 'h1', name: 'Hive 1', apiary: { id: 'a1', name: 'Yard A' } },
                  priority: 'HIGH',
                  dueDate: '2026-05-10T00:00:00Z',
                  status: 'PENDING',
                  isOverdue: false,
                  catchUpGuidance: null,
                },
                {
                  id: 'task-2',
                  title: 'Check stores',
                  hive: { id: 'h2', name: 'Hive 2', apiary: { id: 'a2', name: 'Yard B' } },
                  priority: 'MEDIUM',
                  dueDate: null,
                  status: 'PENDING',
                  isOverdue: true,
                  catchUpGuidance: 'Add pollen supplement',
                },
              ],
            },
            error: null,
          }),
      });

      const { result } = renderHook(() => useWeeklyQueue());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].apiaryName).toBe('Yard A');
      expect(result.current.data?.[1].apiaryName).toBe('Yard B');
    });
  });

  describe('useCompleteTask comprehensive error handling', () => {
    it('throws with descriptive error when complete task mutation fails', async () => {
      const error = new Error('Mutation execution failed');
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            error,
            data: null,
          }),
      });

      const { result } = renderHook(() => useCompleteTask());

      const mutation = result.current;
      mutation.mutate('task-id');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('complete task');
    });

    it('throws when completeTask response is null', async () => {
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: null,
            error: null,
          }),
      });

      const { result } = renderHook(() => useCompleteTask());
      result.current.mutate('task-id');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('No data returned');
    });

    it('throws when completeTask field is undefined', async () => {
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { someOtherField: {} },
            error: null,
          }),
      });

      const { result } = renderHook(() => useCompleteTask());
      result.current.mutate('task-id');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('No response from complete task');
    });

    it('throws when completeTask field is null', async () => {
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { completeTask: null },
            error: null,
          }),
      });

      const { result } = renderHook(() => useCompleteTask());
      result.current.mutate('task-id');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('No response from complete task');
    });

    it('successfully completes task and returns response', async () => {
      const completedTask = { id: 'task-1', status: 'COMPLETED', completedAt: '2026-10-11T00:00:00Z' };
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { completeTask: completedTask },
            error: null,
          }),
      });

      const { result } = renderHook(() => useCompleteTask());
      result.current.mutate('task-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual(completedTask);
    });
  });

  describe('useDeferTask comprehensive error handling', () => {
    it('throws with descriptive error when defer task mutation fails', async () => {
      const error = new Error('Mutation execution failed');
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            error,
            data: null,
          }),
      });

      const { result } = renderHook(() => useDeferTask());
      result.current.mutate({ id: 'task-id', reason: 'not ready' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('defer task');
    });

    it('throws when deferTask response is null', async () => {
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: null,
            error: null,
          }),
      });

      const { result } = renderHook(() => useDeferTask());
      result.current.mutate({ id: 'task-id' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('No data returned');
    });

    it('throws when deferTask field is undefined', async () => {
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { someOtherField: {} },
            error: null,
          }),
      });

      const { result } = renderHook(() => useDeferTask());
      result.current.mutate({ id: 'task-id' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('No response from defer task');
    });

    it('throws when deferTask field is null', async () => {
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { deferTask: null },
            error: null,
          }),
      });

      const { result } = renderHook(() => useDeferTask());
      result.current.mutate({ id: 'task-id' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error?.message).toContain('No response from defer task');
    });

    it('successfully defers task with reason and returns response', async () => {
      const deferredTask = { id: 'task-1', status: 'DEFERRED', dueDate: '2026-10-18T00:00:00Z' };
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { deferTask: deferredTask },
            error: null,
          }),
      });

      const { result } = renderHook(() => useDeferTask());
      result.current.mutate({ id: 'task-1', reason: 'waiting for weather' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual(deferredTask);
      expect(mockClient.mutation).toHaveBeenCalledWith(expect.anything(), {
        id: 'task-1',
        input: { reason: 'waiting for weather' },
      });
    });

    it('successfully defers task without reason', async () => {
      const deferredTask = { id: 'task-1', status: 'DEFERRED', dueDate: '2026-10-18T00:00:00Z' };
      mockClient.mutation.mockReturnValueOnce({
        toPromise: () =>
          Promise.resolve({
            data: { deferTask: deferredTask },
            error: null,
          }),
      });

      const { result } = renderHook(() => useDeferTask());
      result.current.mutate({ id: 'task-1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toEqual(deferredTask);
    });
  });
});
