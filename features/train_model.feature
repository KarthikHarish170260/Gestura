Feature: Train sign recognition model offline
  As a user
  I want to trigger an offline training job
  So that the app updates its 1D-TCN model with my recorded gestures

  Scenario: Run one-click training and export ONNX models
    Given a dataset containing at least 30 samples per vocabulary sign
    When the user triggers one-click model training
    Then the trainer runs stratified cross-validation with early stopping
    And exports a float32 ONNX model and an int8 quantized ONNX model
    And generates a metrics summary with accuracy and macro-F1
