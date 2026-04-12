package syncmodel

import (
	"sort"
	"time"
)

type InventoryRecord struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Quantity    int               `json:"quantity"`
	Priority    string            `json:"priority"`
	UpdatedAt   string            `json:"updated_at"`
	LastWriter  string            `json:"last_writer"`
	VectorClock map[string]uint64 `json:"vector_clock"`
}

type SyncHandshake struct {
	ReplicaID   string            `json:"replica_id"`
	KnownClock  map[string]uint64 `json:"known_clock"`
	LastSyncAt  string            `json:"last_sync_at"`
	DeviceLabel string            `json:"device_label"`
}

type SyncDeltaBundle struct {
	BundleID      string            `json:"bundle_id"`
	SourceReplica string            `json:"source_replica"`
	TargetReplica string            `json:"target_replica"`
	BaseClock     map[string]uint64 `json:"base_clock"`
	Records       []InventoryRecord `json:"records"`
	CreatedAt     string            `json:"created_at"`
}

type SyncSessionResult struct {
	Merged        []InventoryItem `json:"merged"`
	Conflicts     []InventoryItem `json:"conflicts"`
	MergedCount   int             `json:"merged_count"`
	ConflictCount int             `json:"conflict_count"`
	BytesEstimate int             `json:"bytes_estimate"`
}

func BuildHandshake(replicaID, deviceLabel string, knownClock VectorClock, now time.Time) SyncHandshake {
	return SyncHandshake{
		ReplicaID:   replicaID,
		KnownClock:  knownClock.Clone(),
		LastSyncAt:  now.UTC().Format(time.RFC3339),
		DeviceLabel: deviceLabel,
	}
}

func BuildDeltaBundle(bundleID, sourceReplica, targetReplica string, baseClock VectorClock, items []InventoryItem, now time.Time) SyncDeltaBundle {
	records := make([]InventoryRecord, 0, len(items))
	for _, item := range items {
		records = append(records, toRecord(item))
	}

	return SyncDeltaBundle{
		BundleID:      bundleID,
		SourceReplica: sourceReplica,
		TargetReplica: targetReplica,
		BaseClock:     baseClock.Clone(),
		Records:       records,
		CreatedAt:     now.UTC().Format(time.RFC3339),
	}
}

func FilterDeltaSince(items []InventoryItem, knownClock VectorClock) []InventoryItem {
	filtered := make([]InventoryItem, 0, len(items))
	for _, item := range items {
		if CompareVectorClock(knownClock, item.VectorClock) == HappensBefore || CompareVectorClock(knownClock, item.VectorClock) == Concurrent {
			filtered = append(filtered, item.Clone())
		}
	}
	return filtered
}

func ApplyDeltaBundle(localItems []InventoryItem, bundle SyncDeltaBundle) SyncSessionResult {
	index := make(map[string]InventoryItem, len(localItems))
	for _, item := range localItems {
		index[item.ID] = item.Clone()
	}

	result := SyncSessionResult{
		Merged:    []InventoryItem{},
		Conflicts: []InventoryItem{},
	}

	for _, record := range bundle.Records {
		remote := fromRecord(record)
		local, exists := index[record.ID]
		if !exists {
			index[record.ID] = remote
			result.Merged = append(result.Merged, remote)
			continue
		}

		merge := MergeInventory(local, remote)
		index[record.ID] = merge.Item
		if merge.ConflictDetected {
			result.Conflicts = append(result.Conflicts, merge.Item)
		} else {
			result.Merged = append(result.Merged, merge.Item)
		}
	}

	result.MergedCount = len(result.Merged)
	result.ConflictCount = len(result.Conflicts)
	result.BytesEstimate = estimateBundleBytes(bundle)
	return result
}

func toRecord(item InventoryItem) InventoryRecord {
	return InventoryRecord{
		ID:          item.ID,
		Name:        item.Name,
		Quantity:    item.Quantity,
		Priority:    item.Priority,
		UpdatedAt:   item.UpdatedAt.UTC().Format(time.RFC3339),
		LastWriter:  item.LastWriter,
		VectorClock: item.VectorClock.Clone(),
	}
}

func fromRecord(record InventoryRecord) InventoryItem {
	updatedAt, _ := time.Parse(time.RFC3339, record.UpdatedAt)
	return InventoryItem{
		ID:          record.ID,
		Name:        record.Name,
		Quantity:    record.Quantity,
		Priority:    record.Priority,
		UpdatedAt:   updatedAt.UTC(),
		LastWriter:  record.LastWriter,
		VectorClock: VectorClock(record.VectorClock).Clone(),
		Conflicts:   []Conflict{},
	}
}

func estimateBundleBytes(bundle SyncDeltaBundle) int {
	total := len(bundle.BundleID) + len(bundle.SourceReplica) + len(bundle.TargetReplica) + len(bundle.CreatedAt)
	for replicaID := range bundle.BaseClock {
		total += len(replicaID) + 8
	}
	for _, record := range bundle.Records {
		total += len(record.ID) + len(record.Name) + len(record.Priority) + len(record.UpdatedAt) + len(record.LastWriter) + 8
		for replicaID := range record.VectorClock {
			total += len(replicaID) + 8
		}
	}
	return total
}

func SortItemsByID(items []InventoryItem) {
	sort.Slice(items, func(left, right int) bool {
		return items[left].ID < items[right].ID
	})
}
