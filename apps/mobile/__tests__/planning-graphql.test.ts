import {
  WEEKLY_QUEUE_QUERY,
  COMPLETE_TASK_MUTATION,
  DEFER_TASK_MUTATION,
  SEASONAL_CALENDAR_QUERY,
} from '../src/services/graphql/planning';

describe('planning GraphQL documents', () => {
  describe('WEEKLY_QUEUE_QUERY', () => {
    it('is a valid GraphQL document', () => {
      expect(WEEKLY_QUEUE_QUERY).toBeDefined();
      expect(WEEKLY_QUEUE_QUERY.kind).toBe('Document');
    });

    it('contains the WeeklyQueue operation', () => {
      const def = WEEKLY_QUEUE_QUERY.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('query');
        expect(def.name?.value).toBe('WeeklyQueue');
      }
    });
  });

  describe('COMPLETE_TASK_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(COMPLETE_TASK_MUTATION).toBeDefined();
      expect(COMPLETE_TASK_MUTATION.kind).toBe('Document');
    });

    it('contains the CompleteTask operation', () => {
      const def = COMPLETE_TASK_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('CompleteTask');
      }
    });
  });

  describe('DEFER_TASK_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(DEFER_TASK_MUTATION).toBeDefined();
      expect(DEFER_TASK_MUTATION.kind).toBe('Document');
    });

    it('contains the DeferTask operation', () => {
      const def = DEFER_TASK_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('DeferTask');
      }
    });
  });

  describe('SEASONAL_CALENDAR_QUERY', () => {
    it('is a valid GraphQL document', () => {
      expect(SEASONAL_CALENDAR_QUERY).toBeDefined();
      expect(SEASONAL_CALENDAR_QUERY.kind).toBe('Document');
    });

    it('contains the SeasonalCalendar operation', () => {
      const def = SEASONAL_CALENDAR_QUERY.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('query');
        expect(def.name?.value).toBe('SeasonalCalendar');
      }
    });
  });
});
