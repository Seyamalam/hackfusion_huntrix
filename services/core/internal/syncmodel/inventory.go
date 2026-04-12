package syncmodel

import (
	"fmt"
	"sort"
	"time"
)

type VectorClock map[string]uint64

type VersionedValue struct {
	ReplicaID string
	Value     string
}

type Conflict struct {
	Field         string
	LocalValue    string
	RemoteValue   string
	LocalReplica  string
	RemoteReplica string
}

type InventoryItem struct {
	ID          string
	Name        string
	Quantity    int
	Priority    string
	UpdatedAt   time.Time
	LastWriter  string
	VectorClock VectorClock
	Conflicts   []Conflict
}

type MergeResult struct {
	Item             InventoryItem
	ConflictDetected bool
}

func NewInventoryItem(id, name string, quantity int, priority, replicaID string, updatedAt time.Time) InventoryItem {
	return InventoryItem{
		ID:          id,
		Name:        name,
		Quantity:    quantity,
		Priority:    priority,
		UpdatedAt:   updatedAt.UTC(),
		LastWriter:  replicaID,
		VectorClock: VectorClock{replicaID: 1},
	}
}

func (item InventoryItem) ApplyUpdate(replicaID string, quantity int, priority string, updatedAt time.Time) InventoryItem {
	next := item.Clone()
	next.Quantity = quantity
	next.Priority = priority
	next.UpdatedAt = updatedAt.UTC()
	next.LastWriter = replicaID
	next.VectorClock = next.VectorClock.Next(replicaID)
	next.Conflicts = nil
	return next
}

func (item InventoryItem) Clone() InventoryItem {
	return InventoryItem{
		ID:          item.ID,
		Name:        item.Name,
		Quantity:    item.Quantity,
		Priority:    item.Priority,
		UpdatedAt:   item.UpdatedAt,
		LastWriter:  item.LastWriter,
		VectorClock: item.VectorClock.Clone(),
		Conflicts:   append([]Conflict(nil), item.Conflicts...),
	}
}

func MergeInventory(local, remote InventoryItem) MergeResult {
	relation := CompareVectorClock(local.VectorClock, remote.VectorClock)

	switch relation {
	case HappensBefore:
		next := remote.Clone()
		next.Conflicts = nil
		return MergeResult{Item: next}
	case HappensAfter:
		next := local.Clone()
		next.Conflicts = nil
		return MergeResult{Item: next}
	case Equal:
		next := local.Clone()
		next.VectorClock = MergeVectorClock(local.VectorClock, remote.VectorClock)
		next.Conflicts = nil
		return MergeResult{Item: next}
	case Concurrent:
		return MergeResult{
			Item:             resolveConcurrent(local, remote),
			ConflictDetected: true,
		}
	default:
		next := local.Clone()
		return MergeResult{Item: next}
	}
}

func resolveConcurrent(local, remote InventoryItem) InventoryItem {
	winner := local.Clone()
	loser := remote

	if remote.UpdatedAt.After(local.UpdatedAt) || (remote.UpdatedAt.Equal(local.UpdatedAt) && remote.LastWriter > local.LastWriter) {
		winner = remote.Clone()
		loser = local
	}

	conflicts := make([]Conflict, 0, 2)
	if local.Quantity != remote.Quantity {
		conflicts = append(conflicts, Conflict{
			Field:         "quantity",
			LocalValue:    fmt.Sprintf("%d", local.Quantity),
			RemoteValue:   fmt.Sprintf("%d", remote.Quantity),
			LocalReplica:  local.LastWriter,
			RemoteReplica: remote.LastWriter,
		})
	}

	if local.Priority != remote.Priority {
		conflicts = append(conflicts, Conflict{
			Field:         "priority",
			LocalValue:    local.Priority,
			RemoteValue:   remote.Priority,
			LocalReplica:  local.LastWriter,
			RemoteReplica: remote.LastWriter,
		})
	}

	winner.VectorClock = MergeVectorClock(local.VectorClock, remote.VectorClock)
	winner.Conflicts = conflicts

	if len(conflicts) == 0 {
		winner.Conflicts = loser.Conflicts
	}

	return winner
}

type ClockRelation string

const (
	Equal         ClockRelation = "equal"
	HappensBefore ClockRelation = "before"
	HappensAfter  ClockRelation = "after"
	Concurrent    ClockRelation = "concurrent"
)

func (clock VectorClock) Clone() VectorClock {
	next := make(VectorClock, len(clock))
	for key, value := range clock {
		next[key] = value
	}
	return next
}

func (clock VectorClock) Next(replicaID string) VectorClock {
	next := clock.Clone()
	next[replicaID] = next[replicaID] + 1
	return next
}

func MergeVectorClock(left, right VectorClock) VectorClock {
	next := left.Clone()
	for replicaID, counter := range right {
		if counter > next[replicaID] {
			next[replicaID] = counter
		}
	}
	return next
}

func CompareVectorClock(left, right VectorClock) ClockRelation {
	replicas := make(map[string]struct{}, len(left)+len(right))
	for replicaID := range left {
		replicas[replicaID] = struct{}{}
	}
	for replicaID := range right {
		replicas[replicaID] = struct{}{}
	}

	leftAhead := false
	rightAhead := false

	for replicaID := range replicas {
		leftCounter := left[replicaID]
		rightCounter := right[replicaID]

		if leftCounter < rightCounter {
			rightAhead = true
		}
		if leftCounter > rightCounter {
			leftAhead = true
		}
	}

	switch {
	case !leftAhead && !rightAhead:
		return Equal
	case !leftAhead && rightAhead:
		return HappensBefore
	case leftAhead && !rightAhead:
		return HappensAfter
	default:
		return Concurrent
	}
}

func SortedReplicaIDs(clock VectorClock) []string {
	ids := make([]string, 0, len(clock))
	for replicaID := range clock {
		ids = append(ids, replicaID)
	}
	sort.Strings(ids)
	return ids
}
