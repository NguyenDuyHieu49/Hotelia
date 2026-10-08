# Hotel clickout ranking research

This directory trains a LightGBM ranker on the Trivago RecSys 2019 clickout
dataset. Each clickout is a query, and each listed hotel is a candidate. The
clicked hotel has relevance 1; the other candidates have relevance 0. Features
use only information known before that clickout.

The trained artifact is **not** used by Hotelia's API or mobile app. Trivago
item IDs do not identify Hotelia hotels, and several context features need a
matching Hotelia serving implementation before live ranking is possible.

## Local workflow

Place `train.csv`, `test.csv`, and `item_metadata.csv` in `data/raw/`.
The original ZIP archives supplied with the project can be extracted there.
Python dependencies are in `requirements.txt`.

```bash
cd research
python3 -m venv venv
venv/bin/python -m pip install -r requirements.txt

# Defaults to the first 100,000 action rows from each interaction file.
# The full item metadata catalog is loaded so candidate content features align.
venv/bin/python scripts/data_loader.py --sample-size 100000
venv/bin/python scripts/features.py
venv/bin/python scripts/baselines.py
venv/bin/python scripts/evaluate.py
venv/bin/python scripts/train_lgb.py
venv/bin/python -m pytest tests -q
```

To expand the pilot, raise `--sample-size` and regenerate features before
training. Keep enough memory and disk space for the expanded candidate table:
one clickout action can produce dozens of candidate rows. The final partial
session at the action cutoff should not be used to claim production performance.

## Data and evaluation

`features.py` creates `query_id`, `item_id`, `position`, candidate price,
the outcome label, and past-only session features. Malformed impression/price
lists are discarded. The trainer excludes queries without a clicked item and
queries with fewer than two candidates. It sorts candidates within each query
before passing group sizes to LightGBM.

`train_lgb.py` keeps the newest 15% of sessions from the training partition
for validation and evaluates once more on the later labeled queries in
`test_features.parquet`. It records MRR, Hit@K and NDCG against original
impression order in `data/models/B6-candidates_report.json`. The model and
feature importances are saved alongside the report. `baselines.py` and
`evaluate.py` separately compare original order, train-only city popularity,
and a content/context baseline on the labeled later partition.

The later partition also contains unlabeled queries. These are excluded from
offline metrics; the report records how many queries were excluded. Offline
clickout gains on Trivago do not establish better Hotelia bookings or
personalization. Hotelia now records served recommendation rows and detail
opens separately, but live outcome volume, feature parity, and catalog
validation are still required before the learned model can replace the current
rule-based recommendation service.

Dataset: [Trivago RecSys Challenge 2019](https://recsys.trivago.cloud/).
