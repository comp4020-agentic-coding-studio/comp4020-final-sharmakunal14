# Agentic autonomy needs a defensible standard of correctness

I argue that autonomy in software development should depend on checks grounded
outside the implementation being judged. An agent can write code, generate
tests and report success while preserving a mistaken interpretation of the
requirement. Good practice therefore needs two kinds of scrutiny: whether
checks detect broken behaviour, and whether the behaviour they protect is
actually wanted. Appointing another agent as reviewer does not, by itself,
establish either. The standard of correctness needs its own justification.

[Barr et al. (2015)](https://discovery.ucl.ac.uk/id/eprint/1471263/)
describe the test oracle problem: determining whether observed behaviour is
correct. Their survey predates coding agents, so it cannot establish their
failure rates. Its distinction remains useful, however: generating inputs and
executing code do not settle what the expected result should be. My inference
is that an agentic workflow can automate execution successfully while leaving
the central judgment unresolved. More passing tests cannot compensate for
an incorrect expectation shared by tests and implementation.

Practitioner techniques address part of this problem.
[Simon Willison's red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/)
requires observing tests fail before implementing the change. This helps
establish that the test detects the missing behaviour, but cannot establish
that the requested behaviour is right. Similarly,
[Birgitta Böckeler (2026)](https://martinfowler.com/articles/sensors-for-coding-agents.html)
reports a file with 100% statement coverage where thirteen deliberate code
mutations left the test suite passing. Her experiment illustrates why executing code and
checking its effects differ; it is not a representative benchmark. Mutation
testing strengthens tests' ability to detect changes, while Böckeler explicitly
leaves the correctness of the protected behaviour unresolved.

Maze Duel supplied a small example: its spectator test expected an identifier
that also allowed someone to join a race. The
[correction](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/8b9b3fa6141a8eda384b476977a18562d6e31e42)
required revisiting the read-only promise and changing the expectation.
This illustrates the failure mechanism; one project cannot establish its
prevalence across agentic development.

Nevertheless, requiring people to author every test would discard demonstrated
value. In Meta's deployment study,
[Alshahwan et al. (2024)](https://discovery.ucl.ac.uk/id/eprint/10199775/)
report engineers accepting 73% of TestGen-LLM's test improvements. The tool
filters generated tests for successful builds, repeated passing runs and
additional coverage. Crucially, it discards initially failing tests because
it cannot automatically distinguish a discovered bug from an incorrect
assertion. Its success supports automated regression protection, rather than
establishing intended behaviour. This distinction limits the authors' broad
language of assurance: acceptance and coverage gains in an internal deployment
are not a controlled demonstration of fewer production defects. The study
supports delegating test production while stating precisely what its filters
establish. It is a bounded generation pipeline, not evidence about unrestricted
coding agents.

Willison's fail-first advice and TestGen-LLM's passing-test filter serve
different purposes: specifying a change and preserving existing behaviour.
Selecting between them requires a judgment about what is being established.
A workflow cannot choose that purpose merely by finding whichever check
turns green.

[Kief Morris (2026)](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html)
offers a stronger countercase to intensive oversight: humans should improve
the harness governing agents rather than inspect every generated line. I agree
that review effort must scale. However, his suggestion that agents could
eventually score and automatically apply harness improvements needs a boundary.
Changing an implementation and changing the criteria that accept it are
different decisions. An easier check can manufacture apparent improvement.
Morris offers a useful design direction, not measured evidence that this
feedback loop reliably improves itself.

My proposed boundary is practical. Agents can iterate autonomously on routine,
reversible changes against established checks. For permissions and shared
state, reviewers should justify expected outcomes against explicit product
rules and challenge tests with deliberately broken implementations. Changes
to acceptance criteria need separate, visible justification. This costs time,
and mutation testing consumes resources; concentrating review on consequential
rules is more feasible than inspecting every generated line. Human judgments
also remain fallible, so ambiguous requirements need examples and user feedback.
Whether competition is enjoyable still requires players. Autonomy should grow
with the strength of the evidence and the recoverability of mistakes.

## References

- Barr, E. T., Harman, M., McMinn, P., Shahbaz, M. and Yoo, S. (2015).
  [The Oracle Problem in Software Testing: A Survey](https://discovery.ucl.ac.uk/id/eprint/1471263/).
  *IEEE Transactions on Software Engineering*, 41(5), 507–525.
- Alshahwan, N. et al. (2024).
  [Automated Unit Test Improvement using Large Language Models at Meta](https://discovery.ucl.ac.uk/id/eprint/10199775/).
  *FSE Companion*, 185–196.
- Willison, S. (n.d.).
  [Red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/).
  *Agentic Engineering Patterns*. Accessed 9 November 2026.
- Böckeler, B. (2026).
  [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html).
  *MartinFowler.com*, 27 May.
- Morris, K. (2026).
  [Humans and Agents in Software Engineering Loops](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html).
  *MartinFowler.com*, 4 March.
