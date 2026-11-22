# GESTURA Ethics, Accessibility & Societal Impact Statement

## 1. Ethical Stance on Sign Languages

Sign languages—such as Indian Sign Language (ISL) and American Sign Language (ASL)—are rich, complex, autonomous natural languages with full morphological systems, spatial grammars, and nuanced non-manual features (facial expressions, head tilts, mouthing, torso posture).

> [!IMPORTANT]
> **Not a Full Language Replacement**:
> GESTURA is designed as an offline assistive aid for isolated conversational exchanges (closed vocabulary of 40 signs with fingerspelling fallback). It is **not** an automated fluent sign-language interpreter, nor does it replace the cultural richness, spatial syntax, or non-manual nuance of Deaf communication.

---

## 2. Critical Context Disclaimers

### Medical and Legal High-Stakes Disclaimer
- **Not a Certified Interpreter**: GESTURA is not certified by the Registry of Interpreters for the Deaf (RID), the Indian Sign Language Research and Training Centre (ISLRTC), or any national medical/legal certification body.
- **High-Stakes Prohibition**: GESTURA must **never** be used as the sole medium of interpretation in:
  1. Medical diagnosis, informed consent procedures, or surgical briefings.
  2. Judicial courtroom depositions, police interrogations, or legal contract signing.
  3. Life-critical emergency dispatch without redundant verification.
- **Intended Use**: Everyday conversational interactions (e.g., pharmacy counters, hotel receptions, campus check-ins, transit inquiries, peer-to-peer discussions).

---

## 3. Algorithmic Bias, Inclusivity & Demographic Mitigation

| Axis of Variation | Algorithmic Risk | GESTURA Mitigation Architecture |
|---|---|---|
| **Skin Tone Diversity** | Vision landmark detectors can degrade on high-melanin skin (Fitzpatrick IV–VI) under poor contrast. | 1. Landmark coordinates are normalized relative to shoulder midpoint rather than raw color pixels.<br>2. First-run calibration check provides ambient illumination feedback.<br>3. Local in-app Recorder lets each user record personal gestures. |
| **Handedness** | Pre-trained models biased toward right-handed signers fail for left-handed signers. | Built-in **Mirror Transformation**: Inverting X-coordinates and swapping left/right hand channels allows left-handed signers to achieve equal recognition accuracy. |
| **Physical Stature & Age** | Differing arm lengths, torso heights, and seated vs standing postures. | Coordinate normalization translates origin to the midpoint between left and right shoulders, scaled by inter-shoulder Euclidean distance. |
| **Dialectal Variation** | Variations in vocabulary signs across regional communities. | Dynamic Vocabulary Editor and custom sign recorder allow users to add new signs without code. |

---

## 4. Privacy, Informed Consent & Data Governance

### Zero Video Recording Policy
Unlike typical computer vision systems that store uncompressed video recordings of signers' faces and bodies:
1. **Landmarks Only**: The app never writes MP4, AVI, or PNG camera frames to disk.
2. **Ephemeral Memory**: Video frames are processed in-memory via OffscreenCanvas Web Workers and immediately discarded after landmark coordinates are extracted.
3. **No Network Telemetry**: The entire application binds strictly to `127.0.0.1` and operates 100% offline. Zero telemetry, crash logs, or audio samples leave the machine.

### One-Click Privacy Data Wipe
Users retain absolute control over their local data:
- A single click on **"Full Data Wipe"** permanently deletes all SQLite database tables, session histories, utterances, and personalized landmark sequences.
