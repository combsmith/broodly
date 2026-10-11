import React, { useState } from 'react';
import { View, ScrollView, RefreshControl, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Heading } from '../../../components/ui/heading';
import { Text } from '../../../components/ui/text';
import { Button, ButtonText } from '../../../components/ui/button';
import {
  useWeeklyQueue,
  useCompleteTask,
  useDeferTask,
  type QueueTask,
  type ApiaryQueue,
} from '../../../src/features/planning/hooks/use-weekly-queue';
import { ICON_COLORS } from '../../../src/theme/colors';

function MaterialsChecklist({ queues }: { queues: ApiaryQueue[] }) {
  const materials: Array<{ material: string; context: string }> = [];
  for (const q of queues) {
    for (const task of q.tasks) {
      // catchUpGuidance surfaces material hints when tasks are overdue
      if (task.isOverdue && task.catchUpGuidance) {
        materials.push({ material: task.catchUpGuidance, context: `${task.hiveName} — ${task.title}` });
      }
    }
  }
  if (materials.length === 0) return null;

  return (
    <View className="bg-background-warning rounded-xl p-4 mb-4">
      <Heading size="lg" className="mb-2">Catch-up Guidance</Heading>
      {materials.map((m) => (
        <View key={`${m.material}-${m.context}`} className="flex-row items-start gap-2 mb-1">
          <Ionicons name="cube-outline" size={14} color={ICON_COLORS.muted} />
          <View className="flex-1">
            <Text size="sm" className="font-medium">{m.material}</Text>
            <Text size="xs" className="text-typography-400">{m.context}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function TaskRow({ task, onComplete, onDismiss }: { task: QueueTask; onComplete: () => void; onDismiss: () => void }) {
  return (
    <View
      className={`p-3 rounded-xl border mb-2 ${task.isOverdue ? 'border-error-300 bg-background-error' : 'border-outline-200 bg-background-0'}`}
      accessibilityLabel={`${task.title} for ${task.hiveName}${task.isOverdue ? ', overdue' : ''}`}
    >
      <View className="flex-row justify-between items-start mb-1">
        <View className="flex-1 mr-2">
          <Text size="md" className="font-medium">{task.title}</Text>
          <Text size="xs" className="text-typography-400">{task.hiveName}</Text>
        </View>
        {task.isOverdue && (
          <View className="bg-error-100 px-2 py-0.5 rounded">
            <Text size="xs" className="text-error-700 font-medium">URGENT</Text>
          </View>
        )}
      </View>
      {task.isOverdue && task.catchUpGuidance && (
        <Text size="sm" className="text-typography-500 mb-2">{task.catchUpGuidance}</Text>
      )}
      <View className="flex-row gap-2 mt-1">
        <Button
          action="positive"
          variant="solid"
          onPress={onComplete}
          accessibilityLabel={`Mark '${task.title}' as done`}
          testID={`complete-${task.id}`}
        >
          <ButtonText>Did It</ButtonText>
        </Button>
        <Button
          action="secondary"
          variant="link"
          onPress={onDismiss}
          accessibilityLabel={`Defer '${task.title}' for later`}
          testID={`defer-${task.id}`}
        >
          <ButtonText>Not now</ButtonText>
        </Button>
      </View>
    </View>
  );
}

function ApiarySection({ queue }: { queue: ApiaryQueue }) {
  const [expanded, setExpanded] = useState(true);
  const completeTask = useCompleteTask();
  const deferTask = useDeferTask();

  return (
    <View className="mb-4">
      <Pressable
        className="flex-row justify-between items-center py-2 min-h-[48px]"
        onPress={() => setExpanded(!expanded)}
        accessibilityRole="button"
        accessibilityLabel={`${queue.apiaryName}, ${queue.tasks.length} tasks`}
        testID={`apiary-section-${queue.apiaryId}`}
      >
        <Heading size="lg">{queue.apiaryName}</Heading>
        <View className="flex-row items-center gap-2">
          <Text size="sm" className="text-typography-400">{queue.tasks.length}</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={ICON_COLORS.muted}
          />
        </View>
      </Pressable>
      {expanded &&
        queue.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onComplete={() => completeTask.mutate(task.id)}
            onDismiss={() => deferTask.mutate({ id: task.id, reason: 'not now' })}
          />
        ))}
    </View>
  );
}

export default function PlanScreen() {
  const { data: queues, isLoading, isError, refetch, isRefetching } = useWeeklyQueue();

  if (isLoading) {
    return (
      <View className="flex-1 bg-background-0 justify-center items-center">
        <Text size="md" className="text-typography-500">Loading your plan...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-background-0 justify-center items-center px-6">
        <Ionicons name="cloud-offline-outline" size={48} color={ICON_COLORS.muted} />
        <Text size="md" className="text-typography-500 mt-4 text-center">
          Couldn't load your plan. Pull down to try again.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-50"
      contentContainerClassName="px-4 pt-6 pb-12"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <Heading size="2xl" className="mb-4">This Week's Plan</Heading>

      {queues && <MaterialsChecklist queues={queues} />}

      {!queues || queues.length === 0 ? (
        <View className="items-center py-12">
          <Ionicons name="checkmark-done-circle-outline" size={48} color={ICON_COLORS.muted} />
          <Text size="md" className="text-typography-400 mt-4 text-center">
            All caught up! No actions planned this week.
          </Text>
        </View>
      ) : (
        queues.map((queue) => (
          <ApiarySection key={queue.apiaryId} queue={queue} />
        ))
      )}
    </ScrollView>
  );
}
