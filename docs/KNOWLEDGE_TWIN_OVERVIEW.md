# Nova Digital Knowledge Twin

## 1. The problem

Most learning platforms can record whether a student selected the right answer. That score alone cannot show whether the student understands the idea, can explain it, or can use it in a different situation.

## 2. The idea

Nova's Digital Knowledge Twin is a changing picture of the evidence a learner has shown. It is not a permanent grade or a claim that software can know everything a student understands.

## 3. How it works

The learner explains a concept, applies it to a new context, reports their confidence, and can contribute quiz evidence. The same OpenRouter model already used by Nova's tutor and teacher assistant reviews that evidence. It estimates conceptual understanding, explanation, reasoning, problem solving, application, retention, consistency, misconceptions, confidence, and language independence. When evidence is missing, the interface says so instead of inventing a score. New evidence can change every estimate.

## 4. The virtual classmate

Nova's learning companion helps the student reflect, notice a gap, and choose a next step. It should support the learner as they progress, while making clear that an AI estimate is provisional and can be wrong.

## 5. Multilingual intelligence

Students may explain ideas in Persian, English, or a mix of both. The model should assess the programming concept rather than reward language fluency. Language independence remains unknown unless evidence gives a fair comparison across languages.

## 6. Real-world learning

The learner is asked to use an idea in a new example, not only repeat the lesson example. That transfer response is evidence about whether the concept can travel beyond the original exercise.

## 7. The learning loop

Understanding → Evidence → Diagnosis → Adaptation → Application → Growth. The student adds evidence, Nova updates provisional estimates, and the next activity can target a useful practice step.

## 8. The vision

Personalized education can move beyond keeping a record of answers. It can help learners and teachers see what has evidence behind it, where more practice may help, and how knowledge grows over time.

> We are not building a system that simply records what students answered. We are building a system that continuously models what students actually know, understand, and can apply — while giving them a companion who learns and grows alongside them.

**Learn together. Make mistakes together. Grow together.**

## Demo behavior and limits

- The feature sends the learner's entered explanation, transfer example, reported confidence, lesson name, and quiz score for that lesson to Nova's existing server-side OpenRouter integration.
- The OpenRouter key remains on the server; the browser does not receive it.
- The current demo saves the returned profile in that browser's local storage. It is not yet durable, shared between devices, or connected to a PostgreSQL knowledge-evidence table.
- AI values are estimates from limited evidence, not grades, diagnoses, or proof of ability. An unavailable estimate is shown when the model returns no usable evidence.
- Teacher sandbox guidance is a recommendation shown in the draft preview. AI-generated code is not executed by the preview.
