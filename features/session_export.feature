Feature: Export conversation session history
  As a user
  I want to export my conversation transcripts in multiple formats
  So that I can archive or print records of important dialogues

  Scenario: Export dialogue session to JSON, TXT, and HTML
    Given a completed session with at least 2 utterances
    When the user requests export in "json" format
    Then a valid JSON document containing timestamps, glosses, and latencies is produced
    When the user requests export in "html" format
    Then a print-ready accessible HTML document is generated
