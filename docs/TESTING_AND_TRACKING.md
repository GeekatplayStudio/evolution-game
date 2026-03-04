# Evolution Sandbox — Testing and Tracking

## 1) Testing Strategy

### A. Test Levels
- Unit tests: core engine functions and store actions.
- Integration tests: turn progression + UI state coupling.
- Manual gameplay QA: UX correctness and balancing sanity.

### B. Priority Test Areas
1. Time and season progression (`12 turns = 1 year`).
2. Water overflow routing to lower elevation neighbors.
3. Plant growth/evaporation seasonal multipliers.
4. Animal lifecycle:
   - energy consumption
   - feeding/hunting
   - reproduction constraints
   - death at 0 energy/max age
5. Mutation economy:
   - point spending
   - trait gating
   - no duplicate mutation purchases.

## 2) Suggested Automated Test Cases
- `engine.season.spec.ts`
  - verifies month/year/season transitions.
- `engine.waterflow.spec.ts`
  - verifies overflow cap and lower-elevation routing.
- `engine.animals.spec.ts`
  - verifies herbivore feeding and predator hunting outcomes.
- `store.mutations.spec.ts`
  - verifies point deduction and persistent trait update.

## 3) Manual QA Checklist
- [ ] Next Turn updates map, table, and events.
- [ ] Selecting hex updates details panel.
- [ ] Selecting species updates mutation options.
- [ ] Applying mutation consumes points and logs event.
- [ ] Reset returns to initial valid state.
- [ ] Zoom/pan remains responsive under repeated turns.

## 4) Bug Tracking Workflow
1. Reproduce consistently (include seed/turn if available).
2. Log issue in tracker with severity and expected vs actual.
3. Attach screenshot/video and console output.
4. Assign owner + target fix date.
5. Verify fix via regression checklist.

## 5) Severity Definitions
- Critical: crash/data corruption/game cannot progress.
- High: major mechanic broken but workaround exists.
- Medium: incorrect behavior with limited gameplay impact.
- Low: cosmetic/minor UX issue.

## 6) Release Readiness Gate
Release candidate requires:
- `npm run build` success.
- No open Critical/High issues.
- Manual QA checklist pass.
- 20+ turn smoke test pass on latest build.

## 7) Tracking Artifacts
Maintain these artifacts every sprint:
- [TRACKING_DOCUMENT.md](TRACKING_DOCUMENT.md)
- Test run report (date, environment, pass/fail summary)
- Bug register export (open/closed counts by severity)

## 8) Test Run Report Template
- Date:
- Build/Commit:
- Tester:
- Environment:
- Automated tests: Passed/Failed
- Manual checklist: Passed/Failed
- Open issues by severity: C/H/M/L
- Go/No-Go recommendation:
