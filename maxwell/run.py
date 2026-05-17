"""Animated viewer: particles on the left, speed histogram + theory on the right.

Run with:
    python run.py                  # default parameters
    python run.py --N 300 --L 12   # custom
    python run.py --save out.gif --frames 400 --no-show
"""

from __future__ import annotations

import argparse

import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.animation import FuncAnimation

from simulator import HardDiskGas2D


def maxwell_2d(v: np.ndarray, kT: float, m: float = 1.0) -> np.ndarray:
    """2D Maxwell-Boltzmann speed PDF."""
    return (m * v / kT) * np.exp(-m * v ** 2 / (2.0 * kT))


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--N", type=int, default=200, help="number of particles")
    p.add_argument("--L", type=float, default=10.0, help="box side length")
    p.add_argument("--R", type=float, default=0.15, help="particle radius")
    p.add_argument("--speed", type=float, default=1.0, help="initial speed (all particles)")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--dt", type=float, default=0.05, help="simulation time per animation frame")
    p.add_argument("--frames", type=int, default=1000)
    p.add_argument("--save", type=str, default=None, help="save animation (e.g. maxwell.gif / maxwell.mp4)")
    p.add_argument("--no-show", action="store_true")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    gas = HardDiskGas2D(
        N=args.N, L=args.L, R=args.R, m=1.0, speed=args.speed, seed=args.seed
    )

    kT = gas.kT()  # constant throughout: energy is conserved
    v_max = max(3.0 * args.speed, 3.5 * np.sqrt(kT))
    bins = np.linspace(0.0, v_max, 50)
    bin_centers = 0.5 * (bins[1:] + bins[:-1])
    bin_width = bins[1] - bins[0]

    fig, (ax_box, ax_hist) = plt.subplots(1, 2, figsize=(13, 6.5))

    # --- Box panel ---
    ax_box.set_xlim(0, args.L)
    ax_box.set_ylim(0, args.L)
    ax_box.set_aspect("equal")
    ax_box.set_xticks([])
    ax_box.set_yticks([])
    for spine in ax_box.spines.values():
        spine.set_linewidth(1.5)

    cmap = plt.get_cmap("coolwarm")
    norm = plt.Normalize(vmin=0.0, vmax=v_max)
    speeds = gas.speeds()
    circles: list[mpatches.Circle] = []
    for k in range(args.N):
        c = mpatches.Circle(gas.pos[k], args.R, fc=cmap(norm(speeds[k])), ec="black", lw=0.3)
        ax_box.add_patch(c)
        circles.append(c)
    title = ax_box.set_title("t = 0.00   (color = speed)")

    # --- Histogram panel ---
    hist, _ = np.histogram(speeds, bins=bins, density=True)
    bars = ax_hist.bar(
        bin_centers, hist, width=bin_width, alpha=0.75,
        color="steelblue", edgecolor="navy", linewidth=0.5, label="simulation",
    )
    v_arr = np.linspace(0.0, v_max, 300)
    ax_hist.plot(v_arr, maxwell_2d(v_arr, kT), "r-", lw=2.5, label="Maxwell-Boltzmann (2D)")
    ax_hist.set_xlim(0.0, v_max)
    ax_hist.set_ylim(0.0, max(maxwell_2d(v_arr, kT)) * 1.7)
    ax_hist.set_xlabel("speed |v|")
    ax_hist.set_ylabel("PDF")
    ax_hist.set_title(f"Speed distribution   (N={args.N},  kT={kT:.3f})")
    ax_hist.legend(loc="upper right")
    ax_hist.grid(alpha=0.3)

    info = ax_hist.text(
        0.02, 0.95, "", transform=ax_hist.transAxes, verticalalignment="top",
        family="monospace",
        bbox=dict(boxstyle="round", facecolor="white", alpha=0.85, edgecolor="gray"),
    )

    def update(frame: int):
        gas.advance_to(gas.t + args.dt)
        sp = gas.speeds()
        for k, c in enumerate(circles):
            c.center = gas.pos[k]
            c.set_facecolor(cmap(norm(sp[k])))
        title.set_text(f"t = {gas.t:6.2f}   (color = speed)")

        h, _ = np.histogram(sp, bins=bins, density=True)
        for bar, height in zip(bars, h):
            bar.set_height(height)

        E = gas.kinetic_energy()
        vx2 = float(np.mean(gas.vel[:, 0] ** 2))
        vy2 = float(np.mean(gas.vel[:, 1] ** 2))
        info.set_text(
            f"KE       = {E:.4f}\n"
            f"ΔKE/KE   = {(E - gas.E0) / gas.E0:+.2e}\n"
            f"<v_x^2>  = {vx2:.4f}\n"
            f"<v_y^2>  = {vy2:.4f}   (kT={kT:.4f})\n"
            f"pair col = {gas.collisions_pair}\n"
            f"wall col = {gas.collisions_wall}"
        )
        return [*circles, *bars, title, info]

    ani = FuncAnimation(fig, update, frames=args.frames, interval=30, blit=False)
    plt.tight_layout()

    if args.save:
        if args.save.endswith(".gif"):
            from matplotlib.animation import PillowWriter
            ani.save(args.save, writer=PillowWriter(fps=30))
        else:
            ani.save(args.save, fps=30)
        print(f"Saved animation to {args.save}")

    if not args.no_show:
        plt.show()


if __name__ == "__main__":
    main()
