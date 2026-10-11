import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClient } from 'urql';
import {
  WEEKLY_QUEUE_QUERY,
  COMPLETE_TASK_MUTATION,
  DEFER_TASK_MUTATION,
} from '../../../services/graphql/planning';

export type TaskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface QueueTask {
  id: string;
  title: string;
  hiveId: string;
  hiveName: string;
  priority: TaskPriority;
  dueDate: string | null;
  status: string;
  isOverdue: boolean;
  catchUpGuidance: string | null;
}

export interface ApiaryQueue {
  apiaryId: string;
  apiaryName: string;
  tasks: QueueTask[];
}

interface RawTask {
  id: string;
  title: string;
  hive: {
    id: string;
    name: string;
    apiary: {
      id: string;
      name: string;
    };
  };
  priority: TaskPriority;
  dueDate: string | null;
  status: string;
  isOverdue: boolean;
  catchUpGuidance: string | null;
}

export function groupByApiary(tasks: RawTask[]): ApiaryQueue[] {
  const map = new Map<string, ApiaryQueue>();
  for (const task of tasks) {
    const { id: apiaryId, name: apiaryName } = task.hive.apiary;
    let queue = map.get(apiaryId);
    if (!queue) {
      queue = { apiaryId, apiaryName, tasks: [] };
      map.set(apiaryId, queue);
    }
    queue.tasks.push({
      id: task.id,
      title: task.title,
      hiveId: task.hive.id,
      hiveName: task.hive.name,
      priority: task.priority,
      dueDate: task.dueDate ?? null,
      status: task.status,
      isOverdue: task.isOverdue,
      catchUpGuidance: task.catchUpGuidance ?? null,
    });
  }
  return Array.from(map.values());
}

const QUEUE_KEYS = {
  weekly: ['weekly-queue'] as const,
};

export function handleGraphQLError(error: unknown, operationName: string): never {
  const errorMsg = error instanceof Error ? error.message : String(error);
  throw new Error(`${operationName} failed: ${errorMsg}`);
}

export function ensureData<T>(data: T | null | undefined, operationName: string): T {
  if (!data) {
    throw new Error(`No data returned from ${operationName}`);
  }
  return data;
}

export function useWeeklyQueue() {
  const client = useClient();

  return useQuery({
    queryKey: QUEUE_KEYS.weekly,
    queryFn: async () => {
      const result = await client.query(WEEKLY_QUEUE_QUERY, {}).toPromise();
      if (result.error) {
        handleGraphQLError(result.error, 'weekly queue');
      }
      const data = ensureData(result.data, 'weekly queue');
      if (!Array.isArray(data.tasks)) {
        throw new Error('Invalid tasks data returned from weekly queue');
      }
      return groupByApiary(data.tasks as RawTask[]);
    },
  });
}

export function useCompleteTask() {
  const client = useClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await client.mutation(COMPLETE_TASK_MUTATION, { id }).toPromise();
      if (result.error) {
        handleGraphQLError(result.error, 'complete task');
      }
      const data = ensureData(result.data, 'complete task');
      if (!data.completeTask) {
        throw new Error('No response from complete task mutation');
      }
      return data.completeTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_KEYS.weekly });
    },
  });
}

export function useDeferTask() {
  const client = useClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const result = await client
        .mutation(DEFER_TASK_MUTATION, { id, input: { reason } })
        .toPromise();
      if (result.error) {
        handleGraphQLError(result.error, 'defer task');
      }
      const data = ensureData(result.data, 'defer task');
      if (!data.deferTask) {
        throw new Error('No response from defer task mutation');
      }
      return data.deferTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUEUE_KEYS.weekly });
    },
  });
}
