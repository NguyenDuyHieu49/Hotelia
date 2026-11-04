    dump = model.booster_.dump_model(num_iteration=model.best_iteration_)
    artifact = {
        "version": report["version"],
        "feature_names": FEATURE_NAMES,
        "tree_info": dump["tree_info"],
        "objective": dump["objective"],
        "average_output": dump.get("average_output", False),
        "report": report,
        "parity_cases": [
            {"features": X[offsets[validation_end] + index].tolist(), "score": float(test_scores[index])}
            for index in range(5)
        ],
        "feature_parity_cases": feature_parity_cases(catalog),
    }
    research_output = root / "research/data/models/hotelia-lgbm-v3-report.json"
    serving_output = root / "backend/src/recommendations/models/hotelia-lgbm.active.json"
    research_output.parent.mkdir(parents=True, exist_ok=True)
    serving_output.parent.mkdir(parents=True, exist_ok=True)
    research_output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    serving_output.write_text(json.dumps(artifact, ensure_ascii=False, separators=(",", ":")) + "\n")
