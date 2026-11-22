Feature: Low-confidence prediction rejection
  As a user
  I want ambiguous or low-confidence gestures rejected
  So that accidental hand fidgets do not trigger false speech

  Scenario: Filter out ambiguous gesture
    Given the sign boundary detector is tracking camera landmarks
    When a gesture produces top confidence of 0.50 below the 0.65 threshold
    Then the prediction is rejected as invalid
    And no sign is added to the active caption buffer
