# Agent autonomy needs independently justified checks

A coding agent should get more freedom only when there is a good reason to
trust the checks guiding it. Code and tests can agree while both misunderstand
what the software should do. I argue for reviewing two things separately:
whether a test catches a failure, and why its expected result is correct.
A second agent can help with that review, but agreement between agents does
not settle the requirement.

[Barr et al. (2015)](https://doi.org/10.1109/TSE.2014.2372785)
describe this as the test oracle problem: deciding whether observed behaviour
is correct. Their survey predates coding agents, so I use it to frame the
problem, not to estimate how often agents fail. Its relevance is that running
a test and deciding what it should assert are different tasks. Faster test
generation leaves the second task unresolved when expectations come from
the same mistaken reading as the implementation.

[Simon Willison's red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/)
addresses one part of this. Seeing a test fail before implementing a change
helps show that it detects the missing behaviour. However, it can still
require the wrong behaviour. [Birgitta Böckeler (2026)](https://martinfowler.com/articles/sensors-for-coding-agents.html)
shows another weakness: a file had 100% statement coverage, yet thirteen
mutations to its code left the tests passing. This was one practitioner
experiment, so it cannot establish how common the problem is. It does show
why coverage is weak evidence of detection. Mutation testing probes that
gap; deciding what behaviour deserves protection remains a separate question.

I encountered that distinction in Maze Duel. A spectator test expected an
identifier that also let someone join a race. Fixing it meant returning to
the read-only rule and [changing the expectation](https://github.com/comp4020-agentic-coding-studio/comp4020-final-sharmakunal14/commit/8b9b3fa6141a8eda384b476977a18562d6e31e42).
More tests copying the existing response would have preserved the mistake.
This illustrates a failure mechanism, rather than a general rate of agent errors.

There is also a strong case for delegating test writing.
[Alshahwan et al. (2024)](https://doi.org/10.1145/3663529.3663839)
report that Meta engineers accepted 73% of TestGen-LLM's test improvements.
Its filters require generated tests to build, pass repeatedly and increase
coverage. But the tool discards a test if it fails on its first run: without
an oracle, it cannot distinguish
a real bug from a wrong assertion. This narrows the authors' assurance claim.
They improve regression protection for existing behaviour; acceptance and
coverage do not establish fewer production defects or the correctness of that
behaviour. The study
concerns a constrained test-generation pipeline, not unrestricted coding agents.

TestGen-LLM's passing-test filter and Willison's fail-first approach are not
contradictory. One preserves existing behaviour; the other checks a proposed
change. A reviewer must decide which job is needed. Treating a green result
as sufficient for either would miss the distinction that makes both useful.

[Kief Morris (2026)](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html)
argues for improving the harness instead of inspecting every generated line.
I agree with the need to avoid making human review the bottleneck. His further
proposal, letting agents score recommendations and automatically apply some
harness changes, needs more caution. An agent could make its results look
better by weakening the check. Morris presents a direction for development,
not measurements showing that this feedback loop reliably improves itself.
I would therefore require a separate explanation for changes to acceptance
criteria, even when implementation changes can proceed automatically.

This does not mean people must write every assertion. Agents can work on
routine, reversible changes within established rules. Review should focus on
consequential boundaries such as permissions and shared state: trace expected
results to a requirement, try a deliberately broken implementation, and make
changes to the requirement visible. These checks cost time and computation,
so applying them where mistakes matter most is more realistic than reviewing
every line. Human reviewers can also be wrong. Examples and feedback from
users remain necessary when the requirement itself is uncertain. I would
expand autonomy as this evidence improves and mistakes become easier to undo,
rather than because the agent produces more passing tests.

## References

- Barr, E. T., Harman, M., McMinn, P., Shahbaz, M. and Yoo, S. (2015).
  [The Oracle Problem in Software Testing: A Survey](https://doi.org/10.1109/TSE.2014.2372785).
  *IEEE Transactions on Software Engineering*, 41(5), 507–525.
  doi:10.1109/TSE.2014.2372785.
- Alshahwan, N. et al. (2024).
  [Automated Unit Test Improvement using Large Language Models at Meta](https://doi.org/10.1145/3663529.3663839).
  *Companion Proceedings of the 32nd ACM International Conference on the
  Foundations of Software Engineering (FSE Companion '24)*, 185–196.
  doi:10.1145/3663529.3663839.
- Willison, S. (n.d.).
  [Red/green TDD](https://simonwillison.net/guides/agentic-engineering-patterns/red-green-tdd/).
  *Agentic Engineering Patterns*. Accessed 9 November 2026.
- Böckeler, B. (2026).
  [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html).
  *MartinFowler.com*, 27 May.
- Morris, K. (2026).
  [Humans and Agents in Software Engineering Loops](https://martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html).
  *MartinFowler.com*, 4 March.
