# Therapreneur

_Limit: 600 words. Everything here is read by every agent on every task._

Software, services and business coaching that help allied health practitioners in private practice run the business side of their practice. We start with practice management for solo OTs, physios and speech therapists in South Africa.

**Stage:** validating. The goal right now is to put prototypes in front of therapists and learn from their feedback, not to build a finished product.

**Stack:** not chosen yet. Don't add application code or pick a framework until it has been grilled with Barry and recorded in `docs/decisions/`.

## Read first

| Doc | What it holds |
| --- | --- |
| [docs/vision.md](docs/vision.md) | Why we exist, who it's for, where it's going |
| [docs/features/](docs/features/README.md) | One doc per feature: problem, evidence, scope, status |
| [GLOSSARY.md](GLOSSARY.md) | The ubiquitous language. Use these words in code, UI and conversation |
| [docs/design.md](docs/design.md) | Look, feel and tone of voice |
| [docs/decisions/](docs/decisions/) | Hard-to-reverse choices and why we made them |
| [CHANGELOG.md](CHANGELOG.md) | What changed and when |

## Working with Barry

Barry Morisse is the founder. He's non-technical, builds entirely in the cloud with coding agents, and wants to learn as he goes.

1. **Be a thought partner, not a yes-man.** Challenge assumptions, offer alternatives, and say plainly when an idea is weak.
2. **Keep him honest on validation.** Before building something new, ask which therapist feedback it serves. Flag building that runs ahead of evidence, because Barry knows he's prone to over-building.
3. **Grill before building.** New features start with the `grill-me` skill and a feature doc, before any code.
4. **Explain in plain language.** Say what you did and why in a line or two, and teach the concept the first time it comes up. Don't lecture.
5. **Speed over polish while validating.** Cut steps that don't earn their keep yet, but never on money maths.
6. **Thoughtful, maintainable, efficient code.** Simple over clever, few dependencies, and names that match the glossary.

## Git workflow

- `main` is always working. Barry approves every merge to it, and agents never merge on their own.
- Every change gets its own branch and pull request, does one thing, and explains itself in plain English.
- PRs are squash-merged, so `main` reads as one line per change.
- Each PR should have a preview link Barry can open on his phone. Clicking through it is the main test while prototyping.
- Automated checks: type-check, build, and unit tests on money maths (invoice totals, reconciliation). Nothing more until real users are live.
- Update `CHANGELOG.md` in the same PR when the change is something a practitioner would notice.

## Keeping docs short

These docs are context for agents, not a wiki. The bar to edit is high:

- Change a doc only when a decision changes, not to add detail or narrate work.
- Respect each doc's word limit. To add something, cut something.
- Glossary and decisions follow the `domain-modeling` skill's rules.
- Propose doc edits in the PR description so Barry sees them.

## Lessons

When Barry corrects an agent, the agent proposes a one-line lesson here and Barry approves it. The list is capped at 15, so a new lesson replaces or merges an old one.

_None yet._
