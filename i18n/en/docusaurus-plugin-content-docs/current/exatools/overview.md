---
title: ExaTools Overview
---

# ExaTools

A collection of utilities for analyzing, validating, and visualizing acoustic simulation results.

## Tools

| Name | Use | Status |
|---|---|---|
| [IRAnalyzer](./iranalyzer.md) | IR analysis and visualization, Embree-based validation | Available |

## Analysis paths built into SimpleST

Even without a separate tool, the [SimpleST](../core/simplest.md) offline engine (`SimpleSTOffline`)
deterministically generates Raw energy taps, 9-band pressure IRs, and binaural IRs. soundtrace.js's
`getIRs()` / `renderMonoImpulseResponse()` and the UE and Unity statistics surfaces expose the same
engine instrumentation (`st_rt_get_timing`, `st_rt_ir_get_stats`).

## Additional Tools

Additional tools will join progressively.
