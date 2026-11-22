# GESTURA Usability Engineering & Empirical Evaluation Protocol

## 1. System Usability Scale (SUS) Framework

To benchmark user experience, cognitive load, and accessibility objectively, GESTURA embeds the standard 10-item System Usability Scale (Brooke, 1996) directly into the settings dashboard (`/settings` -> SUS Modal).

### The 10 Standard SUS Statements
1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

### Scoring Algorithm
Each response is rated on a 5-point Likert scale from 1 (*Strongly Disagree*) to 5 (*Strongly Agree*):
- For odd-numbered items (1, 3, 5, 7, 9): `Score contribution = Response - 1`
- For even-numbered items (2, 4, 6, 8, 10): `Score contribution = 5 - Response`
- **Total SUS Score** = $\sum(\text{contributions}) \times 2.5$ (normalized to 0–100 scale).

```python
# Exact implementation in gestura_sidecar.routers.settings
odd_sum = sum(answers[i] - 1 for i in range(0, 10, 2))
even_sum = sum(5 - answers[i] for i in range(1, 10, 2))
sus_score = (odd_sum + even_sum) * 2.5
```

### Grade Benchmark Interpretations
- **SUS >= 85**: Grade A+ (*Exceptional / Industry Leading*)
- **70 <= SUS < 85**: Grade B / B+ (*Good / High Acceptance*)
- **68 <= SUS < 70**: Grade C (*Average Benchmark Cutoff*)
- **SUS < 68**: Marginal / Unacceptable usability friction

---

## 2. Empirical User Testing Protocol

### Participant Cohort
- **Deaf / Hard-of-Hearing Participants (N=5)**: Fluent signers testing Sign -> Speech recognition, landmark framing, and caption confirmation flow.
- **Hearing Communication Partners (N=5)**: Non-signing users testing Speech -> Sign speech recognition, text-to-gloss accuracy, and avatar visual comprehension.

### Task Evaluation Protocol

| Task ID | Description | Success Criteria | Time Target |
|---|---|---|---|
| **Task 1: Onboarding & Calibration** | Launch app, complete 3-step setup, verify lighting/framing. | Camera and landmark overlay active, no occlusion warning. | < 90 seconds |
| **Task 2: Sign-to-Speech Turn** | Sign "HELLO DOCTOR" using camera, review caption, speak aloud. | Speech synthesized, turn recorded in transcript. | < 30 seconds |
| **Task 3: Speech-to-Sign Turn** | Speak "Where is your home?" into mic, observe avatar animation. | Gloss sequence `HOME WHERE` animated at 60 fps. | < 20 seconds |
| **Task 4: Session Export & Privacy Wipe** | Export dialogue transcript to HTML, execute one-click wipe. | Valid HTML generated, session count resets to 0. | < 45 seconds |

### Evaluation Metrics
- **Task Completion Rate (TCR)**: Target $\ge 95\%$.
- **Time on Task (ToT)**: Measured per participant.
- **Error Recovery Rate**: Successful caption editing before TTS dispatch.
- **Mean SUS Score Target**: Target $\ge 80.0$.
