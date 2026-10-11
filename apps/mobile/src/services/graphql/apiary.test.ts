import {
  APIARIES_QUERY,
  APIARY_QUERY,
  CREATE_APIARY_MUTATION,
  UPDATE_APIARY_MUTATION,
  DELETE_APIARY_MUTATION,
} from './apiary';

describe('Apiary GraphQL Operations', () => {
  it('exports APIARIES_QUERY', () => {
    expect(APIARIES_QUERY).toBeDefined();
    expect(typeof APIARIES_QUERY).toBe('object');
  });

  it('exports APIARY_QUERY', () => {
    expect(APIARY_QUERY).toBeDefined();
    expect(typeof APIARY_QUERY).toBe('object');
  });

  it('exports CREATE_APIARY_MUTATION', () => {
    expect(CREATE_APIARY_MUTATION).toBeDefined();
    expect(typeof CREATE_APIARY_MUTATION).toBe('object');
  });

  it('exports UPDATE_APIARY_MUTATION', () => {
    expect(UPDATE_APIARY_MUTATION).toBeDefined();
    expect(typeof UPDATE_APIARY_MUTATION).toBe('object');
  });

  it('exports DELETE_APIARY_MUTATION', () => {
    expect(DELETE_APIARY_MUTATION).toBeDefined();
    expect(typeof DELETE_APIARY_MUTATION).toBe('object');
  });

  it('APIARIES_QUERY contains apiaries field', () => {
    const queryStr = APIARIES_QUERY.loc?.source.body || '';
    expect(queryStr).toContain('apiaries');
  });

  it('APIARY_QUERY accepts id parameter', () => {
    const queryStr = APIARY_QUERY.loc?.source.body || '';
    expect(queryStr).toContain('$id');
  });

  it('CREATE_APIARY_MUTATION accepts input parameter', () => {
    const mutationStr = CREATE_APIARY_MUTATION.loc?.source.body || '';
    expect(mutationStr).toContain('CreateApiaryInput');
  });

  it('UPDATE_APIARY_MUTATION accepts id and input parameters', () => {
    const mutationStr = UPDATE_APIARY_MUTATION.loc?.source.body || '';
    expect(mutationStr).toContain('$id');
    expect(mutationStr).toContain('UpdateApiaryInput');
  });

  it('DELETE_APIARY_MUTATION accepts id parameter', () => {
    const mutationStr = DELETE_APIARY_MUTATION.loc?.source.body || '';
    expect(mutationStr).toContain('$id');
  });
});
