import { gql } from 'urql';

export const NOTIFICATIONS_QUERY = gql`
  query Notifications($limit: Int) {
    notifications(limit: $limit) {
      id
      title
      body
      nextStep
      deepLink
      priority
      category
      isRead
      createdAt
    }
  }
`;

export const MARK_NOTIFICATION_READ_MUTATION = gql`
  mutation MarkNotificationRead($id: UUID!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`;

export const UNREAD_COUNT_QUERY = gql`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`;

export const UPDATE_NOTIFICATION_PREFERENCES_MUTATION = gql`
  mutation UpdateNotificationPreferences($input: NotificationPreferencesInput!) {
    updateNotificationPreferences(input: $input) {
      enabled
      quietHoursStart
      quietHoursEnd
      escalationEnabled
    }
  }
`;
