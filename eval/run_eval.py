#!/usr/bin/env python3
"""TemplaFill Evaluation Runner — Task 4.2.

Computes per-field precision/recall/F1/hallucination/not-found accuracy
per eval/datasets/ ground truth.

Usage:
    python eval/run_eval.py --dataset eval/datasets --output eval/results

Outputs a JSON file and a pretty table per EVAL.md.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import time
import sys
import datetime

# Ensure backend is importable when run from project root
ROOT = pathlib.Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.services.extraction import extract_pdf
from app.services.rag.chunker import chunk_document
from app.services.rag.embedder import get_embedder
from app.services.rag.vector_store import InMemoryVectorStore, StoredChunk
from app.services.rag.retriever import Retriever
from app.services.mapping.parser import parse_template_bytes
from app.services.generation.extractor import get_extractor


def _normalize_value(v: str | None) -> str | None:
    if v is None:
        return None
    # Strip, collapse whitespace, lower for case-insensitive compare
    # Keep currency symbols etc. but normalize spaces
    norm = " ".join(str(v).strip().split())
    # For exact fields like names/IDs, lowercasing is OK; for case-sensitive we also compare lower
    return norm.lower() if norm else None


def _is_correct(expected: str | None, extracted: str | None) -> bool:
    """Whether extracted is correct vs expected (exact after normalization)."""
    exp_norm = _normalize_value(expected)
    ext_norm = _normalize_value(extracted)
    if exp_norm is None and ext_norm is None:
        return True  # both null -> correct (not-found)
    if exp_norm is None or ext_norm is None:
        return False
    return exp_norm == ext_norm


def _is_hallucination(expected: str | None, extracted: str | None, source_text: str) -> bool:
    """Hallucination if extracted not null but expected null, or extracted not in source."""
    ext_norm = _normalize_value(extracted)
    if ext_norm is None:
        return False  # no extraction -> not hallucination
    exp_norm = _normalize_value(expected)
    if exp_norm is None:
        # Expected null but extracted something -> hallucination unless it's in source (but expected null means not in source)
        # If extracted value appears in source document, it might be a false positive but still hallucination
        # For strict definition, any non-null when expected null is hallucination
        return True
    # Expected exists but extracted mismatched and not in source -> hallucination
    if ext_norm != exp_norm:
        # Check if extracted appears anywhere in source
        src_norm = _normalize_value(source_text) or ""
        if ext_norm not in src_norm:
            return True
        # If extracted is in source but wrong field, it's still incorrect but not necessarily hallucination?
        # For MVP we count as incorrect (precision) but not hallucination if it's in source
        return False
    return False


async def evaluate_dataset(dataset_dir: pathlib.Path) -> dict:
    """Evaluate single dataset directory containing ground_truth_01.json, source pdf, template."""
    # Find ground truth
    gt_files = list(dataset_dir.glob("ground_truth*.json"))
    if not gt_files:
        return {"dataset_id": dataset_dir.name, "error": "no ground truth found", "status": "error"}
    gt_path = gt_files[0]
    gt = json.loads(gt_path.read_text())

    dataset_id = gt.get("dataset_id", dataset_dir.name)
    source_file = gt.get("source_file")
    template_file = gt.get("template_file")
    fields_gt = gt.get("fields", [])

    source_path = dataset_dir / source_file
    template_path = dataset_dir / template_file

    if not source_path.exists():
        return {"dataset_id": dataset_id, "error": f"source not found: {source_path}", "status": "error"}
    if not template_path.exists():
        return {"dataset_id": dataset_id, "error": f"template not found: {template_path}", "status": "error"}

    start = time.monotonic()

    # Load bytes
    source_bytes = source_path.read_bytes()
    template_bytes = template_path.read_bytes()

    # Pipeline
    try:
        doc = extract_pdf(source_bytes, filename=source_file)
        source_text = doc.full_text
    except Exception as e:  # noqa: BLE001
        return {"dataset_id": dataset_id, "error": f"extract_pdf failed: {e}", "status": "error"}

    try:
        chunks = chunk_document(doc)
        if not chunks:
            return {"dataset_id": dataset_id, "error": "no chunks", "status": "error"}
        embedder = get_embedder(force_fake=True)
        store = InMemoryVectorStore()
        texts = [c.text for c in chunks]
        embeddings = await embedder.embed_texts(texts)
        stored = []
        for c, emb in zip(chunks, embeddings):
            stored.append(StoredChunk(chunk_id=c.chunk_id, text=c.text, embedding=emb, page_number=c.page_number, header=c.header))
        await store.add(stored)
        parsed = parse_template_bytes(template_bytes, template_file)
    except Exception as e:  # noqa: BLE001
        return {"dataset_id": dataset_id, "error": f"chunk/embed/parse failed: {e}", "status": "error"}

    # Placeholder detection rate
    placeholder_detection_rate = len(parsed.fields) / len(fields_gt) if fields_gt else 0
    placeholders_ok = placeholder_detection_rate >= 0.95

    # For each ground truth field: retrieve + extract
    retriever = Retriever(vector_store=store, embedder=embedder)
    extractor = get_extractor(force_fake=True)

    per_field_results = []
    correct = 0
    attempted = 0  # total extractions where system returned non-null
    present_total = sum(1 for f in fields_gt if f.get("is_present_in_source"))
    hallucinated = 0
    absent_total = sum(1 for f in fields_gt if not f.get("is_present_in_source"))
    correct_absent = 0
    total_fields = len(fields_gt)

    for field_gt in fields_gt:
        field_name = field_gt["field_name"]
        expected = field_gt.get("expected_value")
        is_present = field_gt.get("is_present_in_source", expected is not None)

        # Retrieve relevant chunks
        try:
            retrieved = await retriever.retrieve_for_field(field_name, top_k=5)
            chunk_texts = [r.chunk.text for r in retrieved] if retrieved else [c.text for c in chunks[:5]]
            source_pages = [r.chunk.page_number for r in retrieved] if retrieved else [1]
        except Exception:  # noqa: BLE001
            chunk_texts = [c.text for c in chunks[:5]]
            source_pages = [1]

        try:
            ext_res = await extractor.extract(field_name, chunk_texts, field_description="", source_pages=source_pages)
            extracted = ext_res.extracted_value
            # Track attempted
            if extracted is not None:
                attempted += 1
                if _is_hallucination(expected, extracted, source_text):
                    hallucinated += 1
            # Correctness
            if _is_correct(expected, extracted):
                correct += 1
                if not is_present and extracted is None:
                    correct_absent += 1
            else:
                # If expected absent and extracted null, already counted as correct above via _is_correct?
                # But for hallucination we already counted; for not-found accuracy we need correct_absent handled
                pass
            per_field_results.append({
                "field_name": field_name,
                "placeholder": field_gt.get("placeholder"),
                "expected": expected,
                "extracted": extracted,
                "is_correct": _is_correct(expected, extracted),
                "is_present": is_present,
                "is_hallucination": _is_hallucination(expected, extracted, source_text),
                "confidence": ext_res.confidence if ext_res else 0,
                "source_page": ext_res.source_page if ext_res else None,
            })
        except Exception as e:  # noqa: BLE001
            per_field_results.append({"field_name": field_name, "error": str(e), "is_correct": False})
            # No attempted increment since failed

    elapsed = time.monotonic() - start

    # Metrics per EVAL.md
    # Precision: correct extractions / total extractions attempted (non-null returned)
    # But if attempted ==0, precision is 1 if no hallucination? we define as 1 if no attempted
    if attempted > 0:
        # correct among attempted: count where extracted non-null and correct
        correct_attempted = sum(1 for r in per_field_results if r.get("extracted") is not None and r.get("is_correct"))
        precision = correct_attempted / attempted
    else:
        # No attempted extractions: if all absent correctly, precision 1 else 0?
        precision = 1.0 if all(not r.get("is_present") for r in per_field_results) else 0.0

    # Recall: correct / total present
    present_correct = sum(1 for r in per_field_results if r.get("is_present") and r.get("is_correct"))
    recall = present_correct / present_total if present_total > 0 else 1.0

    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    hallucination_rate = hallucinated / attempted if attempted > 0 else 0.0
    not_found_accuracy = correct_absent / absent_total if absent_total > 0 else 1.0

    # Overall correct across all fields
    overall_correct = sum(1 for r in per_field_results if r.get("is_correct"))
    overall_accuracy = overall_correct / total_fields if total_fields else 0

    return {
        "dataset_id": dataset_id,
        "status": "ok",
        "elapsed_seconds": round(elapsed, 2),
        "total_fields": total_fields,
        "present_total": present_total,
        "absent_total": absent_total,
        "attempted": attempted,
        "correct": correct,
        "present_correct": present_correct,
        "correct_absent": correct_absent,
        "hallucinated": hallucinated,
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
        "hallucination_rate": round(hallucination_rate, 3),
        "not_found_accuracy": round(not_found_accuracy, 3),
        "overall_accuracy": round(overall_accuracy, 3),
        "placeholder_detection_rate": round(placeholder_detection_rate, 3),
        "placeholders_ok": placeholders_ok,
        "per_field": per_field_results,
    }


async def evaluate_all(datasets_root: pathlib.Path):
    dataset_dirs = [p for p in datasets_root.iterdir() if p.is_dir()]
    results = []
    for d in sorted(dataset_dirs):
        print(f"Evaluating {d.name} ...")
        res = await evaluate_dataset(d)
        results.append(res)
        if res.get("status") == "ok":
            print(f"  {res['dataset_id']}: P={res['precision']} R={res['recall']} F1={res['f1']} Hallu={res['hallucination_rate']}")
        else:
            print(f"  {res['dataset_id']}: ERROR {res.get('error')}")

    # Aggregate overall
    ok_results = [r for r in results if r.get("status") == "ok"]
    if ok_results:
        avg_precision = sum(r["precision"] for r in ok_results) / len(ok_results)
        avg_recall = sum(r["recall"] for r in ok_results) / len(ok_results)
        avg_f1 = sum(r["f1"] for r in ok_results) / len(ok_results)
        avg_hallu = sum(r["hallucination_rate"] for r in ok_results) / len(ok_results)
        avg_notfound = sum(r["not_found_accuracy"] for r in ok_results) / len(ok_results)
        avg_placeholder = sum(r["placeholder_detection_rate"] for r in ok_results) / len(ok_results)
        total_elapsed = sum(r["elapsed_seconds"] for r in ok_results)
    else:
        avg_precision = avg_recall = avg_f1 = avg_hallu = avg_notfound = avg_placeholder = total_elapsed = 0

    overall = {
        "avg_precision": round(avg_precision, 3),
        "avg_recall": round(avg_recall, 3),
        "avg_f1": round(avg_f1, 3),
        "avg_hallucination_rate": round(avg_hallu, 3),
        "avg_not_found_accuracy": round(avg_notfound, 3),
        "avg_placeholder_detection_rate": round(avg_placeholder, 3),
        "total_elapsed_seconds": round(total_elapsed, 2),
        "total_datasets": len(ok_results),
    }

    # Targets per EVAL.md
    targets = {"precision": 0.90, "recall": 0.85, "f1": 0.87, "hallucination_rate": 0.02, "not_found_accuracy": 0.95, "placeholder_detection_rate": 0.95}
    # Check pass
    status = {
        "precision": "PASS" if overall["avg_precision"] >= targets["precision"] else "FAIL",
        "recall": "PASS" if overall["avg_recall"] >= targets["recall"] else "FAIL",
        "f1": "PASS" if overall["avg_f1"] >= targets["f1"] else "FAIL",
        "hallucination_rate": "PASS" if overall["avg_hallucination_rate"] <= targets["hallucination_rate"] else "FAIL",
        "not_found_accuracy": "PASS" if overall["avg_not_found_accuracy"] >= targets["not_found_accuracy"] else "FAIL",
        "placeholder_detection_rate": "PASS" if overall["avg_placeholder_detection_rate"] >= targets["placeholder_detection_rate"] else "FAIL",
    }
    overall_status = "PASS" if all(s == "PASS" for s in status.values()) else "FAIL"

    return results, overall, status, overall_status


def print_report(results, overall, status, overall_status):
    print("\n" + "=" * 65)
    print(" TemplaFill Evaluation Report")
    print(f" Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f" Total datasets: {overall['total_datasets']}")
    print("=" * 65)
    # Table header
    print(f"{'Dataset':<15} {'Precision':>9} {'Recall':>7} {'F1':>6} {'Hallu':>7} {'NotFnd':>7}")
    print("-" * 65)
    for r in results:
        if r.get("status") != "ok":
            print(f"{r['dataset_id']:<15} {'ERROR':>9} {r.get('error','')[:30]}")
            continue
        print(f"{r['dataset_id']:<15} {r['precision']:>9.2f} {r['recall']:>7.2f} {r['f1']:>6.2f} {r['hallucination_rate']:>7.2f} {r['not_found_accuracy']:>7.2f}")
    print("-" * 65)
    print(f"{'OVERALL':<15} {overall['avg_precision']:>9.2f} {overall['avg_recall']:>7.2f} {overall['avg_f1']:>6.2f} {overall['avg_hallucination_rate']:>7.2f} {overall['avg_not_found_accuracy']:>7.2f}")
    print(f"{'TARGET':<15} {'>=0.90':>9} {'>=0.85':>7} {'>=0.87':>6} {'<=0.02':>7} {'>=0.95':>7}")
    status_line = f"{'STATUS':<15} {status['precision']:>9} {status['recall']:>7} {status['f1']:>6} {status['hallucination_rate']:>7} {status['not_found_accuracy']:>7}"
    # Add check marks
    print(status_line)
    print(f" Placeholder detection avg: {overall['avg_placeholder_detection_rate']:.2f} (target >=0.95) -> {status['placeholder_detection_rate']}")
    print(f" Total time: {overall['total_elapsed_seconds']}s")
    print(f" Overall: {overall_status}")
    print("=" * 65)


def main():
    parser = argparse.ArgumentParser(description="TemplaFill eval runner")
    parser.add_argument("--dataset", default="eval/datasets", help="Path to datasets root")
    parser.add_argument("--output", default="eval/results", help="Path to output dir")
    args = parser.parse_args()

    datasets_root = pathlib.Path(args.dataset)
    output_dir = pathlib.Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not datasets_root.exists():
        print(f"Datasets root not found: {datasets_root}")
        sys.exit(1)

    import asyncio

    results, overall, status, overall_status = asyncio.run(evaluate_all(datasets_root))
    print_report(results, overall, status, overall_status)

    # Save JSON
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    out_path = output_dir / f"eval_run_{timestamp}.json"
    payload = {
        "timestamp": datetime.datetime.now().isoformat(),
        "total_datasets": overall["total_datasets"],
        "overall": overall,
        "status_per_metric": status,
        "overall_status": overall_status,
        "targets": {"precision": 0.90, "recall": 0.85, "f1": 0.87, "hallucination_rate": 0.02, "not_found_accuracy": 0.95, "placeholder_detection_rate": 0.95},
        "datasets": results,
    }
    out_path.write_text(json.dumps(payload, indent=2))
    print(f"\nResults saved to {out_path}")

    # Exit code 0 if pass, 1 if fail (useful for CI)
    sys.exit(0 if overall_status == "PASS" else 1)


if __name__ == "__main__":
    main()
