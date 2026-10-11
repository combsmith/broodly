import { gql } from 'urql';

export const WEEKLY_QUEUE_QUERY = gql`
  query WeeklyQueue {
    tasks(status: PENDING, limit: 50) {
      id
      title
      hive {
        id
        name
        apiary {
          id
          name
        }
      }
      priority
      dueDate
      status
      isOverdue
      catchUpGuidance
    }
  }
`;

export const COMPLETE_TASK_MUTATION = gql`
  mutation CompleteTask($id: UUID!) {
    completeTask(id: $id) {
      id
      status
      completedAt
    }
  }
`;

export const DEFER_TASK_MUTATION = gql`
  mutation DeferTask($id: UUID!, $input: DeferTaskInput) {
    deferTask(id: $id, input: $input) {
      id
      status
      dueDate
    }
  }
`;

// NOTE: seasonalCalendar is not yet implemented in the backend schema.
// This query is scaffolding for Story 10.5 and will fail validation until
// the backend adds the seasonalCalendar field to the Query type.
export const SEASONAL_CALENDAR_QUERY = gql`
  query SeasonalCalendar($region: String!) {
    seasonalCalendar(region: $region) {
      months {
        month
        year
        activities {
          title
          category
          urgency
        }
        riskWindows {
          type
          severity
        }
      }
    }
  }
`;
