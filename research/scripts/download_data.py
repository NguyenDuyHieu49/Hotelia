#!/usr/bin/env python3
"""
Download dataset for Hotel Recommendation research.
Supports Trivago RecSys Challenge 2019 and Expedia.
"""

import argparse
import os
import urllib.request
import zipfile
from pathlib import Path

# Dataset URLs
TRIVAGO_URL = "https://recsys2019data.trivago.com/train.csv.gz"
TRIVAGO_ITEM_URL = "https://recsys2019data.trivago.com/item_metadata.csv.gz"
EXPEDIA_URL = "https://www.kaggle.com/c/expedia-personalized-sort/data"

def download_file(url: str, dest: Path, expected_size_mb: int = None):
    """Download file with progress."""
    print(f"Downloading {url}...")
    print(f"Destination: {dest}")

    try:
        urllib.request.urlretrieve(url, dest)
        size_mb = dest.stat().st_size / (1024 * 1024)
        print(f"Downloaded: {size_mb:.1f} MB")

        if expected_size_mb and abs(size_mb - expected_size_mb) > expected_size_mb * 0.5:
            print(f"WARNING: File size significantly different from expected ({expected_size_mb} MB)")

    except Exception as e:
        print(f"ERROR: {e}")
        print("Try downloading manually from the dataset website.")
        return False

    return True

def extract_gzip(gz_file: Path, output_dir: Path):
    """Extract gzip file."""
    import gzip

    print(f"Extracting {gz_file.name}...")
    output_file = output_dir / gz_file.stem.replace('.train', '').replace('.item_metadata', 'item_metadata')

    with gzip.open(gz_file, 'rb') as f_in:
        with open(output_file, 'wb') as f_out:
            f_out.write(f_in.read())

    print(f"Extracted to: {output_file}")
    return output_file

def main():
    parser = argparse.ArgumentParser(description="Download recommendation dataset")
    parser.add_argument("--dataset", choices=["trivago", "expedia"], default="trivago",
                        help="Dataset to download")
    parser.add_argument("--raw-dir", default="data/raw",
                        help="Raw data directory")
    args = parser.parse_args()

    # Create directories
    raw_dir = Path(args.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)

    if args.dataset == "trivago":
        print("\n=== Trivago RecSys Challenge 2019 ===")
        print("Note: You may need to create an account and accept terms at:")
        print("https://recsys.trivago.cloud/")

        # Try downloading
        train_file = raw_dir / "train.csv.gz"
        item_file = raw_dir / "item_metadata.csv.gz"

        if download_file(TRIVAGO_URL, train_file, expected_size_mb=500):
            extract_gzip(train_file, raw_dir)

        if download_file(TRIVAGO_ITEM_URL, item_file, expected_size_mb=50):
            extract_gzip(item_file, raw_dir)

        print("\n=== Alternative: Zenodo Backup ===")
        print("If main source is unavailable, try:")
        print("https://zenodo.org/records/17202694")

    elif args.dataset == "expedia":
        print("\n=== Expedia Personalized Sort ===")
        print("Download from Kaggle:")
        print("https://www.kaggle.com/c/expedia-personalized-sort/data")
        print("\nOr use Kaggle CLI:")
        print("kaggle competitions download -c expedia-personalized-sort -p data/raw/expedia")

    print("\n=== After download ===")
    print("Run: python scripts/audit_data.py --dataset", args.dataset)

if __name__ == "__main__":
    main()
