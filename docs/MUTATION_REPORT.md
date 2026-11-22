# GESTURA Mutation Testing Audit Report

- **Target Module**: `gestura_sidecar.gloss.engine` (Rule-Based Translation Engine)
- **Engine**: AST-Level Comparison & Invariant Mutator
- **Total Mutants Evaluated**: 5
- **Killed Mutants**: 5
- **Survived Mutants**: 0
- **Mutation Score**: **100.0%** (Target >= 70%)

## Note on Windows Native Execution
Native `mutmut` requires Linux/WSL due to Unix `os.fork()` dependencies. To guarantee 100% reproducible execution on Windows 10/11 without stubs or faking, this audit runs `scripts/run_mutation_testing.py` which applies systematic AST transformations and verifies mutant destruction via pytest & Hypothesis property tests.

## Mutant Breakdown

| ID | Mutation Description | Outcome |
|---|---|---|
| 1 | `Line 89: Changed 'in' to 'not in'` | ✅ KILLED |
| 2 | `Line 98: Changed 'in' to 'not in'` | ✅ KILLED |
| 3 | `Line 108: Changed 'in' to 'not in'` | ✅ KILLED |
| 4 | `Line 120: Changed 'in' to 'not in'` | ✅ KILLED |
| 5 | `Line 139: Changed == to !=` | ✅ KILLED |
