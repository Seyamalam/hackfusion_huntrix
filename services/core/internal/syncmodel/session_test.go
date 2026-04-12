package syncmodel

import (
	"testing"
	"time"
)

func TestFilterDeltaSince(t *testing.T) {
	base := NewInventoryItem("inv-1", "ORS", 10, "P1", "A", time.Unix(100, 0))
	next := base.ApplyUpdate("A", 12, "P1", time.Unix(200, 0))
	other := NewInventoryItem("inv-2", "Water", 50, "P2", "B", time.Unix(150, 0))

	filtered := FilterDeltaSince([]InventoryItem{next, other}, VectorClock{"A": 1})
	if len(filtered) != 2 {
		t.Fatalf("expected 2 records, got %d", len(filtered))
	}
}

func TestApplyDeltaBundleDetectsConflict(t *testing.T) {
	local := NewInventoryItem("inv-1", "ORS", 100, "P1", "A", time.Unix(100, 0)).ApplyUpdate("A", 120, "P0", time.Unix(200, 0))
	remote := NewInventoryItem("inv-1", "ORS", 100, "P1", "B", time.Unix(100, 0)).ApplyUpdate("B", 70, "P3", time.Unix(210, 0))

	bundle := BuildDeltaBundle(
		"bundle-1",
		"B",
		"A",
		VectorClock{"A": 1},
		[]InventoryItem{remote},
		time.Unix(220, 0),
	)

	result := ApplyDeltaBundle([]InventoryItem{local}, bundle)
	if result.ConflictCount != 1 {
		t.Fatalf("expected 1 conflict, got %d", result.ConflictCount)
	}

	if result.BytesEstimate == 0 {
		t.Fatal("expected non-zero bundle size estimate")
	}
}
