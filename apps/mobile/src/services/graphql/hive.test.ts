import {
  HIVES_QUERY,
  HIVE_QUERY,
  CREATE_HIVE_MUTATION,
  UPDATE_HIVE_MUTATION,
  DELETE_HIVE_MUTATION,
} from './hive';

describe('Hive GraphQL Operations', () => {
  it('exports HIVES_QUERY', () => {
    expect(HIVES_QUERY).toBeDefined();
    expect(typeof HIVES_QUERY).toBe('object');
  });

  it('exports HIVE_QUERY', () => {
    expect(HIVE_QUERY).toBeDefined();
    expect(typeof HIVE_QUERY).toBe('object');
  });

  it('exports CREATE_HIVE_MUTATION', () => {
    expect(CREATE_HIVE_MUTATION).toBeDefined();
    expect(typeof CREATE_HIVE_MUTATION).toBe('object');
  });

  it('exports UPDATE_HIVE_MUTATION', () => {
    expect(UPDATE_HIVE_MUTATION).toBeDefined();
    expect(typeof UPDATE_HIVE_MUTATION).toBe('object');
  });

  it('exports DELETE_HIVE_MUTATION', () => {
    expect(DELETE_HIVE_MUTATION).toBeDefined();
    expect(typeof DELETE_HIVE_MUTATION).toBe('object');
  });

  it('HIVES_QUERY accepts apiaryId parameter', () => {
    const queryStr = HIVES_QUERY.loc?.source.body || '';
    expect(queryStr).toContain('$apiaryId');
  });

  it('HIVE_QUERY accepts id parameter', () => {
    const queryStr = HIVE_QUERY.loc?.source.body || '';
    expect(queryStr).toContain('$id');
  });

  it('CREATE_HIVE_MUTATION accepts input parameter', () => {
    const mutationStr = CREATE_HIVE_MUTATION.loc?.source.body || '';
    expect(mutationStr).toContain('CreateHiveInput');
  });

  it('UPDATE_HIVE_MUTATION accepts id and input parameters', () => {
    const mutationStr = UPDATE_HIVE_MUTATION.loc?.source.body || '';
    expect(mutationStr).toContain('$id');
    expect(mutationStr).toContain('UpdateHiveInput');
  });

  it('DELETE_HIVE_MUTATION accepts id parameter', () => {
    const mutationStr = DELETE_HIVE_MUTATION.loc?.source.body || '';
    expect(mutationStr).toContain('$id');
  });

  it('HIVES_QUERY queries hive fields', () => {
    const queryStr = HIVES_QUERY.loc?.source.body || '';
    expect(queryStr).toContain('name');
    expect(queryStr).toContain('status');
  });
});
