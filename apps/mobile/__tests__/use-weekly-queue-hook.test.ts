import { groupByApiary } from '../src/features/planning/hooks/use-weekly-queue';
import type { ApiaryQueue } from '../src/features/planning/hooks/use-weekly-queue';

jest.mock('urql', () => ({
  gql: (strings: TemplateStringsArray) => strings.join(''),
  useClient: jest.fn(),
}));
jest.mock('@tanstack/react-query');

function makeTask(overrides: {
  id?: string;
  title?: string;
  hiveId?: string;
  hiveName?: string;
  apiaryId?: string;
  apiaryName?: string;
  priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate?: string | null;
  status?: string;
  isOverdue?: boolean;
  catchUpGuidance?: string | null;
}) {
  return {
    id: overrides.id ?? 'task-1',
    title: overrides.title ?? 'Inspect brood',
    hive: {
      id: overrides.hiveId ?? 'hive-1',
      name: overrides.hiveName ?? 'Hive 1',
      apiary: {
        id: overrides.apiaryId ?? 'apiary-1',
        name: overrides.apiaryName ?? 'Back Yard',
      },
    },
    priority: overrides.priority ?? 'MEDIUM',
    dueDate: overrides.dueDate === undefined ? '2026-05-10T00:00:00Z' : overrides.dueDate,
    status: overrides.status ?? 'PENDING',
    isOverdue: overrides.isOverdue ?? false,
    catchUpGuidance: overrides.catchUpGuidance ?? null,
  };
}

describe('groupByApiary', () => {
  it('returns empty array for empty input', () => {
    expect(groupByApiary([])).toEqual([]);
  });

  it('groups a single task into one apiary queue', () => {
    const tasks = [makeTask({ id: 't1', apiaryId: 'a1', apiaryName: 'Back Yard', hiveId: 'h1', hiveName: 'Hive 1' })];
    const result = groupByApiary(tasks);

    expect(result).toHaveLength(1);
    expect(result[0].apiaryId).toBe('a1');
    expect(result[0].apiaryName).toBe('Back Yard');
    expect(result[0].tasks).toHaveLength(1);
    expect(result[0].tasks[0].id).toBe('t1');
  });

  it('groups multiple tasks from the same apiary together', () => {
    const tasks = [
      makeTask({ id: 't1', apiaryId: 'a1', hiveId: 'h1' }),
      makeTask({ id: 't2', apiaryId: 'a1', hiveId: 'h2' }),
    ];
    const result = groupByApiary(tasks);

    expect(result).toHaveLength(1);
    expect(result[0].tasks).toHaveLength(2);
    expect(result[0].tasks.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('creates separate queues for different apiaries', () => {
    const tasks = [
      makeTask({ id: 't1', apiaryId: 'a1', apiaryName: 'Back Yard' }),
      makeTask({ id: 't2', apiaryId: 'a2', apiaryName: 'Front Yard' }),
    ];
    const result = groupByApiary(tasks);

    expect(result).toHaveLength(2);
    const names = result.map((q) => q.apiaryName).sort();
    expect(names).toEqual(['Back Yard', 'Front Yard']);
  });

  it('maps QueueTask fields from RawTask correctly', () => {
    const tasks = [
      makeTask({
        id: 'task-x',
        title: 'Add super',
        hiveId: 'hive-x',
        hiveName: 'Hive X',
        apiaryId: 'apiary-x',
        priority: 'HIGH',
        dueDate: '2026-05-15T00:00:00Z',
        status: 'PENDING',
        isOverdue: false,
        catchUpGuidance: null,
      }),
    ];
    const result = groupByApiary(tasks);
    const task = result[0].tasks[0];

    expect(task.id).toBe('task-x');
    expect(task.title).toBe('Add super');
    expect(task.hiveId).toBe('hive-x');
    expect(task.hiveName).toBe('Hive X');
    expect(task.priority).toBe('HIGH');
    expect(task.dueDate).toBe('2026-05-15T00:00:00Z');
    expect(task.status).toBe('PENDING');
    expect(task.isOverdue).toBe(false);
    expect(task.catchUpGuidance).toBeNull();
  });

  it('treats null dueDate as null (not undefined)', () => {
    const tasks = [makeTask({ dueDate: null })];
    const result = groupByApiary(tasks);
    expect(result[0].tasks[0].dueDate).toBeNull();
  });

  it('surfaces catchUpGuidance for overdue tasks', () => {
    const tasks = [makeTask({ isOverdue: true, catchUpGuidance: 'Check queen cells' })];
    const result = groupByApiary(tasks);
    expect(result[0].tasks[0].isOverdue).toBe(true);
    expect(result[0].tasks[0].catchUpGuidance).toBe('Check queen cells');
  });

  it('preserves insertion order of apiaries', () => {
    const tasks = [
      makeTask({ id: 't1', apiaryId: 'a1', apiaryName: 'Alpha' }),
      makeTask({ id: 't2', apiaryId: 'a2', apiaryName: 'Beta' }),
      makeTask({ id: 't3', apiaryId: 'a1', apiaryName: 'Alpha' }),
      makeTask({ id: 't4', apiaryId: 'a3', apiaryName: 'Gamma' }),
    ];
    const result = groupByApiary(tasks);

    expect(result.map((q) => q.apiaryName)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(result[0].tasks).toHaveLength(2);
  });

  it('handles all priority levels', () => {
    const priorities: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const tasks = priorities.map((p, i) => makeTask({ id: `t${i}`, priority: p }));
    const result = groupByApiary(tasks);
    const resultPriorities = result[0].tasks.map((t) => t.priority);
    expect(resultPriorities).toEqual(priorities);
  });

  it('returns type-safe ApiaryQueue array', () => {
    const tasks = [makeTask({})];
    const result: ApiaryQueue[] = groupByApiary(tasks);
    expect(Array.isArray(result)).toBe(true);
    expect(typeof result[0].apiaryId).toBe('string');
    expect(typeof result[0].apiaryName).toBe('string');
    expect(Array.isArray(result[0].tasks)).toBe(true);
  });
});

describe('error handling helpers', () => {
  it('handleGraphQLError throws with operation context', () => {
    const { handleGraphQLError } = require('../src/features/planning/hooks/use-weekly-queue');
    expect(() => handleGraphQLError(new Error('Network failed'), 'test op')).toThrow('test op failed: Network failed');
  });

  it('handleGraphQLError converts non-Error objects to strings', () => {
    const { handleGraphQLError } = require('../src/features/planning/hooks/use-weekly-queue');
    expect(() => handleGraphQLError({ code: 'ERR' }, 'test op')).toThrow('test op failed: [object Object]');
  });

  it('ensureData returns data when provided', () => {
    const { ensureData } = require('../src/features/planning/hooks/use-weekly-queue');
    const data = { test: 'value' };
    expect(ensureData(data, 'test')).toBe(data);
  });

  it('ensureData throws when data is null', () => {
    const { ensureData } = require('../src/features/planning/hooks/use-weekly-queue');
    expect(() => ensureData(null, 'test op')).toThrow('No data returned from test op');
  });

  it('ensureData throws when data is undefined', () => {
    const { ensureData } = require('../src/features/planning/hooks/use-weekly-queue');
    expect(() => ensureData(undefined, 'test op')).toThrow('No data returned from test op');
  });
});

describe('useWeeklyQueue hook', () => {
  const mockQuery = jest.fn();
  const mockClient = { query: mockQuery };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useClient } = require('urql');
    useClient.mockReturnValue(mockClient);
  });

  it('exports a function that can be called', () => {
    const { useWeeklyQueue } = require('../src/features/planning/hooks/use-weekly-queue');
    expect(typeof useWeeklyQueue).toBe('function');
  });

  it('returns a query with correct query key', () => {
    const { useWeeklyQueue } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useQuery } = require('@tanstack/react-query');
    const mockQueryResult = { data: null };
    useQuery.mockReturnValue(mockQueryResult);

    const result = useWeeklyQueue();
    expect(result).toEqual(mockQueryResult);

    const callArgs = useQuery.mock.calls[0];
    expect(callArgs[0].queryKey).toEqual(['weekly-queue']);
  });

  it('query function executes and transforms data via client.query', async () => {
    const { useWeeklyQueue } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useQuery } = require('@tanstack/react-query');

    let capturedQueryFn: any;
    useQuery.mockImplementation((config: any) => {
      capturedQueryFn = config.queryFn;
      return { data: null };
    });

    useWeeklyQueue();
    expect(capturedQueryFn).toBeDefined();

    const mockTaskData = [
      {
        id: 'task-1',
        title: 'Test task',
        hive: { id: 'hive-1', name: 'Hive 1', apiary: { id: 'apiary-1', name: 'Apiary 1' } },
        priority: 'HIGH',
        dueDate: '2026-05-10',
        status: 'PENDING',
        isOverdue: false,
        catchUpGuidance: null,
      },
    ];

    mockClient.query.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: { tasks: mockTaskData },
        error: null,
      }),
    });

    const result = await capturedQueryFn();
    expect(result).toHaveLength(1);
    expect(result[0].apiaryId).toBe('apiary-1');
    expect(result[0].tasks).toHaveLength(1);
  });

  it('query function throws error when client.query fails', async () => {
    const { useWeeklyQueue } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useQuery } = require('@tanstack/react-query');

    let capturedQueryFn: any;
    useQuery.mockImplementation((config: any) => {
      capturedQueryFn = config.queryFn;
      return { data: null };
    });

    useWeeklyQueue();

    mockClient.query.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        error: new Error('Network error'),
        data: null,
      }),
    });

    await expect(capturedQueryFn()).rejects.toThrow('Network error');
  });

  it('query function throws error when no data returned', async () => {
    const { useWeeklyQueue } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useQuery } = require('@tanstack/react-query');

    let capturedQueryFn: any;
    useQuery.mockImplementation((config: any) => {
      capturedQueryFn = config.queryFn;
      return { data: null };
    });

    useWeeklyQueue();

    mockClient.query.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: null,
        error: null,
      }),
    });

    await expect(capturedQueryFn()).rejects.toThrow('No data returned from weekly queue');
  });

  it('query function properly groups empty tasks', async () => {
    const { useWeeklyQueue } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useQuery } = require('@tanstack/react-query');

    let capturedQueryFn: any;
    useQuery.mockImplementation((config: any) => {
      capturedQueryFn = config.queryFn;
      return { data: null };
    });

    useWeeklyQueue();

    mockClient.query.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: { tasks: [] },
        error: null,
      }),
    });

    const result = await capturedQueryFn();
    expect(result).toEqual([]);
  });

  it('query function throws when tasks is not an array', async () => {
    const { useWeeklyQueue } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useQuery } = require('@tanstack/react-query');

    let capturedQueryFn: any;
    useQuery.mockImplementation((config: any) => {
      capturedQueryFn = config.queryFn;
      return { data: null };
    });

    useWeeklyQueue();

    mockClient.query.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: { tasks: null },
        error: null,
      }),
    });

    await expect(capturedQueryFn()).rejects.toThrow('Invalid tasks data returned from weekly queue');
  });

  it('query function throws when tasks is undefined', async () => {
    const { useWeeklyQueue } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useQuery } = require('@tanstack/react-query');

    let capturedQueryFn: any;
    useQuery.mockImplementation((config: any) => {
      capturedQueryFn = config.queryFn;
      return { data: null };
    });

    useWeeklyQueue();

    mockClient.query.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: { tasks: undefined },
        error: null,
      }),
    });

    await expect(capturedQueryFn()).rejects.toThrow('Invalid tasks data returned from weekly queue');
  });
});

describe('useCompleteTask hook', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = { mutation: jest.fn() };
    const { useClient } = require('urql');
    useClient.mockReturnValue(mockClient);
  });

  it('exports a function that can be called', () => {
    const { useCompleteTask } = require('../src/features/planning/hooks/use-weekly-queue');
    expect(typeof useCompleteTask).toBe('function');
  });

  it('returns a mutation', () => {
    const { useCompleteTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation } = require('@tanstack/react-query');
    const mockMutationResult = { mutate: jest.fn() };
    useMutation.mockReturnValue(mockMutationResult);

    const result = useCompleteTask();
    expect(result).toEqual(mockMutationResult);
  });

  it('invalidates weekly-queue query on success', () => {
    const { useCompleteTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    const mockInvalidate = jest.fn();
    const mockQueryClient = { invalidateQueries: mockInvalidate };
    useQueryClient.mockReturnValue(mockQueryClient);

    useMutation.mockImplementation((config) => {
      config.onSuccess?.();
      return { mutate: jest.fn() };
    });

    useCompleteTask();
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['weekly-queue'] });
  });

  it('mutation function executes client.mutation with task id', async () => {
    const { useCompleteTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    const mockQueryClient = { invalidateQueries: jest.fn() };
    useQueryClient.mockReturnValue(mockQueryClient);

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useCompleteTask();
    expect(capturedMutationFn).toBeDefined();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: { completeTask: { id: 'task-1', status: 'COMPLETED', completedAt: '2026-07-15' } },
        error: null,
      }),
    });

    const result = await capturedMutationFn('task-1');
    expect(result).toEqual({ id: 'task-1', status: 'COMPLETED', completedAt: '2026-07-15' });
    expect(mockClient.mutation).toHaveBeenCalledWith(expect.anything(), { id: 'task-1' });
  });

  it('mutation function throws error when client.mutation fails', async () => {
    const { useCompleteTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useCompleteTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        error: new Error('Mutation failed'),
        data: null,
      }),
    });

    await expect(capturedMutationFn('task-1')).rejects.toThrow('Mutation failed');
  });

  it('mutation function throws error when no data returned', async () => {
    const { useCompleteTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useCompleteTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: null,
        error: null,
      }),
    });

    await expect(capturedMutationFn('task-1')).rejects.toThrow('No data returned from complete task');
  });

  it('mutation function throws when completeTask is missing from response', async () => {
    const { useCompleteTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useCompleteTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: {},
        error: null,
      }),
    });

    await expect(capturedMutationFn('task-1')).rejects.toThrow('No response from complete task mutation');
  });
});

describe('useDeferTask hook', () => {
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = { mutation: jest.fn() };
    const { useClient } = require('urql');
    useClient.mockReturnValue(mockClient);
  });

  it('exports a function that can be called', () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    expect(typeof useDeferTask).toBe('function');
  });

  it('returns a mutation', () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation } = require('@tanstack/react-query');
    const mockMutationResult = { mutate: jest.fn() };
    useMutation.mockReturnValue(mockMutationResult);

    const result = useDeferTask();
    expect(result).toEqual(mockMutationResult);
  });

  it('invalidates weekly-queue query on success', () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    const mockInvalidate = jest.fn();
    const mockQueryClient = { invalidateQueries: mockInvalidate };
    useQueryClient.mockReturnValue(mockQueryClient);

    useMutation.mockImplementation((config) => {
      config.onSuccess?.();
      return { mutate: jest.fn() };
    });

    useDeferTask();
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['weekly-queue'] });
  });

  it('mutation function executes client.mutation with task id and reason', async () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    const mockQueryClient = { invalidateQueries: jest.fn() };
    useQueryClient.mockReturnValue(mockQueryClient);

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useDeferTask();
    expect(capturedMutationFn).toBeDefined();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: { deferTask: { id: 'task-1', status: 'DEFERRED', dueDate: '2026-07-22' } },
        error: null,
      }),
    });

    const result = await capturedMutationFn({ id: 'task-1', reason: 'not now' });
    expect(result).toEqual({ id: 'task-1', status: 'DEFERRED', dueDate: '2026-07-22' });
    expect(mockClient.mutation).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'task-1', input: { reason: 'not now' } }
    );
  });

  it('mutation function handles defer without reason', async () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useDeferTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: { deferTask: { id: 'task-1', status: 'DEFERRED', dueDate: '2026-07-22' } },
        error: null,
      }),
    });

    const result = await capturedMutationFn({ id: 'task-1' });
    expect(result).toEqual({ id: 'task-1', status: 'DEFERRED', dueDate: '2026-07-22' });
    expect(mockClient.mutation).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'task-1', input: { reason: undefined } }
    );
  });

  it('mutation function throws error when client.mutation fails', async () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useDeferTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        error: new Error('Mutation failed'),
        data: null,
      }),
    });

    await expect(capturedMutationFn({ id: 'task-1' })).rejects.toThrow('Mutation failed');
  });

  it('mutation function throws error when no data returned', async () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useDeferTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: null,
        error: null,
      }),
    });

    await expect(capturedMutationFn({ id: 'task-1' })).rejects.toThrow('No data returned from deferTask');
  });

  it('mutation function throws error when client.mutation throws', async () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useDeferTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.reject(new Error('Network timeout')),
    });

    await expect(capturedMutationFn({ id: 'task-1' })).rejects.toThrow();
  });

  it('defer mutation passes undefined reason when not provided', async () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useDeferTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: { deferTask: { id: 'task-1', status: 'DEFERRED', dueDate: '2026-07-22' } },
        error: null,
      }),
    });

    await capturedMutationFn({ id: 'task-1', reason: undefined });
    expect(mockClient.mutation).toHaveBeenCalledWith(
      expect.anything(),
      { id: 'task-1', input: { reason: undefined } }
    );
  });

  it('defer mutation throws when deferTask is missing from response', async () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useDeferTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: {},
        error: null,
      }),
    });

    await expect(capturedMutationFn({ id: 'task-1' })).rejects.toThrow('No response from defer task mutation');
  });

  it('defer mutation throws when no data returned', async () => {
    const { useDeferTask } = require('../src/features/planning/hooks/use-weekly-queue');
    const { useMutation, useQueryClient } = require('@tanstack/react-query');
    useQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });

    let capturedMutationFn: any;
    useMutation.mockImplementation((config) => {
      capturedMutationFn = config.mutationFn;
      return { mutate: jest.fn() };
    });

    useDeferTask();

    mockClient.mutation.mockReturnValueOnce({
      toPromise: () => Promise.resolve({
        data: null,
        error: null,
      }),
    });

    await expect(capturedMutationFn({ id: 'task-1' })).rejects.toThrow('No data returned from defer task');
  });
});

describe('groupByApiary edge cases', () => {
  it('maintains order when tasks are interleaved across apiaries', () => {
    const { groupByApiary } = require('../src/features/planning/hooks/use-weekly-queue');

    const tasks = [
      {
        id: 't1',
        title: 'Task 1',
        hive: { id: 'h1', name: 'H1', apiary: { id: 'a1', name: 'A1' } },
        priority: 'HIGH',
        dueDate: null,
        status: 'PENDING',
        isOverdue: false,
        catchUpGuidance: null,
      },
      {
        id: 't2',
        title: 'Task 2',
        hive: { id: 'h2', name: 'H2', apiary: { id: 'a2', name: 'A2' } },
        priority: 'HIGH',
        dueDate: null,
        status: 'PENDING',
        isOverdue: false,
        catchUpGuidance: null,
      },
      {
        id: 't3',
        title: 'Task 3',
        hive: { id: 'h3', name: 'H3', apiary: { id: 'a1', name: 'A1' } },
        priority: 'HIGH',
        dueDate: null,
        status: 'PENDING',
        isOverdue: false,
        catchUpGuidance: null,
      },
    ];

    const result = groupByApiary(tasks);
    expect(result).toHaveLength(2);
    expect(result[0].apiaryId).toBe('a1');
    expect(result[0].tasks).toHaveLength(2);
    expect(result[1].apiaryId).toBe('a2');
    expect(result[1].tasks).toHaveLength(1);
  });

  it('handles tasks with null values appropriately', () => {
    const { groupByApiary } = require('../src/features/planning/hooks/use-weekly-queue');

    const tasks = [
      {
        id: 'task-1',
        title: 'Task with nulls',
        hive: { id: 'h1', name: 'H1', apiary: { id: 'a1', name: 'A1' } },
        priority: 'LOW',
        dueDate: null,
        status: 'PENDING',
        isOverdue: false,
        catchUpGuidance: null,
      },
    ];

    const result = groupByApiary(tasks);
    expect(result[0].tasks[0].dueDate).toBeNull();
    expect(result[0].tasks[0].catchUpGuidance).toBeNull();
  });

  it('processes large number of tasks efficiently', () => {
    const { groupByApiary } = require('../src/features/planning/hooks/use-weekly-queue');

    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: `task-${i}`,
      title: `Task ${i}`,
      hive: { id: `h${i % 10}`, name: `Hive ${i % 10}`, apiary: { id: `a${i % 5}`, name: `Apiary ${i % 5}` } },
      priority: 'MEDIUM',
      dueDate: null,
      status: 'PENDING',
      isOverdue: false,
      catchUpGuidance: null,
    }));

    const result = groupByApiary(tasks);
    expect(result).toHaveLength(5); // 5 unique apiaries
    const totalTasks = result.reduce((sum, q) => sum + q.tasks.length, 0);
    expect(totalTasks).toBe(100);
  });
});
