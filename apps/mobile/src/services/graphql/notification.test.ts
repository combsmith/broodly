import {
  NOTIFICATIONS_QUERY,
  MARK_NOTIFICATION_READ_MUTATION,
  UNREAD_COUNT_QUERY,
  UPDATE_NOTIFICATION_PREFERENCES_MUTATION,
} from './notification';

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
  });
});
