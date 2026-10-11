import {
  START_INSPECTION_MUTATION,
  ADD_OBSERVATION_MUTATION,
  PAUSE_INSPECTION_MUTATION,
  RESUME_INSPECTION_MUTATION,
  COMPLETE_INSPECTION_MUTATION,
  GET_MEDIA_UPLOAD_URL_MUTATION,
  REQUEST_IMAGE_ANALYSIS_MUTATION,
  GET_IMAGE_ANALYSIS_RESULT_QUERY,
  GET_ACOUSTIC_ANALYSIS_RESULT_QUERY,
  HIVE_INSPECTION_CONTEXT_QUERY,
} from './inspection';

describe('inspection GraphQL documents', () => {
  describe('START_INSPECTION_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(START_INSPECTION_MUTATION).toBeDefined();
      expect(START_INSPECTION_MUTATION.kind).toBe('Document');
    });

    it('contains the StartInspection operation', () => {
      const def = START_INSPECTION_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('StartInspection');
      }
    });
  });

  describe('ADD_OBSERVATION_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(ADD_OBSERVATION_MUTATION).toBeDefined();
      expect(ADD_OBSERVATION_MUTATION.kind).toBe('Document');
    });

    it('contains the AddObservation operation', () => {
      const def = ADD_OBSERVATION_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('AddObservation');
      }
    });
  });

  describe('PAUSE_INSPECTION_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(PAUSE_INSPECTION_MUTATION).toBeDefined();
      expect(PAUSE_INSPECTION_MUTATION.kind).toBe('Document');
    });

    it('contains the PauseInspection operation', () => {
      const def = PAUSE_INSPECTION_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('PauseInspection');
      }
    });
  });

  describe('RESUME_INSPECTION_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(RESUME_INSPECTION_MUTATION).toBeDefined();
      expect(RESUME_INSPECTION_MUTATION.kind).toBe('Document');
    });

    it('contains the ResumeInspection operation', () => {
      const def = RESUME_INSPECTION_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('ResumeInspection');
      }
    });
  });

  describe('COMPLETE_INSPECTION_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(COMPLETE_INSPECTION_MUTATION).toBeDefined();
      expect(COMPLETE_INSPECTION_MUTATION.kind).toBe('Document');
    });

    it('contains the CompleteInspection operation', () => {
      const def = COMPLETE_INSPECTION_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('CompleteInspection');
      }
    });
  });

  describe('GET_MEDIA_UPLOAD_URL_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(GET_MEDIA_UPLOAD_URL_MUTATION).toBeDefined();
      expect(GET_MEDIA_UPLOAD_URL_MUTATION.kind).toBe('Document');
    });

    it('contains the GetMediaUploadUrl operation', () => {
      const def = GET_MEDIA_UPLOAD_URL_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('GetMediaUploadUrl');
      }
    });
  });

  describe('REQUEST_IMAGE_ANALYSIS_MUTATION', () => {
    it('is a valid GraphQL document', () => {
      expect(REQUEST_IMAGE_ANALYSIS_MUTATION).toBeDefined();
      expect(REQUEST_IMAGE_ANALYSIS_MUTATION.kind).toBe('Document');
    });

    it('contains the RequestImageAnalysis operation', () => {
      const def = REQUEST_IMAGE_ANALYSIS_MUTATION.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('mutation');
        expect(def.name?.value).toBe('RequestImageAnalysis');
      }
    });
  });

  describe('GET_IMAGE_ANALYSIS_RESULT_QUERY', () => {
    it('is a valid GraphQL document', () => {
      expect(GET_IMAGE_ANALYSIS_RESULT_QUERY).toBeDefined();
      expect(GET_IMAGE_ANALYSIS_RESULT_QUERY.kind).toBe('Document');
    });

    it('contains the GetImageAnalysisResult operation', () => {
      const def = GET_IMAGE_ANALYSIS_RESULT_QUERY.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('query');
        expect(def.name?.value).toBe('GetImageAnalysisResult');
      }
    });
  });

  describe('GET_ACOUSTIC_ANALYSIS_RESULT_QUERY', () => {
    it('is a valid GraphQL document', () => {
      expect(GET_ACOUSTIC_ANALYSIS_RESULT_QUERY).toBeDefined();
      expect(GET_ACOUSTIC_ANALYSIS_RESULT_QUERY.kind).toBe('Document');
    });

    it('contains the GetAcousticAnalysisResult operation', () => {
      const def = GET_ACOUSTIC_ANALYSIS_RESULT_QUERY.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('query');
        expect(def.name?.value).toBe('GetAcousticAnalysisResult');
      }
    });
  });

  describe('HIVE_INSPECTION_CONTEXT_QUERY', () => {
    it('is a valid GraphQL document', () => {
      expect(HIVE_INSPECTION_CONTEXT_QUERY).toBeDefined();
      expect(HIVE_INSPECTION_CONTEXT_QUERY.kind).toBe('Document');
    });

    it('contains the HiveInspectionContext operation', () => {
      const def = HIVE_INSPECTION_CONTEXT_QUERY.definitions[0];
      expect(def.kind).toBe('OperationDefinition');
      if (def.kind === 'OperationDefinition') {
        expect(def.operation).toBe('query');
        expect(def.name?.value).toBe('HiveInspectionContext');
      }
    });
  });
});
