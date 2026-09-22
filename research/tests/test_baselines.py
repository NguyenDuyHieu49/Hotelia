"""Tests for Baseline Models."""

import pytest
from pathlib import Path
import polars as pl

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from baselines import (
    BaselineB0, BaselineB1, BaselineB2, BaselineRunner, BaselineConfig
)


@pytest.fixture
def data_dir():
    """Data directory with feature files."""
    return Path(__file__).parent.parent / "data" / "features"


@pytest.fixture
def temp_output():
    """Temporary output directory."""
    import tempfile
    import shutil
    tmp = tempfile.mkdtemp()
    yield Path(tmp)
    shutil.rmtree(tmp)


@pytest.fixture
def config(data_dir, temp_output):
    """Test configuration."""
    return BaselineConfig(
        data_dir=data_dir,
        output_dir=temp_output,
    )


@pytest.fixture
def runner(config):
    """BaselineRunner instance."""
    return BaselineRunner(config)


class TestBaselineB0:
    """Tests for B0 (Impression Order)."""

    def test_predict(self):
        """Test B0 prediction."""
        # Create sample data
        df = pl.DataFrame({
            "session_id": ["s1", "s1", "s2", "s2"],
            "reference": ["item1", "item2", "item3", "item4"],
            "step": [1, 2, 1, 2],
            "action_type": ["clickout item"] * 4,
        })

        model = BaselineB0()
        result = model.predict(df)

        assert "score" in result.columns
        assert len(result) == 4

    def test_score_range(self):
        """Test B0 score is between 0 and 1."""
        df = pl.DataFrame({
            "session_id": ["s1"] * 3,
            "reference": ["a", "b", "c"],
            "step": [1, 2, 3],
            "action_type": ["clickout item"] * 3,
        })

        model = BaselineB0()
        result = model.predict(df)

        assert result["score"].min() >= 0
        assert result["score"].max() <= 1


class TestBaselineB1:
    """Tests for B1 (City Popularity)."""

    def test_fit_predict(self):
        """Test B1 fit and predict."""
        # Create sample data with known popularity
        df = pl.DataFrame({
            "session_id": ["s1", "s2", "s3"],
            "city": ["NYC", "NYC", "LA"],
            "reference": ["item1", "item1", "item2"],
            "action_type": ["clickout item"] * 3,
        })

        model = BaselineB1()
        model.fit(df)

        # item1 should be more popular in NYC
        assert model._get_score("item1", "NYC") > model._get_score("item2", "NYC")
        # item2 should be more popular in LA
        assert model._get_score("item2", "LA") > model._get_score("item1", "LA")

    def test_unknown_city(self):
        """Test handling unknown city."""
        df = pl.DataFrame({
            "session_id": ["s1"],
            "city": ["NYC"],
            "reference": ["item1"],
            "action_type": ["clickout item"],
        })

        model = BaselineB1()
        model.fit(df)

        # Unknown city should return 0
        assert model._get_score("item1", "UNKNOWN") == 0.0


class TestBaselineB2:
    """Tests for B2 (Content + Context)."""

    def test_fit_predict(self):
        """Test B2 fit and predict."""
        df = pl.DataFrame({
            "session_id": ["s1", "s2"],
            "city": ["NYC", "NYC"],
            "reference": ["item1", "item2"],
            "action_type": ["clickout item"] * 2,
            "amenity_count": [10, 5],
        })

        model = BaselineB2()
        model.fit(df)

        # Should have computed scores
        assert len(model.city_item_scores["NYC"]) == 2

    def test_unknown_city(self):
        """Test handling unknown city."""
        df = pl.DataFrame({
            "session_id": ["s1"],
            "city": ["NYC"],
            "reference": ["item1"],
            "action_type": ["clickout item"],
            "amenity_count": [10],  # Add required column
        })

        model = BaselineB2()
        model.fit(df)

        assert model._get_score("item1", "UNKNOWN") == 0.0


class TestBaselineRunner:
    """Tests for BaselineRunner."""

    def test_load_data(self, runner):
        """Test data loading."""
        train, test = runner.load_data()

        assert isinstance(train, pl.DataFrame)
        assert isinstance(test, pl.DataFrame)
        assert len(train) > 0
        assert len(test) > 0

    def test_run_baseline_b0(self, runner):
        """Test running B0."""
        train, test = runner.load_data()
        result = runner.run_baseline_b0(test)

        assert "score" in result.columns
        assert len(result) > 0

    def test_run_baseline_b1(self, runner):
        """Test running B1."""
        train, test = runner.load_data()
        result = runner.run_baseline_b1(train)

        assert "score" in result.columns

    def test_run_all(self, runner):
        """Test running all baselines."""
        results = runner.run_all()

        assert "B0" in results
        assert "B1" in results
        assert "B2" in results

        for name, df in results.items():
            assert "score" in df.columns


class TestBaselineIntegration:
    """Integration tests."""

    def test_full_pipeline(self, runner, temp_output):
        """Test full baseline pipeline."""
        results = runner.run_all()
        runner.save_results(results)

        # Check all files saved
        for name in ["B0", "B1", "B2"]:
            assert (temp_output / f"baseline_{name}.parquet").exists()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
