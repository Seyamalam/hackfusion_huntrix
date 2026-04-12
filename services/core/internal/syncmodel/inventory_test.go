package syncmodel

import (
	"testing"
	"time"
)

func TestCausalMergePrefersDescendantClock(t *testing.T) {
	base := NewInventoryItem("inv-1", "ORS Saline", 10, "P1", "A", time.Unix(100, 0))
	fromA := base.ApplyUpdate("A", 12, "P1", time.Unix(200, 0))

	fromB := fromA.Clone()
	fromB.Quantity = 14
	fromB.Priority = "P0"
	fromB.UpdatedAt = time.Unix(300, 0)
	fromB.LastWriter = "B"
	fromB.VectorClock = MergeVectorClock(fromA.VectorClock, VectorClock{"B": 1})

	result := MergeInventory(fromA, fromB)

	if result.ConflictDetected {
		t.Fatal("expected no conflict for causally ordered merge")
	}

	if result.Item.Quantity != 14 || result.Item.Priority != "P0" {
		t.Fatalf("unexpected merged item: %+v", result.Item)
	}
}

func TestConcurrentMergeSurfacesConflict(t *testing.T) {
	base := NewInventoryItem("inv-2", "Water Tablets", 100, "P2", "A", time.Unix(100, 0))

	local := base.ApplyUpdate("A", 120, "P1", time.Unix(200, 0))

	remote := base.Clone()
	remote.Quantity = 80
	remote.Priority = "P3"
	remote.UpdatedAt = time.Unix(220, 0)
	remote.LastWriter = "B"
	remote.VectorClock = VectorClock{"A": 1, "B": 1}

	result := MergeInventory(local, remote)

	if !result.ConflictDetected {
		t.Fatal("expected conflict for concurrent updates")
	}

	if len(result.Item.Conflicts) == 0 {
		t.Fatalf("expected conflict details, got %+v", result.Item)
	}

	if result.Item.VectorClock["A"] != 2 || result.Item.VectorClock["B"] != 1 {
		t.Fatalf("expected merged vector clock, got %+v", result.Item.VectorClock)
	}
}

func TestCompareVectorClock(t *testing.T) {
	left := VectorClock{"A": 2, "B": 1}
	right := VectorClock{"A": 2, "B": 2}
	if got := CompareVectorClock(left, right); got != HappensBefore {
		t.Fatalf("expected HappensBefore, got %s", got)
	}

	concurrentLeft := VectorClock{"A": 2}
	concurrentRight := VectorClock{"B": 2}
	if got := CompareVectorClock(concurrentLeft, concurrentRight); got != Concurrent {
		t.Fatalf("expected Concurrent, got %s", got)
	}
}
