Feature: Fingerspelling fallback for out-of-vocabulary words
  As a conversational partner
  I want out-of-vocabulary words spelled out using fingerspelling
  So that names and unique words can still be communicated accurately

  Scenario: Translate sentence containing an unknown name
    Given an out-of-vocabulary word "Zara" in spoken English
    When the text-to-gloss engine processes the sentence "My name is Zara"
    Then the word "name" is mapped to the sign "NAME"
    And "Zara" is decomposed into fingerspelling tokens "Z", "A", "R", "A"
    And each token is tagged with FINGERSPELL provenance
