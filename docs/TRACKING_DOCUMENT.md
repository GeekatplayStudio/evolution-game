# Evolution Sandbox — Tracking Document

## Project Metadata
- Owner: Team Evolution
- Repo: Evolution-game
- Cadence: Weekly sprint (recommended)
- Status Scale: `Not Started` | `In Progress` | `Blocked` | `Done`

## Milestone Tracker
| Milestone | Scope | Target Date | Status | Owner | Notes |
|---|---|---|---|---|---|
| M1 MVP Playable Loop | Turn loop + map + species panel + mutation lab | 2026-03-10 | Done | Core Team | Build passes |
| M2 Persistence | Save/load snapshots | 2026-03-14 | Done | Core Team | Zustand persist + manual snapshots live |
| M3 Test Automation | Unit tests for engine/store | 2026-03-17 | In Progress | Core Team | Vitest configured with initial engine/store coverage |
| M4 Balance Pass | Economy and population tuning | 2026-03-21 | Not Started | TBD | Use telemetry |

## Workstream Board
| ID | Workstream | Task | Priority | Status | Assignee | ETA | Blocker |
|---|---|---|---|---|---|---|---|
| ENG-001 | Engine | Add deterministic RNG seed | High | Done | Core Team | 2026-03-11 |  |
| ENG-002 | Engine | Refine hydraulic flow (capacity-aware split) | High | Not Started |  |  |  |
| UI-001 | UI | Add selected species trait chips | Medium | Not Started |  |  |  |
| UI-002 | UI | Add legend for terrain + moisture overlay toggle | Medium | Not Started |  |  |  |
| QA-001 | QA | Add unit tests for season progression | High | Done | Core Team | 2026-03-11 |  |
| QA-002 | QA | Add unit tests for mutation economy | High | Done | Core Team | 2026-03-11 |  |
| QA-003 | QA | Add unit tests for water overflow routing | High | Done | Core Team | 2026-03-11 |  |
| OPS-001 | Repo | Remove AppleDouble junk files and ignore them | High | Done | Core Team | 2026-03-11 |  |

## Issue Log
| Date | Issue ID | Severity | Description | Owner | Status | Resolution |
|---|---|---|---|---|---|---|
| 2026-03-03 | BUG-001 | Medium | Mutation persistence regression risk | Core Team | Mitigated | Species kept in store state |

## Change Log
| Date | Change | Area | Impact |
|---|---|---|---|
| 2026-03-03 | Initial MVP implementation | Engine/UI/Store | Playable baseline |
| 2026-03-11 | Persistence + deterministic seed flow confirmed in codebase | Store/UI/Engine | Tracking docs aligned with shipped features |
| 2026-03-11 | AppleDouble cleanup and ignore rule added | Repo | Lint can validate real source files only |
| 2026-03-11 | Vitest configured with initial engine/store tests | QA/Tooling | Automated regression coverage started |

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
