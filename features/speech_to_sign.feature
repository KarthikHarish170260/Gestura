Feature: Speech to sign avatar translation
  As a hearing partner
  I want my spoken English converted into sign glosses and animated on screen
  So that the Deaf signer can read and watch the signs in real time

  Scenario: Hearing partner speaks an English sentence
    Given the microphone is capturing audio at 16 kHz
    When the hearing partner says "Where is your home?"
    Then the speech-to-text engine transcribes the audio
    And the rule-based engine translates the sentence into sign glosses
    And the skeleton avatar animates the gloss sequence at 60 fps
