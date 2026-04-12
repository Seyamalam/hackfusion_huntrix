package api

import (
	"net/http"
	"sync"
	"time"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/syncmodel"
)

type InventoryDemoState struct {
	Current       syncmodel.InventoryItem `json:"current"`
	LocalReplica  syncmodel.InventoryItem `json:"local_replica"`
	RemoteReplica syncmodel.InventoryItem `json:"remote_replica"`
	Scenario      string                  `json:"scenario"`
	ResolutionLog []string                `json:"resolution_log"`
}

type InventoryDemoActionResponse struct {
	State            InventoryDemoState `json:"state"`
	ConflictDetected bool               `json:"conflict_detected"`
	Message          string             `json:"message"`
}

type inventoryDemoStore struct {
	mu    sync.RWMutex
	state InventoryDemoState
}

func newInventoryDemoStore() *inventoryDemoStore {
	store := &inventoryDemoStore{}
	store.reset()
	return store
}

func (s *inventoryDemoStore) snapshot() InventoryDemoState {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneDemoState(s.state)
}

func (s *inventoryDemoStore) reset() InventoryDemoState {
	s.mu.Lock()
	defer s.mu.Unlock()

	base := syncmodel.NewInventoryItem("inv-ors-001", "ORS Saline", 120, "P1", "A", time.Unix(1_700_000_000, 0))
	s.state = InventoryDemoState{
		Current:       base,
		LocalReplica:  base,
		RemoteReplica: base,
		Scenario:      "baseline",
		ResolutionLog: []string{},
	}
	return cloneDemoState(s.state)
}

func (s *inventoryDemoStore) applyScenario(name string) (InventoryDemoState, bool, string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	base := syncmodel.NewInventoryItem("inv-ors-001", "ORS Saline", 120, "P1", "A", time.Unix(1_700_000_000, 0))
	switch name {
	case "causal":
		local := base.ApplyUpdate("A", 150, "P1", time.Unix(1_700_000_300, 0))
		remote := local.Clone()
		remote.Quantity = 160
		remote.Priority = "P0"
		remote.UpdatedAt = time.Unix(1_700_000_600, 0)
		remote.LastWriter = "B"
		remote.VectorClock = syncmodel.MergeVectorClock(local.VectorClock, syncmodel.VectorClock{"B": 1})

		result := syncmodel.MergeInventory(local, remote)
		s.state = InventoryDemoState{
			Current:       result.Item,
			LocalReplica:  local,
			RemoteReplica: remote,
			Scenario:      "causal",
			ResolutionLog: []string{},
		}
		return cloneDemoState(s.state), result.ConflictDetected, "Applied causal merge demo: A writes, B reads A, then B writes."
	case "conflict":
		local := base.ApplyUpdate("A", 180, "P0", time.Unix(1_700_000_300, 0))
		remote := base.Clone()
		remote.Quantity = 70
		remote.Priority = "P3"
		remote.UpdatedAt = time.Unix(1_700_000_360, 0)
		remote.LastWriter = "B"
		remote.VectorClock = syncmodel.VectorClock{"A": 1, "B": 1}

		result := syncmodel.MergeInventory(local, remote)
		s.state = InventoryDemoState{
			Current:       result.Item,
			LocalReplica:  local,
			RemoteReplica: remote,
			Scenario:      "conflict",
			ResolutionLog: []string{},
		}
		return cloneDemoState(s.state), result.ConflictDetected, "Applied concurrent conflict demo: same item updated independently on replicas A and B."
	default:
		return cloneDemoState(s.state), false, "Unknown scenario"
	}
}

func (s *inventoryDemoStore) resolve(choice string) (InventoryDemoState, string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	useRemote := choice == "remote"
	s.state.Current = syncmodel.ResolveConflicts(s.state.Current, "sync-admin", time.Now().UTC(), useRemote)
	s.state.ResolutionLog = append(s.state.ResolutionLog, resolutionMessage(choice, time.Now().UTC()))
	return cloneDemoState(s.state), "Recorded conflict resolution decision."
}

func (s *Server) handleInventoryDemoState(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.inventoryDemo.snapshot())
}

func (s *Server) handleInventoryDemoReset(w http.ResponseWriter, _ *http.Request) {
	state := s.inventoryDemo.reset()
	writeJSON(w, http.StatusOK, InventoryDemoActionResponse{
		State:            state,
		ConflictDetected: false,
		Message:          "Reset inventory sync demo state.",
	})
}

func (s *Server) handleInventoryDemoApply(w http.ResponseWriter, r *http.Request) {
	scenarioName := r.URL.Query().Get("scenario")
	state, conflictDetected, message := s.inventoryDemo.applyScenario(scenarioName)
	writeJSON(w, http.StatusOK, InventoryDemoActionResponse{
		State:            state,
		ConflictDetected: conflictDetected,
		Message:          message,
	})
}

func (s *Server) handleInventoryDemoResolve(w http.ResponseWriter, r *http.Request) {
	choice := r.URL.Query().Get("choice")
	state, message := s.inventoryDemo.resolve(choice)
	writeJSON(w, http.StatusOK, InventoryDemoActionResponse{
		State:            state,
		ConflictDetected: false,
		Message:          message,
	})
}

func cloneDemoState(state InventoryDemoState) InventoryDemoState {
	next := state
	next.Current = state.Current.Clone()
	next.LocalReplica = state.LocalReplica.Clone()
	next.RemoteReplica = state.RemoteReplica.Clone()
	next.ResolutionLog = append([]string{}, state.ResolutionLog...)
	return next
}

func resolutionMessage(choice string, now time.Time) string {
	if choice == "remote" {
		return now.Format(time.RFC3339) + " kept remote values and cleared conflict state."
	}
	return now.Format(time.RFC3339) + " kept local values and cleared conflict state."
}
