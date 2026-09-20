---
name: feynman-check
description: Verify whether the user truly understands a topic after learning it. Have the user explain it back, then probe its mechanism, boundaries, counterexamples, and transfer to new situations. Use when the user says "test me", "do I really understand this?", "use the Feynman method", or asks to find gaps in their understanding.
---

# Feynman Check

## Mission

This is a **verification** skill, not a replacement teacher. Its job is to distinguish:

- recognition from recall;
- repeating words from explaining a mechanism;
- solving a rehearsed example from transferring an idea to a new setting.

Use it after `teach`, after reading a paper, or whenever the user believes they understand something and wants that belief tested. Teach only the smallest missing piece needed to continue; send substantial gaps back to `teach`.

## Ground rules

- Assess claims against verified facts. If you are at all unsure of a technical fact needed to judge the user, research it before judging.
- Do not reward fluent wording as evidence of understanding.
- Do not turn the check into a lecture before the user has attempted an answer.
- Be direct about errors, but treat an error as diagnostic evidence, not failure.
- Test one concept or tightly connected mechanism at a time.
- Work in the user's language.

## The check loop

### 1. Set the target

Identify the exact concept, claim, paper section, or problem-solving method to test. Ask what depth matters: practical use, technical derivation, or rigorous mastery.

If the topic is broad, narrow it to one claim that can be checked in one session. Reuse the prior lesson context when it exists; do not make the user repeat information already in the conversation.

### 2. Reverse the roles

Ask the user to teach the idea to you in their own words, as if you were a capable beginner. Ask for:

1. what problem the idea solves;
2. the causal or logical mechanism, step by step;
3. one concrete example;
4. where they think it might fail or stop applying.

Use `ask_user_question` for this free-form explanation. Do not supply vocabulary, a scaffold, or the missing steps before their attempt.

### 3. Diagnose the explanation

Privately separate the user's answer into claims. For each important claim, label it internally as correct, incomplete, unsupported, or wrong.

Give concise feedback before moving on:

- state what is already solid;
- name one highest-leverage gap or contradiction;
- ask the next question that can distinguish competing mental models.

Do not dump every correction at once. If a foundational claim is wrong, test and repair it before testing a dependent claim.

### 4. Probe beyond recall

Choose the smallest set of probes that can establish the next uncertain level. Use at least two different probe types when the session is more than a quick check:

- **Mechanism:** ask what changes if a component, assumption, or step changes.
- **Boundary:** ask for a counterexample, limiting case, or condition under which the rule fails.
- **Prediction:** present a concrete case and ask the user to predict the result before explaining it.
- **Near transfer:** change the surface details while preserving the same structure.
- **Far transfer:** present a superficially unrelated situation with the same underlying structure.

For a question with a determinate answer, use `quiz` with diagnostic distractors. Each option must be a bare, parallel claim; put reasoning only in the post-answer explanation. Use `ask_user_question` only when the answer genuinely needs open-ended reasoning or explanation.

Adapt after every response. A correct answer should make the next probe substantially harder; a wrong answer should be followed by one nearby probe to determine whether it was a slip, a narrow gap, or a systematic misconception.

### 5. Calibrate mastery

Report the highest level supported by evidence, never by confidence or eloquence:

| Level | Evidence required |
|---|---|
| L1 — Recall | Can accurately explain the central claim and give an example. |
| L2 — Mechanism | Can derive or causally explain why it works. |
| L3 — Boundaries | Can correctly predict edge cases or counterexamples. |
| L4 — Transfer | Can apply the structure to a genuinely new problem. |
| L5 — Cross-domain | Can identify and justify the same structure in a superficially different domain. |
| L6 — Spontaneous use | Uses the idea correctly, without prompting, in an unrelated later discussion. |

L6 cannot be awarded from a prompted in-session exercise. Record it only when its evidence actually occurs.

### 6. Close with an actionable verdict

Use this compact format:

```markdown
## Feynman check — <topic>

- **Verified:** <what the user can demonstrably do>
- **Gap:** <the exact claim, causal link, or boundary that remains weak>
- **Level supported:** L<n> — <one-sentence evidence>
- **Next move:** <one concrete retrieval, transfer, or return-to-teach task>
```

If the foundation is missing, say exactly which node should be revisited with `teach`. If it is solid, finish with one delayed, no-hint recall or real-world transfer task rather than additional praise.

## Boundaries

- Do not write long-term learner records or schedule reviews; that belongs to a future `review` skill.
- Do not automatically invoke this skill for a normal factual question.
- Do not present a level label as a permanent identity. It is evidence from this check only.
