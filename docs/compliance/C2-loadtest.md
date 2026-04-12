# C2 Load Test

Primary proof should come from the Linux GitHub Actions workflow, not local Windows runs.

Official CI run:
- Workflow: `C2 Vegeta Load Test`
- Run ID: `24307971168`
- Runner: `ubuntu-latest`
- Target: `http://127.0.0.1:8080/healthz`
- Rate: `10000/s`
- Duration: `10s`

CI result summary:

```text
Requests      [total, rate, throughput]  100000, 10000.05, 9999.84
Duration      [total, attack, wait]      10.000164416s, 9.999948739s, 215.677µs
Latencies     [mean, 50, 95, 99, max]    190.01µs, 166.287µs, 321.294µs, 669.001µs, 3.517065ms
Bytes In      [total, mean]              1600000, 16.00
Bytes Out     [total, mean]              0, 0.00
Success       [ratio]                    100.00%
Status Codes  [code:count]               200:100000
Error Set:
```

Artifacts:
- `c2-vegeta-loadtest`
- `C2-loadtest-ci.md`
- `c2_vegeta_results.bin`
