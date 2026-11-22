"""PyTorch 1D Temporal Convolutional Network (TCN) for sign recognition."""

import torch
import torch.nn as nn


class TemporalResidualBlock(nn.Module):
    """Residual 1D convolutional block with batch normalization and dropout."""

    def __init__(
        self, in_channels: int, out_channels: int, kernel_size: int = 3, dropout: float = 0.2
    ) -> None:
        super().__init__()
        padding = kernel_size // 2
        self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size=kernel_size, padding=padding)
        self.bn1 = nn.BatchNorm1d(out_channels)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(dropout)
        self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size=kernel_size, padding=padding)
        self.bn2 = nn.BatchNorm1d(out_channels)

        self.residual: nn.Module
        if in_channels != out_channels:
            self.residual = nn.Sequential(
                nn.Conv1d(in_channels, out_channels, kernel_size=1),
                nn.BatchNorm1d(out_channels),
            )
        else:
            self.residual = nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        res = self.residual(x)
        out = self.conv1(x)
        out = self.bn1(out)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.conv2(out)
        out = self.bn2(out)
        result: torch.Tensor = self.relu(out + res)
        return result


class SignRecognizerTCN(nn.Module):
    """Temporal Convolutional Network processing (batch, 32, 162) landmark sequences."""

    def __init__(
        self,
        input_dim: int = 162,
        num_classes: int = 41,
        hidden_dim: int = 64,
        dropout: float = 0.25,
    ) -> None:
        super().__init__()
        self.input_proj = nn.Sequential(
            nn.Conv1d(input_dim, hidden_dim, kernel_size=1),
            nn.BatchNorm1d(hidden_dim),
            nn.ReLU(),
        )

        self.block1 = TemporalResidualBlock(hidden_dim, hidden_dim, kernel_size=3, dropout=dropout)
        self.block2 = TemporalResidualBlock(
            hidden_dim, hidden_dim * 2, kernel_size=3, dropout=dropout
        )
        self.block3 = TemporalResidualBlock(
            hidden_dim * 2, hidden_dim * 2, kernel_size=3, dropout=dropout
        )

        self.global_pool = nn.AdaptiveAvgPool1d(1)

        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 64),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(64, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass. Expects x of shape (batch_size, time=32, channels=162)."""
        # Transpose to (batch_size, channels=162, time=32) for Conv1d
        x_trans = x.transpose(1, 2)
        h = self.input_proj(x_trans)
        h = self.block1(h)
        h = self.block2(h)
        h = self.block3(h)

        # Global average pool over time dimension -> (batch_size, channels)
        pooled = self.global_pool(h).squeeze(-1)
        logits: torch.Tensor = self.classifier(pooled)
        return logits
