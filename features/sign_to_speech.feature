Feature: Sign to speech translation
  As a Deaf user
  I want my signs recognized, built into a sentence, and spoken aloud
  So that my hearing conversational partner can hear me

  Scenario: Signer performs signs and dispatches speech synthesis
    Given the camera is capturing at 30 fps
    When the signer performs the signs "HELLO" and "DOCTOR"
    Then the signs are recognized and deduplicated in the caption buffer
    And the user confirms the pending caption
    Then the text-to-speech engine synthesizes "HELLO DOCTOR"
    And the turn is recorded in the shared conversation transcript
