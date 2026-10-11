import React from 'react';
import { renderHook as rtlRenderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClient } from 'urql';
import {
  useCollaborators,
  useInviteCollaborator,
  useRevokeCollaborator,
  useAccessAuditLog,
} from './use-collaborators';

jest.mock('urql');

interface Collaborator {
  id: string;
  email: string;
  status: 'pending' | 'accepted';
  role: string;
  invitedAt: string;
  acceptedAt: string | null;
}

interface AuditEntry {
  id: string;
  eventType: string;
  targetEmail: string;
  occurredAt: string;
}

const mockCollaborators: Collaborator[] = [
  {
    id: 'collab-1',
    email: 'alice@example.com',
    status: 'accepted',
    role: 'editor',
    invitedAt: '2024-01-01T00:00:00Z',
    acceptedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'collab-2',
    email: 'bob@example.com',
    status: 'pending',
    role: 'viewer',
    invitedAt: '2024-01-10T00:00:00Z',
    acceptedAt: null,
  },
];

const mockAuditLog: AuditEntry[] = [
  {
    id: 'audit-1',
    eventType: 'INVITE',
    targetEmail: 'alice@example.com',
    occurredAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'audit-2',
    eventType: 'REVOKE',
    targetEmail: 'charlie@example.com',
    occurredAt: '2024-01-05T00:00:00Z',
  },
];

let queryClient: QueryClient;

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const renderHook = <T,>(callback: () => T) => rtlRenderHook(callback, { wrapper });

describe('useCollaborators', () => {
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

  describe('useCollaborators', () => {
    it('fetches collaborators list', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { collaborators: mockCollaborators },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useCollaborators());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockCollaborators);
    });

    it('handles query error', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Network error'),
          }),
      });

      const { result } = renderHook(() => useCollaborators());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('throws when no data returned', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: {},
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useCollaborators());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useInviteCollaborator', () => {
    it('invites collaborator and invalidates caches', async () => {
      const newCollab: Collaborator = {
        id: 'collab-3',
        email: 'diana@example.com',
        status: 'pending',
        role: 'editor',
        invitedAt: '2024-01-20T00:00:00Z',
        acceptedAt: null,
      };

      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { inviteCollaborator: newCollab },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useInviteCollaborator());

      result.current.mutate('diana@example.com');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['collaborators'],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['access-audit-log'],
      });
    });

    it('handles invitation error', async () => {
      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Invalid email'),
          }),
      });

      const { result } = renderHook(() => useInviteCollaborator());

      result.current.mutate('invalid-email');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useRevokeCollaborator', () => {
    it('revokes collaborator and invalidates caches', async () => {
      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { revokeCollaborator: true },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useRevokeCollaborator());

      result.current.mutate('collab-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(true);
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['collaborators'],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['access-audit-log'],
      });
    });

    it('handles revocation error', async () => {
      mockClient.mutation.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Revocation failed'),
          }),
      });

      const { result } = renderHook(() => useRevokeCollaborator());

      result.current.mutate('collab-1');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useAccessAuditLog', () => {
    it('fetches audit log', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: { accessAuditLog: mockAuditLog },
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useAccessAuditLog());

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAuditLog);
    });

    it('handles audit log query error', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: undefined,
            error: new Error('Access denied'),
          }),
      });

      const { result } = renderHook(() => useAccessAuditLog());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('throws when no data returned', async () => {
      mockClient.query.mockReturnValue({
        toPromise: () =>
          Promise.resolve({
            data: {},
            error: undefined,
          }),
      });

      const { result } = renderHook(() => useAccessAuditLog());

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
