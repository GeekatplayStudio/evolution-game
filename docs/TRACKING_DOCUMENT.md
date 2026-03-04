# Evolution Sandbox — Tracking Document

## Project Metadata
- Owner: Team Evolution
- Repo: Evolution-game
- Cadence: Weekly sprint (recommended)
- Status Scale: `Not Started` | `In Progress` | `Blocked` | `Done`

## Milestone Tracker
| Milestone | Scope | Target Date | Status | Owner | Notes |
|---|---|---|---|---|---|
| M1 MVP Playable Loop | Turn loop + map + species panel + mutation lab | 2026-03-10 | In Progress | Core Team | Build passes |
| M2 Persistence | Save/load snapshots | 2026-03-14 | Not Started | TBD | Use Zustand persist |
| M3 Test Automation | Unit tests for engine/store | 2026-03-17 | Not Started | TBD | Vitest |
| M4 Balance Pass | Economy and population tuning | 2026-03-21 | Not Started | TBD | Use telemetry |

## Workstream Board
| ID | Workstream | Task | Priority | Status | Assignee | ETA | Blocker |
|---|---|---|---|---|---|---|---|
| ENG-001 | Engine | Add deterministic RNG seed | High | Not Started |  |  |  |
| ENG-002 | Engine | Refine hydraulic flow (capacity-aware split) | High | Not Started |  |  |  |
| UI-001 | UI | Add selected species trait chips | Medium | Not Started |  |  |  |
| UI-002 | UI | Add legend for terrain + moisture overlay toggle | Medium | Not Started |  |  |  |
| QA-001 | QA | Add unit tests for season progression | High | Not Started |  |  |  |
| QA-002 | QA | Add unit tests for mutation economy | High | Not Started |  |  |  |

## Issue Log
| Date | Issue ID | Severity | Description | Owner | Status | Resolution |
|---|---|---|---|---|---|---|
| 2026-03-03 | BUG-001 | Medium | Mutation persistence regression risk | Core Team | Mitigated | Species kept in store state |

## Change Log
| Date | Change | Area | Impact |
|---|---|---|---|
| 2026-03-03 | Initial MVP implementation | Engine/UI/Store | Playable baseline |

## KPIs (Tracking)
- Simulation stability: % runs reaching 100 turns without crash.
- Population balance: herbivore/carnivore survival rate over 50 turns.
- Performance: average turn processing time (ms).
- Engagement proxy: average mutations purchased per 25 turns.

## Weekly Review Template
- Wins:
- Risks:
- New blockers:
- Decisions made:
- Scope changes:
- Next week commitments:
