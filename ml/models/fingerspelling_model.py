"""Lightweight classifier for 36 fingerspelling letters and digits."""

import torch
import torch.nn as nn


class FingerspellingClassifier(nn.Module):
    """Classifier operating on 21 hand landmarks (63 features) for A-Z, 0-9."""

    def __init__(self, input_dim: int = 63, num_classes: int = 37, hidden_dim: int = 64) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass for hand pose coordinates."""
        logits: torch.Tensor = self.network(x)
        return logits
