# OTEL

My own implementation of an OTEL Agent.

## Motivation

This is a project which goal is to understand better how an agent is built
and how OpenTelemetry works. The idea is to face same issues and compare my
approach with what OTEL JS did.

## Constraints

This agent is meant to be used via the `--import` flag of Node.js CLI
and all the configurations must be done via environment vars. This means
some Node.js versions are not suported.

There's no option to select a span processor. This agent implements a BatchSpanProcessor
that can behave as a SingleSpanProcessor by tweaking the env vars `OTEL_BSP_MAX_QUEUE_SIZE`,
`OTEL_BSP_MAX_EXPORT_BATCH_SIZE` and `OTEL_BSP_SCHEDULE_DELAY`.

There is only one type of exporter which is equivalent to the OTLPGrpc exporter
from the OpenTelemetry SDK.

The agent is meant to instrument simple applications so we assume there is only one
Resource involved. Agent will accept detectors and there will be config options to
let the user decide if the export process should wait for the Resource to be ready
(all detectors finished).

For now the agent only exports traces. No metrics or logs.
