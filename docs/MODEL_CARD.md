# GESTURA Sign Language Recognition Model Card

## Model Details
- **Architecture**: 1D Temporal Convolutional Network (1D-TCN) with Residual Connections
- **Input Dimension**: 32 time steps x 162 spatial features (42 hand landmarks + 12 pose landmarks)
- **Output Classes**: 41 classes (40 conversational signs + 1 UNKNOWN reject class)
- **Quantization**: ONNX Dynamic Int8 Quantization
- **Primary Runtime**: CPU-only onnxruntime-web via Web Worker

## Validation & Evaluation Results (K-Fold Cross-Validation, k=5)
- **Mean Accuracy**: 82.23% (+/- 2.71%)
- **Mean Macro-F1**: 0.7738 (+/- 0.0322)
- **Per-Fold Accuracies**: [86.06, 84.32, 79.09, 82.23, 79.44]

## Measured Latencies (CPU Benchmark)
- **Inference Latency (p50)**: 0.58 ms
- **Inference Latency (p95)**: 0.64 ms (Target <= 15 ms: **PASSED**)

## Ethical Considerations & Signer Variation
- **Closed Vocabulary**: The model is strictly bounded to the 40 conversational glosses and fingerspelling.
- **Normalization Invariance**: Shoulder-centered and width-scaled coordinates eliminate bias from camera distance and body stature.
- **Signer Handedness**: Built-in mirror augmentation supports left-handed signers seamlessly.
