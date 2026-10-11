package worker

import (
	"context"
	"testing"
	"time"
)

func TestDefaultSignedURLConfig(t *testing.T) {
	cfg := DefaultSignedURLConfig("dev")
	if cfg.BucketName != "broodly-media-dev" {
		t.Errorf("expected broodly-media-dev, got %s", cfg.BucketName)
	}
	if cfg.Expiry != 15*time.Minute {
		t.Errorf("expected 15m expiry, got %v", cfg.Expiry)
	}
}

func TestSTTWorker(t *testing.T) {
	w := NewSTTWorker()

	t.Run("processes audio events", func(t *testing.T) {
		event := UploadEvent{
			StoragePath: "gs://bucket/audio.opus",
			MediaType:   MediaTypeAudio,
		}
		result, err := w.Process(context.Background(), event)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.OriginalAudioURI != event.StoragePath {
			t.Error("expected original audio URI preserved")
		}
	})

	t.Run("rejects non-audio events", func(t *testing.T) {
		event := UploadEvent{MediaType: MediaTypeImage}
		_, err := w.Process(context.Background(), event)
		if err == nil {
			t.Error("expected error for image event")
		}
	})

	t.Run("flags low confidence for review", func(t *testing.T) {
		if !w.ShouldFlagForReview(0.85) {
			t.Error("expected 0.85 flagged for review (threshold 0.9)")
		}
		if w.ShouldFlagForReview(0.95) {
			t.Error("expected 0.95 not flagged for review")
		}
	})
}

func TestVisionWorker(t *testing.T) {
	w := NewVisionWorker()

	t.Run("processes image events", func(t *testing.T) {
		event := UploadEvent{
			StoragePath: "gs://bucket/photo.webp",
			MediaType:   MediaTypeImage,
		}
		result, err := w.Analyze(context.Background(), event)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected result")
		}
	})

	t.Run("rejects non-image events", func(t *testing.T) {
		event := UploadEvent{MediaType: MediaTypeAudio}
		_, err := w.Analyze(context.Background(), event)
		if err == nil {
			t.Error("expected error for audio event")
		}
	})

	t.Run("marks low confidence as inconclusive", func(t *testing.T) {
		if !w.IsInconclusive(0.5) {
			t.Error("expected 0.5 to be inconclusive")
		}
		if w.IsInconclusive(0.8) {
			t.Error("expected 0.8 not to be inconclusive")
		}
	})
}

func TestAcousticWorker(t *testing.T) {
	w := NewAcousticWorker()

	t.Run("processes audio events", func(t *testing.T) {
		event := UploadEvent{
			StoragePath: "gs://bucket/hive-sound.opus",
			MediaType:   MediaTypeAudio,
		}
		result, err := w.Analyze(context.Background(), event)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result == nil {
			t.Fatal("expected result")
		}
	})

	t.Run("rejects non-audio events", func(t *testing.T) {
		event := UploadEvent{MediaType: MediaTypeImage}
		_, err := w.Analyze(context.Background(), event)
		if err == nil {
			t.Error("expected error for image event")
		}
	})
}

func TestEmbeddingWorker(t *testing.T) {
	w := NewEmbeddingWorker()

	t.Run("generates embedding with correct dimension", func(t *testing.T) {
		result, err := w.Generate(context.Background(), "text", "obs-1", "queen cells observed")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.Dimension != 768 {
			t.Errorf("expected dimension 768, got %d", result.Dimension)
		}
		if len(result.Vector) != 768 {
			t.Errorf("expected vector length 768, got %d", len(result.Vector))
		}
	})

	t.Run("rejects empty content", func(t *testing.T) {
		_, err := w.Generate(context.Background(), "text", "obs-1", "")
		if err == nil {
			t.Error("expected error for empty content")
		}
	})

	t.Run("preserves source metadata", func(t *testing.T) {
		result, err := w.Generate(context.Background(), "image", "img-1", "brood frame")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.SourceType != "image" {
			t.Errorf("expected image source type, got %s", result.SourceType)
		}
		if result.SourceID != "img-1" {
			t.Errorf("expected img-1 source ID, got %s", result.SourceID)
		}
	})
}
