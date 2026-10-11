import {
  NOTIFICATIONS_QUERY,
  MARK_NOTIFICATION_READ_MUTATION,
  UNREAD_COUNT_QUERY,
  UPDATE_NOTIFICATION_PREFERENCES_MUTATION,
} from '../src/services/graphql/notification';

describe('notification GraphQL documents', () => {
  describe('NOTIFICATIONS_QUERY', () => {
    it('is a valid GraphQL document', () => {
      expect(NOTIFICATIONS_QUERY).toBeDefined();
      expect(NOTIFICATIONS_QUERY.kind).toBe('Document');
    });

    it('contains the Notifications operation', () => {
      const def = NOTIFICATIONS_QUERY.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('query');
        expect(def.name?.value).toBe('Notifications');
      }
    });

    it('accepts optional limit parameter', () => {
      const def = NOTIFICATIONS_QUERY.definitions[0];
      if (def.kind === 'OperationDefinition' && def.variableDefinitions) {
        const limitVar = def.variableDefinitions.find((v) => v.variable.name.value === 'limit');
        expect(limitVar).toBeDefined();
      }
    });

    it('queries all required notification fields', () => {
      expect(NOTIFICATIONS_QUERY.loc?.source.body).toContain('id');
      expect(NOTIFICATIONS_QUERY.loc?.source.body).toContain('title');
      expect(NOTIFICATIONS_QUERY.loc?.source.body).toContain('body');
      expect(NOTIFICATIONS_QUERY.loc?.source.body).toContain('nextStep');
      expect(NOTIFICATIONS_QUERY.loc?.source.body).toContain('isRead');
    });
  });

  describe('MARK_NOTIFICATION_READ_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(MARK_NOTIFICATION_READ_MUTATION).toBeDefined();
      expect(MARK_NOTIFICATION_READ_MUTATION.kind).toBe('Document');
    });

    it('contains the MarkNotificationRead operation', () => {
      const def = MARK_NOTIFICATION_READ_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('MarkNotificationRead');
      }
    });

    it('requires notification id parameter', () => {
      const def = MARK_NOTIFICATION_READ_MUTATION.definitions[0];
      if (def.kind === 'OperationDefinition' && def.variableDefinitions) {
        const idVar = def.variableDefinitions.find((v) => v.variable.name.value === 'id');
        expect(idVar).toBeDefined();
      }
    });
  });

  describe('UNREAD_COUNT_QUERY', () => {
    it('is a valid GraphQL document', () => {
      expect(UNREAD_COUNT_QUERY).toBeDefined();
      expect(UNREAD_COUNT_QUERY.kind).toBe('Document');
    });

    it('contains the UnreadNotificationCount operation', () => {
      const def = UNREAD_COUNT_QUERY.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('query');
        expect(def.name?.value).toBe('UnreadNotificationCount');
      }
    });

    it('queries unreadNotificationCount field', () => {
      expect(UNREAD_COUNT_QUERY.loc?.source.body).toContain('unreadNotificationCount');
    });
  });

  describe('UPDATE_NOTIFICATION_PREFERENCES_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(UPDATE_NOTIFICATION_PREFERENCES_MUTATION).toBeDefined();
      expect(UPDATE_NOTIFICATION_PREFERENCES_MUTATION.kind).toBe('Document');
    });

    it('contains the UpdateNotificationPreferences operation', () => {
      const def = UPDATE_NOTIFICATION_PREFERENCES_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('UpdateNotificationPreferences');
      }
    });

    it('requires notification preferences input parameter', () => {
      const def = UPDATE_NOTIFICATION_PREFERENCES_MUTATION.definitions[0];
      if (def.kind === 'OperationDefinition' && def.variableDefinitions) {
        const inputVar = def.variableDefinitions.find((v) => v.variable.name.value === 'input');
        expect(inputVar).toBeDefined();
      }
    });

    it('returns all preference fields in response', () => {
      expect(UPDATE_NOTIFICATION_PREFERENCES_MUTATION.loc?.source.body).toContain('enabled');
      expect(UPDATE_NOTIFICATION_PREFERENCES_MUTATION.loc?.source.body).toContain('quietHoursStart');
      expect(UPDATE_NOTIFICATION_PREFERENCES_MUTATION.loc?.source.body).toContain('quietHoursEnd');
    });
  });
});
