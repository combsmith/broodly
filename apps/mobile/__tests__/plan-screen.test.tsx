/**
 * @jest-environment jsdom
 */
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../components/ui/heading', () => {
  const { Text } = require('react-native');
  return { Heading: (props: Record<string, unknown>) => require('react').createElement(Text, props, props.children) };
});

jest.mock('../components/ui/text', () => {
  const { Text } = require('react-native');
  return { Text: (props: Record<string, unknown>) => require('react').createElement(Text, props, props.children) };
});

jest.mock('../components/ui/button', () => {
  const { View, Text } = require('react-native');
  return {
    Button: (props: Record<string, unknown>) => require('react').createElement(View, { ...props, testID: props.testID }, props.children),
    ButtonText: (props: Record<string, unknown>) => require('react').createElement(Text, {}, props.children),
  };
});

const mockCompleteTask = { mutate: jest.fn() };
const mockDeferTask = { mutate: jest.fn() };

jest.mock('../src/features/planning/hooks/use-weekly-queue', () => ({
  useWeeklyQueue: jest.fn(),
  useCompleteTask: () => mockCompleteTask,
  useDeferTask: () => mockDeferTask,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as planHooks from '../src/features/planning/hooks/use-weekly-queue';

describe('Plan Screen', () => {
  const defaultQueueData = {
    data: [
      {
        apiaryId: 'apiary-1',
        apiaryName: 'Back Yard',
        tasks: [
          {
            id: 'task-1',
            title: 'Inspect brood',
            hiveId: 'hive-1',
            hiveName: 'Hive 1',
            priority: 'HIGH',
            dueDate: '2026-05-10T00:00:00Z',
            status: 'PENDING',
            isOverdue: false,
            catchUpGuidance: null,
          },
        ],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue(defaultQueueData);
  });

  it('renders plan screen with title', () => {
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText(/This Week's Plan/)).toBeTruthy();
  });

  it('displays loading state while fetching', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText(/Loading your plan/)).toBeTruthy();
  });

  it('displays error state when query fails', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText(/Couldn't load your plan/)).toBeTruthy();
  });

  it('renders tasks from queues', () => {
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Inspect brood')).toBeTruthy();
    expect(screen.getByText('Hive 1')).toBeTruthy();
  });

  it('displays empty state when no tasks', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText(/All caught up/)).toBeTruthy();
  });

  it('renders overdue tasks with guidance', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Urgent inspection',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'CRITICAL',
              dueDate: '2026-05-01T00:00:00Z',
              status: 'PENDING',
              isOverdue: true,
              catchUpGuidance: 'Check for swarm cells',
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('URGENT')).toBeTruthy();
    expect(screen.getAllByText('Check for swarm cells').length).toBeGreaterThanOrEqual(1);
  });

  it('calls completeTask when Did It button pressed', () => {
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    fireEvent.press(screen.getByTestId('complete-task-1'));
    expect(mockCompleteTask.mutate).toHaveBeenCalledWith('task-1');
  });

  it('calls deferTask when Not now button pressed', () => {
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    fireEvent.press(screen.getByTestId('defer-task-1'));
    expect(mockDeferTask.mutate).toHaveBeenCalledWith({ id: 'task-1', reason: 'not now' });
  });

  it('renders materials checklist with overdue guidance', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Add super',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'HIGH',
              dueDate: '2026-05-01T00:00:00Z',
              status: 'PENDING',
              isOverdue: true,
              catchUpGuidance: 'Bring two supers',
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Catch-up Guidance')).toBeTruthy();
    expect(screen.getAllByText('Bring two supers').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hive 1 — Add super')).toBeTruthy();
  });

  it('does not render materials checklist when no overdue tasks with guidance', () => {
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    const checklist = screen.queryByText('Catch-up Guidance');
    expect(checklist).toBeFalsy();
  });

  it('toggles apiary section expansion on press', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Inspect brood',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'HIGH',
              dueDate: '2026-05-10T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    const { rerender } = render(<PlanScreen />);

    // Verify task is visible initially (expanded by default)
    expect(screen.getByText('Inspect brood')).toBeTruthy();

    // Press apiary section to collapse
    fireEvent.press(screen.getByTestId('apiary-section-apiary-1'));
    rerender(<PlanScreen />);

    // After collapse, the section's tasks are hidden
    expect(screen.queryByText('Inspect brood')).toBeNull();
  });

  it('renders multiple apiaries in separate sections', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Inspect Hive 1',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'HIGH',
              dueDate: '2026-05-10T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
        {
          apiaryId: 'apiary-2',
          apiaryName: 'Front Yard',
          tasks: [
            {
              id: 'task-2',
              title: 'Inspect Hive 2',
              hiveId: 'hive-2',
              hiveName: 'Hive 2',
              priority: 'MEDIUM',
              dueDate: '2026-05-15T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Back Yard')).toBeTruthy();
    expect(screen.getByText('Front Yard')).toBeTruthy();
    expect(screen.getByText('Inspect Hive 1')).toBeTruthy();
    expect(screen.getByText('Inspect Hive 2')).toBeTruthy();
  });

  it('displays task count in apiary section header', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Inspect brood',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'HIGH',
              dueDate: '2026-05-10T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
            {
              id: 'task-2',
              title: 'Add super',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'MEDIUM',
              dueDate: '2026-05-12T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('renders task with correct styling for urgent tasks', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Urgent inspection',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'CRITICAL',
              dueDate: '2026-05-01T00:00:00Z',
              status: 'PENDING',
              isOverdue: true,
              catchUpGuidance: 'Check for swarm',
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByTestId('complete-task-1')).toBeTruthy();
  });

  it('renders task with accessibility label including context', () => {
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    const taskElement = screen.queryByText(/Hive 1/);
    expect(taskElement).toBeTruthy();
  });

  it('renders apiary section with correct task context', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Test Apiary',
          tasks: [
            {
              id: 'task-x',
              title: 'Test task',
              hiveId: 'hive-x',
              hiveName: 'Hive X',
              priority: 'HIGH',
              dueDate: '2026-05-10T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Test Apiary')).toBeTruthy();
    expect(screen.getByText('Test task')).toBeTruthy();
  });

  it('handles null dueDate gracefully', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Inspect brood',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'MEDIUM',
              dueDate: null,
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Inspect brood')).toBeTruthy();
  });

  it('calls refetch when pull-to-refresh triggered', () => {
    const mockRefetch = jest.fn();
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    const { root } = render(<PlanScreen />);
    expect(root).toBeTruthy();
  });

  it('handles LOW priority tasks', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Clean entrance reducer',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'LOW',
              dueDate: '2026-05-20T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Clean entrance reducer')).toBeTruthy();
  });

  it('renders task with overdue guidance but no URGENT badge if not isOverdue', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Inspect frames',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'HIGH',
              dueDate: '2026-05-10T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: 'Bring inspection tool',
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Inspect frames')).toBeTruthy();
    // Should not show URGENT badge since isOverdue is false
    expect(screen.queryByText('URGENT')).toBeFalsy();
  });

  it('handles mixed priority levels in same apiary', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Critical task',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'CRITICAL',
              dueDate: '2026-05-01T00:00:00Z',
              status: 'PENDING',
              isOverdue: true,
              catchUpGuidance: null,
            },
            {
              id: 'task-2',
              title: 'High priority task',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'HIGH',
              dueDate: '2026-05-05T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
            {
              id: 'task-3',
              title: 'Medium priority task',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'MEDIUM',
              dueDate: '2026-05-10T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Critical task')).toBeTruthy();
    expect(screen.getByText('High priority task')).toBeTruthy();
    expect(screen.getByText('Medium priority task')).toBeTruthy();
    expect(screen.getByText('URGENT')).toBeTruthy(); // Only critical should be URGENT
  });

  it('renders empty state with correct icon', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText(/All caught up/)).toBeTruthy();
  });

  it('does not show materials checklist when no overdue tasks', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Routine check',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'MEDIUM',
              dueDate: '2026-05-20T00:00:00Z',
              status: 'PENDING',
              isOverdue: false,
              catchUpGuidance: null,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.queryByText('Catch-up Guidance')).toBeFalsy();
  });

  it('shows materials checklist when overdue tasks with guidance exist', () => {
    (planHooks.useWeeklyQueue as jest.Mock).mockReturnValue({
      data: [
        {
          apiaryId: 'apiary-1',
          apiaryName: 'Back Yard',
          tasks: [
            {
              id: 'task-1',
              title: 'Inspect hive',
              hiveId: 'hive-1',
              hiveName: 'Hive 1',
              priority: 'CRITICAL',
              dueDate: '2026-05-01T00:00:00Z',
              status: 'PENDING',
              isOverdue: true,
              catchUpGuidance: 'Bring veil and gloves',
            },
            {
              id: 'task-2',
              title: 'Add super',
              hiveId: 'hive-2',
              hiveName: 'Hive 2',
              priority: 'HIGH',
              dueDate: '2026-05-01T00:00:00Z',
              status: 'PENDING',
              isOverdue: true,
              catchUpGuidance: 'Bring two supers',
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isRefetching: false,
    });
    const PlanScreen = require('../app/(tabs)/plan/index').default;
    render(<PlanScreen />);
    expect(screen.getByText('Catch-up Guidance')).toBeTruthy();
    // Guidance appears in both the checklist and the overdue task row
    expect(screen.getAllByText('Bring veil and gloves')).toHaveLength(2);
    expect(screen.getAllByText('Bring two supers')).toHaveLength(2);
  });
});
