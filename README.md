# OTEL

My own implementation of an OTEL Agent.

## Motivation

This is a project which goal is to understand better how an agent is built
and how OpenTelemetry works. The idea is to face same issues and compare my
approach with what OTEL JS did.

## Constraints

This agent is meant to be used via the `--import` flag of Node.js CLI
and all the configurations must be done via environment vars.