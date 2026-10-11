import React from 'react';
import { renderHook as rtlRenderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClient } from 'urql';
import {
  useHives,
  useHive,
  useCreateHive,
  useUpdateHive,
  useDeleteHive,
} from './use-hives';
import type { Hive, CreateHiveInput, UpdateHiveInput } from '@broodly/graphql-types';

jest.mock('urql');

const mockHives: Hive[] = [
  {
    id: 'hive-1',
    apiaryId: 'apiary-1',
    name: 'Hive A',
    breed: 'Italian',
    yearStarted: 2020,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'hive-2',
    apiaryId: 'apiary-1',
    name: 'Hive B',
    breed: 'Carniolan',
    yearStarted: 2021,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockHive: Hive = mockHives[0];

let queryClient: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderHook = <T,>(callback: () => T) => rtlRenderHook(callback, { wrapper });

describe('useHives', () => {
  let mockClient: any;
  let mockQueryClient: any;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      mutation: jest.fn(),
    };
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    mockQueryClient = {
      invalidateQueries: jest.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(),
    };

    (useClient as jest.Mock).mockReturnValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('useHives', () => {
    it('fetches hives for apiary', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { hives: mockHives },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useHives('apiary-1'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHives);
    });

    it('is disabled when apiaryId is empty', () => {
      mockClient.query.mockReturnValue({
        toPromise: () => Promise.resolve({ data: { hives: mockHives }, error: undefined }),
      });

      const { result } = renderHook(() => useHives(''));

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles query error', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Network error'),
          }),
      });

      const { result } = renderHook(() => useHives('apiary-1'));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useHive', () => {
    it('fetches single hive by id', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { hive: mockHive },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useHive('hive-1'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockHive);
    });

    it('is disabled when id is empty', () => {
      mockClient.query.mockReturnValue({
        toPromise: () => Promise.resolve({ data: { hive: mockHive }, error: undefined }),
      });

      const { result } = renderHook(() => useHive(''));

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles error fetching single hive', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Not found'),
          }),
      });

      const { result } = renderHook(() => useHive('invalid-id'));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCreateHive', () => {
    it('creates new hive and invalidates caches', async () => {
      const input: CreateHiveInput = {
        apiaryId: 'apiary-1',
        name: 'Hive C',
        breed: 'Russian',
        yearStarted: 2024,
      };
      const newHive: Hive = {
        ...mockHive,
        id: 'hive-3',
        name: input.name,
        breed: input.breed,
        yearStarted: input.yearStarted,
      };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { createHive: newHive },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useCreateHive());

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['hives', 'apiary-1'],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['apiaries'],
      });
    });

    it('handles creation error', async () => {
      const input: CreateHiveInput = {
        apiaryId: 'apiary-1',
        name: 'Hive C',
        breed: 'Russian',
        yearStarted: 2024,
      };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Validation error'),
          }),
      });

      const { result } = renderHook(() => useCreateHive());

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateHive', () => {
    it('updates hive and invalidates caches', async () => {
      const input: UpdateHiveInput = { name: 'Updated Hive A' };
      const updated: Hive = { ...mockHive, name: input.name };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { updateHive: updated },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useUpdateHive());

      result.current.mutate({ id: mockHive.id, input });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['hive', mockHive.id],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['apiaries'],
      });
    });

    it('handles update error', async () => {
      const input: UpdateHiveInput = { name: 'Updated Hive A' };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Update failed'),
          }),
      });

      const { result } = renderHook(() => useUpdateHive());

      result.current.mutate({ id: mockHive.id, input });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeleteHive', () => {
    it('deletes hive and invalidates cache', async () => {
      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { deleteHive: true },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useDeleteHive());

      result.current.mutate(mockHive.id);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['apiaries'],
      });
    });

    it('handles deletion error', async () => {
      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Delete failed'),
          }),
      });

      const { result } = renderHook(() => useDeleteHive());

      result.current.mutate(mockHive.id);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
