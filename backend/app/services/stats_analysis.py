"""Statistical analysis of replay data.

Provides:
- Success rate by army composition x base layout pattern
- Improvement trend tracking over time
- Overall performance summary
"""

from collections import defaultdict


def analyze_stats(replays: list[dict]) -> dict:
    """Generate comprehensive statistics from replay data."""
    if not replays:
        return {
            "total_attacks": 0,
            "overall_stats": {},
            "by_composition": {},
            "by_layout": {},
            "composition_layout_matrix": {},
            "trend": [],
        }

    total = len(replays)
    total_stars = sum(r["stars"] for r in replays)
    total_destruction = sum(r["destruction_percentage"] for r in replays)
    three_stars = sum(1 for r in replays if r["stars"] == 3)

    overall = {
        "total_attacks": total,
        "average_stars": round(total_stars / total, 2),
        "average_destruction": round(total_destruction / total, 1),
        "three_star_rate": round(three_stars / total * 100, 1),
    }

    # Stats by army composition
    by_comp: dict[str, list[dict]] = defaultdict(list)
    for r in replays:
        comp = r.get("army_composition", "unknown")
        if comp:
            by_comp[comp].append(r)

    comp_stats = {}
    for comp, attacks in by_comp.items():
        n = len(attacks)
        stars = sum(a["stars"] for a in attacks)
        dest = sum(a["destruction_percentage"] for a in attacks)
        ts = sum(1 for a in attacks if a["stars"] == 3)
        comp_stats[comp] = {
            "attacks": n,
            "average_stars": round(stars / n, 2),
            "average_destruction": round(dest / n, 1),
            "three_star_rate": round(ts / n * 100, 1),
        }

    # Stats by base layout
    by_layout: dict[str, list[dict]] = defaultdict(list)
    for r in replays:
        layout = r.get("base_layout", "unknown")
        if layout:
            by_layout[layout].append(r)

    layout_stats = {}
    for layout, attacks in by_layout.items():
        n = len(attacks)
        stars = sum(a["stars"] for a in attacks)
        dest = sum(a["destruction_percentage"] for a in attacks)
        ts = sum(1 for a in attacks if a["stars"] == 3)
        layout_stats[layout] = {
            "attacks": n,
            "average_stars": round(stars / n, 2),
            "average_destruction": round(dest / n, 1),
            "three_star_rate": round(ts / n * 100, 1),
        }

    # Cross-analysis: composition x layout
    matrix: dict[str, dict[str, dict]] = {}
    for comp, comp_attacks in by_comp.items():
        matrix[comp] = {}
        layout_groups: dict[str, list[dict]] = defaultdict(list)
        for a in comp_attacks:
            layout = a.get("base_layout", "unknown")
            if layout:
                layout_groups[layout].append(a)

        for layout, attacks in layout_groups.items():
            n = len(attacks)
            stars = sum(a["stars"] for a in attacks)
            ts = sum(1 for a in attacks if a["stars"] == 3)
            matrix[comp][layout] = {
                "attacks": n,
                "average_stars": round(stars / n, 2),
                "three_star_rate": round(ts / n * 100, 1),
            }

    # Trend: improvement over time (rolling window of 5)
    sorted_replays = sorted(replays, key=lambda r: r.get("timestamp", ""))
    trend = []
    window = 5
    for i in range(len(sorted_replays)):
        start = max(0, i - window + 1)
        window_replays = sorted_replays[start:i + 1]
        n = len(window_replays)
        avg_stars = sum(r["stars"] for r in window_replays) / n
        avg_dest = sum(r["destruction_percentage"] for r in window_replays) / n
        trend.append({
            "attack_number": i + 1,
            "timestamp": sorted_replays[i].get("timestamp", ""),
            "stars": sorted_replays[i]["stars"],
            "rolling_avg_stars": round(avg_stars, 2),
            "rolling_avg_destruction": round(avg_dest, 1),
        })

    return {
        "total_attacks": total,
        "overall_stats": overall,
        "by_composition": comp_stats,
        "by_layout": layout_stats,
        "composition_layout_matrix": matrix,
        "trend": trend,
    }
