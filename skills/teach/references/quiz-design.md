# Diagnostic quiz design

Read when constructing a graded quiz during teaching. Keep the interaction and schema requirements in the `quiz` tool; this reference covers pedagogy.

## Construct options, do not merely audit them

1. Write the correct answer as a bare claim. Put reasoning in the post-answer `explanation`, not in the options.
2. Create each distractor by changing that claim to reflect a plausible misconception or an easily confused neighboring concept. Keep the same grammatical skeleton, specificity, and register across options.
3. Each distractor should be tempting to someone with that misconception but unambiguously wrong under the question's stated assumptions. Avoid trick wording or overlapping answers.
4. Keep options comparable in length and detail. Do not give away the answer with asymmetric bolding, terminology, or a justification attached only to the correct option.
5. Read the set without solving the question: if wording alone identifies the answer, rebuild it. Keep the correct option value aligned with `correctAnswer`; explain why it is correct only after the attempt.

## Use the result

Test a meaningful causal link, prediction, prerequisite, or application, not a detail merely because it is easy to score. Ask one question at a time and wait. Feedback should identify the relevant connection, not just repeat the selected answer.

Use a nearby follow-up when needed to distinguish a slip from a misconception; do not automatically increase difficulty until the user fails. Correct a missing foundation before relying on it. For broader transfer and mastery verification explicitly requested by the user, use `feynman-check`.
