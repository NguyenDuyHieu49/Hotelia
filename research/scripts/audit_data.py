#!/usr/bin/env python3
"""
Data audit script for Trivago/Expedia datasets.
Performs basic statistics and data quality checks.
"""

import argparse
import json
from pathlib import Path
import pandas as pd
import polars as pl
from datetime import datetime

def audit_trivago(data_dir: Path, output_dir: Path):
    """Audit Trivago RecSys Challenge 2019 dataset."""
    print("\n=== Trivago Data Audit ===\n")

    train_file = data_dir / "train.csv"
    item_file = data_dir / "item_metadata.csv"

    if not train_file.exists():
        print(f"ERROR: {train_file} not found!")
        print("Run: python scripts/download_data.py --dataset trivago")
        return

    # Load sample for quick analysis
    print("Loading data (sample)...")
    df = pd.read_csv(train_file, nrows=1_000_000)

    print(f"Sample rows: {len(df):,}")
    print(f"Columns: {list(df.columns)}")

    # Basic statistics
    audit_results = {
        "dataset": "trivago",
        "audit_date": datetime.now().isoformat(),
        "sample_size": len(df),
        "total_columns": len(df.columns),
        "columns": list(df.columns),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
    }

    # User/Session stats
    audit_results["unique_users"] = int(df['user_id'].nunique()) if 'user_id' in df.columns else "N/A"
    audit_results["unique_sessions"] = int(df['session_id'].nunique()) if 'session_id' in df.columns else "N/A"
    audit_results["unique_items"] = int(df['item_id'].nunique()) if 'item_id' in df.columns else "N/A"

    # Calculate sparsity (if applicable)
    if 'user_id' in df.columns and 'item_id' in df.columns:
        n_users = df['user_id'].nunique()
        n_items = df['item_id'].nunique()
        n_interactions = len(df)
        sparsity = 1 - (n_interactions / (n_users * n_items))
        audit_results["sparsity"] = round(sparsity, 4)

    print("\n=== Basic Stats ===")
    print(f"Unique users: {audit_results.get('unique_users', 'N/A')}")
    print(f"Unique sessions: {audit_results.get('unique_sessions', 'N/A')}")
    print(f"Unique items: {audit_results.get('unique_items', 'N/A')}")
    print(f"Sparsity: {audit_results.get('sparsity', 'N/A')}")

    # Save audit results
    output_dir.mkdir(parents=True, exist_ok=True)
    audit_file = output_dir / "trivago_audit.json"
    with open(audit_file, 'w') as f:
        json.dump(audit_results, f, indent=2)

    print(f"\nAudit results saved to: {audit_file}")

    return audit_results

def audit_expedia(data_dir: Path, output_dir: Path):
    """Audit Expedia Personalized Sort dataset."""
    print("\n=== Expedia Data Audit ===\n")

    train_file = data_dir / "train.csv"

    if not train_file.exists():
        print(f"ERROR: {train_file} not found!")
        print("Run: python scripts/download_data.py --dataset expedia")
        return

    print("Loading data (sample)...")
    df = pd.read_csv(train_file, nrows=1_000_000)

    print(f"Sample rows: {len(df):,}")
    print(f"Columns: {list(df.columns)}")

    audit_results = {
        "dataset": "expedia",
        "audit_date": datetime.now().isoformat(),
        "sample_size": len(df),
        "columns": list(df.columns),
    }

    # Key fields
    if 'srch_id' in df.columns:
        audit_results["unique_queries"] = int(df['srch_id'].nunique())
        print(f"Unique search queries: {audit_results['unique_queries']:,}")

    if 'prop_id' in df.columns:
        audit_results["unique_properties"] = int(df['prop_id'].nunique())
        print(f"Unique properties: {audit_results['unique_properties']:,}")

    # Save
    output_dir.mkdir(parents=True, exist_ok=True)
    audit_file = output_dir / "expedia_audit.json"
    with open(audit_file, 'w') as f:
        json.dump(audit_results, f, indent=2)

    print(f"\nAudit results saved to: {audit_file}")

    return audit_results

def main():
    parser = argparse.ArgumentParser(description="Audit recommendation dataset")
    parser.add_argument("--dataset", choices=["trivago", "expedia"], default="trivago")
    parser.add_argument("--data-dir", default="data/raw")
    parser.add_argument("--output-dir", default="data-audit")
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)

    if args.dataset == "trivago":
        audit_trivago(data_dir, output_dir)
    else:
        audit_expedia(data_dir, output_dir)

    print("\n=== Audit Complete ===")

if __name__ == "__main__":
    main()
