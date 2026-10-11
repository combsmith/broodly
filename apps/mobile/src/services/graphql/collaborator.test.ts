import {
  COLLABORATORS_QUERY,
  INVITE_COLLABORATOR_MUTATION,
  REVOKE_COLLABORATOR_MUTATION,
  ACCESS_AUDIT_LOG_QUERY,
} from './collaborator';

describe('Collaborator GraphQL Operations', () => {
  it('exports COLLABORATORS_QUERY', () => {
    expect(COLLABORATORS_QUERY).toBeDefined();
    expect(typeof COLLABORATORS_QUERY).toBe('object');
  });

  it('exports INVITE_COLLABORATOR_MUTATION', () => {
    expect(INVITE_COLLABORATOR_MUTATION).toBeDefined();
    expect(typeof INVITE_COLLABORATOR_MUTATION).toBe('object');
  });

  it('exports REVOKE_COLLABORATOR_MUTATION', () => {
    expect(REVOKE_COLLABORATOR_MUTATION).toBeDefined();
    expect(typeof REVOKE_COLLABORATOR_MUTATION).toBe('object');
  });

  it('exports ACCESS_AUDIT_LOG_QUERY', () => {
    expect(ACCESS_AUDIT_LOG_QUERY).toBeDefined();
    expect(typeof ACCESS_AUDIT_LOG_QUERY).toBe('object');
  });

  it('COLLABORATORS_QUERY queries collaborator fields', () => {
    const queryStr = COLLABORATORS_QUERY.loc?.source.body || '';
    expect(queryStr).toContain('collaborators');
    expect(queryStr).toContain('email');
    expect(queryStr).toContain('status');
  });

  it('INVITE_COLLABORATOR_MUTATION accepts email parameter', () => {
    const mutationStr = INVITE_COLLABORATOR_MUTATION.loc?.source.body || '';
    expect(mutationStr).toContain('$email');
  });

  it('REVOKE_COLLABORATOR_MUTATION accepts collaboratorId parameter', () => {
    const mutationStr = REVOKE_COLLABORATOR_MUTATION.loc?.source.body || '';
    expect(mutationStr).toContain('$collaboratorId');
  });

  it('ACCESS_AUDIT_LOG_QUERY queries audit log fields', () => {
    const queryStr = ACCESS_AUDIT_LOG_QUERY.loc?.source.body || '';
    expect(queryStr).toContain('accessAuditLog');
    expect(queryStr).toContain('eventType');
  });
});
