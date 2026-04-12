package chaos

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Seyamalam/hackfusion_huntrix/services/core/internal/scenario"
)

type Client struct {
	baseURL    string
	httpClient *http.Client
}

func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *Client) FetchNetworkStatus(ctx context.Context) (scenario.Graph, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/network/status", nil)
	if err != nil {
		return scenario.Graph{}, fmt.Errorf("create status request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return scenario.Graph{}, fmt.Errorf("fetch status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return scenario.Graph{}, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return scenario.Graph{}, fmt.Errorf("read status response: %w", err)
	}

	graph, err := scenario.ParseGraph(body)
	if err != nil {
		return scenario.Graph{}, fmt.Errorf("parse status response: %w", err)
	}

	return graph, nil
}
