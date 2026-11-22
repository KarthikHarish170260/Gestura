Feature: One-click privacy data wipe
  As a privacy-conscious user
  I want to permanently erase all conversation sessions and saved landmarks
  So that no confidential conversation traces remain on the machine

  Scenario: Execute one-click privacy data wipe
    Given existing conversation sessions stored in the SQLite database
    When the user confirms the "Full Data Wipe" action
    Then all session records and utterances are permanently deleted
    And the active session counter is reset to 0
    And the session history list becomes empty
