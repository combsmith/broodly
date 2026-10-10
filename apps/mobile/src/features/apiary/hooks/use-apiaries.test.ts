import React from 'react';
import { renderHook as rtlRenderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClient } from 'urql';
import {
  useApiaries,
  useApiary,
  useCreateApiary,
  useUpdateApiary,
  useDeleteApiary,
} from './use-apiaries';
import type { Apiary, CreateApiaryInput, UpdateApiaryInput } from '@broodly/graphql-types';

jest.mock('urql');

const mockApiaries: Apiary[] = [
  {
    id: 'apiary-1',
    name: 'Main Apiary',
    location: 'Backyard',
    hiveCount: 3,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'apiary-2',
    name: 'Field Apiary',
    location: 'North field',
    hiveCount: 5,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockApiary: Apiary = mockApiaries[0];

let queryClient: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderHook = <T,>(callback: () => T) => rtlRenderHook(callback, { wrapper });

describe('useApiaries', () => {
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

  describe('useApiaries', () => {
    it('fetches and returns apiaries list', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { apiaries: mockApiaries },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useApiaries());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockApiaries);
    });

    it('handles query error', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Network error'),
          }),
      });

      const { result } = renderHook(() => useApiaries());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('throws when no data returned', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: {},
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useApiaries());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useApiary', () => {
    it('fetches single apiary by id', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { apiary: mockApiary },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useApiary('apiary-1'));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockApiary);
    });

    it('is disabled when id is empty', () => {
      mockClient.query.mockReturnValue({
        toPromise: () => Promise.resolve({ data: { apiary: mockApiary }, error: undefined }),
      });

      const { result } = renderHook(() => useApiary(''));

      expect(result.current.fetchStatus).toBe('idle');
    });

    it('handles error fetching single apiary', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Not found'),
          }),
      });

      const { result } = renderHook(() => useApiary('invalid-id'));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCreateApiary', () => {
    it('creates new apiary and invalidates cache', async () => {
      const input: CreateApiaryInput = { name: 'New Apiary', location: 'Garden' };
      const newApiary: Apiary = {
        ...mockApiary,
        id: 'new-apiary',
        name: input.name,
        location: input.location,
      };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { createApiary: newApiary },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useCreateApiary());

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['apiaries'],
      });
    });

    it('handles creation error', async () => {
      const input: CreateApiaryInput = { name: 'New Apiary', location: 'Garden' };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Validation error'),
          }),
      });

      const { result } = renderHook(() => useCreateApiary());

      result.current.mutate(input);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useUpdateApiary', () => {
    it('updates apiary and invalidates caches', async () => {
      const input: UpdateApiaryInput = { name: 'Updated Name' };
      const updated: Apiary = { ...mockApiary, name: input.name };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { updateApiary: updated },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useUpdateApiary());

      result.current.mutate({ id: mockApiary.id, input });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['apiaries'],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['apiaries', mockApiary.id],
      });
    });

    it('handles update error', async () => {
      const input: UpdateApiaryInput = { name: 'Updated Name' };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Update failed'),
          }),
      });

      const { result } = renderHook(() => useUpdateApiary());

      result.current.mutate({ id: mockApiary.id, input });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeleteApiary', () => {
    it('deletes apiary and invalidates cache', async () => {
      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { deleteApiary: true },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useDeleteApiary());

      result.current.mutate(mockApiary.id);

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

      const { result } = renderHook(() => useDeleteApiary());

      result.current.mutate(mockApiary.id);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('throws when no data returned', async () => {
      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { deleteApiary: null },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useDeleteApiary());

      result.current.mutate(mockApiary.id);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
