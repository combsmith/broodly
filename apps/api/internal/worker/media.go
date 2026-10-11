package worker

import (
	"context"
	"fmt"
	"time"
)

// MediaType categorizes uploaded media for routing to the correct worker.
type MediaType string

const (
	MediaTypeAudio MediaType = "audio"
	MediaTypeImage MediaType = "image"
)

// UploadEvent represents a Cloud Storage notification for a new upload.
type UploadEvent struct {
	StoragePath  string    `json:"storagePath"`
	ContentType  string    `json:"contentType"`
	MediaType    MediaType `json:"mediaType"`
	InspectionID string    `json:"inspectionId"`
	ObservationID string   `json:"observationId"`
	UploadedAt   time.Time `json:"uploadedAt"`
}

// TranscriptionResult holds the output of speech-to-text processing.
type TranscriptionResult struct {
	Text            string  `json:"text"`
	Confidence      float64 `json:"confidence"`
	NeedsReview     bool    `json:"needsReview"`
	OriginalAudioURI string `json:"originalAudioUri"`
	ProcessedAt     time.Time `json:"processedAt"`
}

// ImageAnalysisFinding is a single finding from Vision AI analysis.
type ImageAnalysisFinding struct {
	Category       string  `json:"category"`
	Finding        string  `json:"finding"`
	Interpretation string  `json:"interpretation"`
	Confidence     float64 `json:"confidence"`
}

// ImageAnalysisResult holds the output of Vision AI analysis.
type ImageAnalysisResult struct {
	Findings          []ImageAnalysisFinding `json:"findings"`
	OverallConfidence float64                `json:"overallConfidence"`
	IsInconclusive    bool                   `json:"isInconclusive"`
	ProcessedAt       time.Time              `json:"processedAt"`
}

// AcousticAnalysisResult holds the output of acoustic analysis.
type AcousticAnalysisResult struct {
	QueenrightConfidence float64 `json:"queenrightConfidence"`
	AgitationLevel       string  `json:"agitationLevel"`
	SwarmReadiness       string  `json:"swarmReadiness"`
	ProcessedAt          time.Time `json:"processedAt"`
}

// EmbeddingResult holds a generated vector embedding.
type EmbeddingResult struct {
	Vector      []float32 `json:"vector"`
	Dimension   int       `json:"dimension"`
	SourceType  string    `json:"sourceType"`
	SourceID    string    `json:"sourceId"`
	GeneratedAt time.Time `json:"generatedAt"`
}

// SignedURLConfig holds configuration for generating signed upload URLs.
type SignedURLConfig struct {
	BucketName string
	Expiry     time.Duration
}

// DefaultSignedURLConfig returns the default signed URL configuration.
func DefaultSignedURLConfig(env string) SignedURLConfig {
	return SignedURLConfig{
		BucketName: fmt.Sprintf("broodly-media-%s", env),
		Expiry:     15 * time.Minute,
	}
}

// STTWorker processes audio files for speech-to-text transcription.
type STTWorker struct {
	minConfidence float64
}

// NewSTTWorker creates a new speech-to-text worker.
func NewSTTWorker() *STTWorker {
	return &STTWorker{
		minConfidence: 0.9,
	}
}

// Process transcribes an audio file. In production, calls Gemini STT API.
func (w *STTWorker) Process(_ context.Context, event UploadEvent) (*TranscriptionResult, error) {
	if event.MediaType != MediaTypeAudio {
		return nil, fmt.Errorf("expected audio media type, got %s", event.MediaType)
	}

	// In production: call Vertex AI Gemini STT API with beekeeping vocabulary hints.
	// Stub uses minConfidence as a placeholder; NeedsReview is derived from the threshold.
	confidence := w.minConfidence
	return &TranscriptionResult{
		Text:             "",
		Confidence:       confidence,
		NeedsReview:      w.ShouldFlagForReview(confidence),
		OriginalAudioURI: event.StoragePath,
		ProcessedAt:      time.Now(),
	}, nil
}

// ShouldFlagForReview determines if a transcription needs human review.
func (w *STTWorker) ShouldFlagForReview(confidence float64) bool {
	return confidence < w.minConfidence
}

// VisionWorker processes images for AI analysis.
type VisionWorker struct {
	minConfidence float64
}

// NewVisionWorker creates a new Vision AI analysis worker.
func NewVisionWorker() *VisionWorker {
	return &VisionWorker{
		minConfidence: 0.7,
	}
}

// Analyze processes an image for inspection findings. In production, calls Gemini Vision API.
func (w *VisionWorker) Analyze(_ context.Context, event UploadEvent) (*ImageAnalysisResult, error) {
	if event.MediaType != MediaTypeImage {
		return nil, fmt.Errorf("expected image media type, got %s", event.MediaType)
	}

	// In production: call Vertex AI Gemini Vision with inspection-specific prompt.
	// Stub uses 1.0 as a placeholder confidence; IsInconclusive is derived from the threshold.
	overallConfidence := 1.0
	return &ImageAnalysisResult{
		Findings:          nil,
		OverallConfidence: overallConfidence,
		IsInconclusive:    w.IsInconclusive(overallConfidence),
		ProcessedAt:       time.Now(),
	}, nil
}

// IsInconclusive determines if analysis results are below the confidence threshold.
func (w *VisionWorker) IsInconclusive(confidence float64) bool {
	return confidence < w.minConfidence
}

// AcousticWorker processes hive audio for colony-state analysis.
type AcousticWorker struct{}

// NewAcousticWorker creates a new acoustic analysis worker.
func NewAcousticWorker() *AcousticWorker {
	return &AcousticWorker{}
}

// Analyze processes a hive audio recording. In production, calls Vertex AI.
func (w *AcousticWorker) Analyze(_ context.Context, event UploadEvent) (*AcousticAnalysisResult, error) {
	if event.MediaType != MediaTypeAudio {
		return nil, fmt.Errorf("expected audio media type, got %s", event.MediaType)
	}

	// In production: call Vertex AI with acoustic analysis model
	return &AcousticAnalysisResult{
		QueenrightConfidence: 0.0,
		AgitationLevel:       "unknown",
		SwarmReadiness:       "unknown",
		ProcessedAt:          time.Now(),
	}, nil
}

// EmbeddingWorker generates vector embeddings for semantic search.
type EmbeddingWorker struct {
	dimension int
}

// NewEmbeddingWorker creates a new embedding generation worker.
func NewEmbeddingWorker() *EmbeddingWorker {
	return &EmbeddingWorker{
		dimension: 768, // Vertex AI Embedding 2.0 output dimension
	}
}

// Generate creates an embedding for the given content. In production, calls Vertex AI Embedding API.
func (w *EmbeddingWorker) Generate(_ context.Context, sourceType, sourceID, content string) (*EmbeddingResult, error) {
	if content == "" {
		return nil, fmt.Errorf("content cannot be empty")
	}

	// In production: call Vertex AI Embedding 2.0 (multimodal)
	return &EmbeddingResult{
		Vector:      make([]float32, w.dimension),
		Dimension:   w.dimension,
		SourceType:  sourceType,
		SourceID:    sourceID,
		GeneratedAt: time.Now(),
	}, nil
}
