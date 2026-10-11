/**
 * Tests for Epic 8 inspection screens:
 *   - inspect/index.tsx  (entry: scope selection, resume detection)
 *   - inspect/step.tsx   (guided step: options, branching, progression)
 *   - inspect/summary.tsx (summary: stats, observations, save flow)
 */

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ id: 'apiary-1', hiveId: 'hive-1' }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../components/ui/heading', () => {
  const { Text } = require('react-native');
  return {
    Heading: (props: Record<string, unknown>) =>
      require('react').createElement(Text, props, props.children),
  };
});

jest.mock('../components/ui/text', () => {
  const { Text } = require('react-native');
  return {
    Text: (props: Record<string, unknown>) =>
      require('react').createElement(Text, props, props.children),
  };
});

jest.mock('../components/ui/button', () => {
  const { TouchableOpacity, Text, ActivityIndicator } = require('react-native');
  return {
    Button: (props: Record<string, unknown>) =>
      require('react').createElement(
        TouchableOpacity,
        {
          onPress: props.onPress,
          disabled: props.disabled,
          testID: props.testID,
          accessibilityLabel: props.accessibilityLabel,
          accessibilityState: { disabled: !!props.disabled },
        },
        props.children,
      ),
    ButtonText: (props: Record<string, unknown>) =>
      require('react').createElement(Text, {}, props.children),
    ButtonSpinner: () => require('react').createElement(ActivityIndicator, {}),
  };
});

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { useInspectionStore } from '../src/store/inspection-store';
import { useConnectivityStore } from '../src/store/connectivity-store';

beforeEach(() => {
  jest.clearAllMocks();
  useInspectionStore.getState().clearInspection();
  useConnectivityStore.setState({ isOnline: true, lastOnlineAt: null });
});

const createObservation = (overrides: Record<string, unknown> = {}) => ({
  id: 'obs-1',
  promptId: 'entrance',
  observationType: 'entrance_assessment',
  value: 'normal',
  classification: 'normal',
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ─── inspect/index.tsx ────────────────────────────────────────────────────────

describe('InspectionEntryScreen', () => {
  function renderScreen() {
    const Screen = require('../app/(tabs)/apiaries/[id]/hives/[hiveId]/inspect/index').default;
    return render(<Screen />);
  }

  it('renders type selection UI when no active inspection', () => {
    renderScreen();
    expect(screen.getByText('Start Inspection')).toBeTruthy();
    expect(screen.getByTestId('type-full')).toBeTruthy();
    expect(screen.getByTestId('type-quick')).toBeTruthy();
  });

  it('Begin button is disabled until type is selected', () => {
    renderScreen();
    const btn = screen.getByTestId('start-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('enables Begin button after selecting Full type', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('type-full'));
    const btn = screen.getByTestId('start-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('enables Begin button after selecting Quick type', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('type-quick'));
    const btn = screen.getByTestId('start-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('shows step counts derived from the step engine (not hardcoded)', () => {
    renderScreen();
    // Full: 7 base prompts; Quick: 5 quick-mode prompts
    expect(screen.getByText(/7 steps/)).toBeTruthy();
    expect(screen.getByText(/5 steps/)).toBeTruthy();
  });

  it('shows resume UI when an active inspection exists', () => {
    useInspectionStore.getState().startInspection({
      inspectionId: 'insp-1',
      hiveId: 'hive-1',
      hiveName: 'Hive 1',
      type: 'full',
    });
    renderScreen();
    expect(screen.getByText('Resume Inspection?')).toBeTruthy();
    expect(screen.getByTestId('resume-btn')).toBeTruthy();
    expect(screen.getByTestId('start-fresh-btn')).toBeTruthy();
  });

  it('resume button navigates to step screen', () => {
    useInspectionStore.getState().startInspection({
      inspectionId: 'insp-1',
      hiveId: 'hive-1',
      hiveName: 'Hive 1',
      type: 'full',
    });
    renderScreen();
    fireEvent.press(screen.getByTestId('resume-btn'));
    expect(mockPush).toHaveBeenCalledWith(
      '/(tabs)/apiaries/apiary-1/hives/hive-1/inspect/step',
    );
  });

  it('Start Fresh clears the active inspection', () => {
    useInspectionStore.getState().startInspection({
      inspectionId: 'insp-1',
      hiveId: 'hive-1',
      hiveName: 'Hive 1',
      type: 'full',
    });
    renderScreen();
    fireEvent.press(screen.getByTestId('start-fresh-btn'));
    expect(useInspectionStore.getState().inspectionId).toBeNull();
  });

  it('shows offline banner when offline', () => {
    useConnectivityStore.setState({ isOnline: false, lastOnlineAt: null });
    renderScreen();
    expect(screen.getByText(/offline/i)).toBeTruthy();
  });

  it('hides offline banner when online', () => {
    renderScreen();
    expect(screen.queryByText(/offline/i)).toBeNull();
  });

  it('starting inspection navigates to step screen', async () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('type-full'));
    await act(async () => {
      fireEvent.press(screen.getByTestId('start-btn'));
    });
    expect(mockPush).toHaveBeenCalledWith(
      '/(tabs)/apiaries/apiary-1/hives/hive-1/inspect/step',
    );
  });
});

// ─── inspect/step.tsx ─────────────────────────────────────────────────────────

describe('InspectionStepScreen', () => {
  function startFullInspection() {
    useInspectionStore.getState().startInspection({
      inspectionId: 'insp-1',
      hiveId: 'hive-1',
      hiveName: 'Hive 1',
      type: 'full',
    });
  }

  function renderScreen() {
    const Screen = require('../app/(tabs)/apiaries/[id]/hives/[hiveId]/inspect/step').default;
    return render(<Screen />);
  }

  it('renders the first prompt (entrance assessment)', () => {
    startFullInspection();
    renderScreen();
    expect(screen.getByText('Entrance Assessment')).toBeTruthy();
  });

  it('Next button is disabled for required prompt with no selection', () => {
    startFullInspection();
    renderScreen();
    const btn = screen.getByTestId('next-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(true);
  });

  it('Next button is enabled after selecting an option', () => {
    startFullInspection();
    renderScreen();
    fireEvent.press(screen.getByTestId('option-normal'));
    const btn = screen.getByTestId('next-btn');
    expect(btn.props.accessibilityState?.disabled).toBe(false);
  });

  it('pressing Next adds observation and advances prompt index', () => {
    startFullInspection();
    renderScreen();
    fireEvent.press(screen.getByTestId('option-normal'));
    fireEvent.press(screen.getByTestId('next-btn'));
    expect(useInspectionStore.getState().observations).toHaveLength(1);
    expect(useInspectionStore.getState().currentPromptIndex).toBe(1);
  });

  it('pause button calls pauseInspection and navigates back', () => {
    startFullInspection();
    renderScreen();
    fireEvent.press(screen.getByTestId('pause-btn'));
    expect(useInspectionStore.getState().status).toBe('paused');
    expect(mockBack).toHaveBeenCalled();
  });

  it('shows progress step count', () => {
    startFullInspection();
    renderScreen();
    expect(screen.getByText(/Step 1 of/)).toBeTruthy();
  });

  it('inserts swarm_risk after queen_cells when swarm option selected', () => {
    startFullInspection();
    // Advance to queen_cells (index 2): entrance → brood_pattern → queen_cells
    useInspectionStore.getState().addObservation(createObservation({ id: 'obs-entrance' }));
    useInspectionStore.getState().setPromptIndex(1);
    useInspectionStore.getState().addObservation(
      createObservation({
        id: 'obs-brood',
        promptId: 'brood_pattern',
        observationType: 'brood_inspection',
        value: 'solid',
      }),
    );
    useInspectionStore.getState().setPromptIndex(2);

    renderScreen();
    // queen_cells prompt should be visible
    expect(screen.getByText('Queen Cell Check')).toBeTruthy();

    // Select the swarm option
    fireEvent.press(screen.getByTestId('option-swarm'));
    fireEvent.press(screen.getByTestId('next-btn'));

    // The step engine should insert swarm_risk at index 3; prompt index advances to 3
    expect(useInspectionStore.getState().currentPromptIndex).toBe(3);

    // Re-render should show swarm_risk prompt
    const Screen = require('../app/(tabs)/apiaries/[id]/hives/[hiveId]/inspect/step').default;
    const { unmount } = render(<Screen />);
    expect(screen.getAllByText('Swarm Risk Assessment').length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it('navigates to summary when last step is completed', () => {
    startFullInspection();
    // Place index at the last prompt (action_planning, index 6 in 7-step full sequence)
    useInspectionStore.getState().setPromptIndex(6);
    renderScreen();
    // action_planning has no options — use free text
    fireEvent.changeText(screen.getByTestId('observation-input'), 'Feed next week');
    fireEvent.press(screen.getByTestId('next-btn'));
    expect(mockReplace).toHaveBeenCalledWith(
      '/(tabs)/apiaries/apiary-1/hives/hive-1/inspect/summary',
    );
  });
});

// ─── inspect/summary.tsx ──────────────────────────────────────────────────────

describe('InspectionSummaryScreen', () => {
  function setupInspectionWithObservations() {
    useInspectionStore.getState().startInspection({
      inspectionId: 'insp-1',
      hiveId: 'hive-1',
      hiveName: 'Hive 1',
      type: 'full',
    });
    useInspectionStore.getState().addObservation(createObservation({ id: 'obs-1' }));
    useInspectionStore.getState().addObservation(
      createObservation({
        id: 'obs-2',
        promptId: 'brood_pattern',
        observationType: 'brood_inspection',
        value: 'spotty',
        classification: 'cautionary',
      }),
    );
  }

  function renderScreen() {
    const Screen = require('../app/(tabs)/apiaries/[id]/hives/[hiveId]/inspect/summary').default;
    return render(<Screen />);
  }

  it('renders Inspection Complete heading', () => {
    setupInspectionWithObservations();
    renderScreen();
    expect(screen.getByText('Inspection Complete')).toBeTruthy();
  });

  it('shows total observation count', () => {
    setupInspectionWithObservations();
    renderScreen();
    // The "2" observation count heading
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('shows observation type labels', () => {
    setupInspectionWithObservations();
    renderScreen();
    expect(screen.getByText('entrance assessment')).toBeTruthy();
  });

  it('shows cautionary count when cautionary observations exist', () => {
    setupInspectionWithObservations();
    renderScreen();
    // cautionaryCount = 1
    expect(screen.getAllByText('Cautionary').length).toBeGreaterThanOrEqual(1);
  });

  it('shows colony health signal when no urgent observations', () => {
    setupInspectionWithObservations();
    renderScreen();
    expect(screen.getByText(/Nice work/)).toBeTruthy();
  });

  it('hides colony health signal when urgent observations exist', () => {
    useInspectionStore.getState().startInspection({
      inspectionId: 'insp-2',
      hiveId: 'hive-1',
      hiveName: 'Hive 1',
      type: 'full',
    });
    useInspectionStore.getState().addObservation(
      createObservation({
        id: 'obs-urgent',
        value: 'dead_bees',
        classification: 'urgent',
      }),
    );
    renderScreen();
    expect(screen.queryByText(/Nice work/)).toBeNull();
  });

  it('Save button calls completeInspection and navigates to hive detail', async () => {
    setupInspectionWithObservations();
    renderScreen();
    await act(async () => {
      fireEvent.press(screen.getByTestId('save-btn'));
    });
    expect(useInspectionStore.getState().inspectionId).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith(
      '/(tabs)/apiaries/apiary-1/hives/hive-1',
    );
  });
});
