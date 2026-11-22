Feature: Record a new sign sample
  As a signer
  I want to record landmark samples of my signing
  So that the app can personalize recognition to my body stature and style

  Scenario: Successfully capture 32 landmark frames for a vocabulary sign
    Given the user is on the "Recorder & Train" screen
    And the user selects vocabulary sign "HELLO"
    When the user triggers the sample recording countdown
    Then 32 frames of normalized landmarks are captured
    And the recorded sample count for "HELLO" increases by 1
    And raw camera video is never saved to disk
