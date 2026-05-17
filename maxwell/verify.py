"""Headless verification: run the simulator, check conservation laws,
and produce a static figure comparing the initial and final speed
distributions with the Maxwell-Boltzmann theory curve.

Run with:
    python verify.py                            # default settings, saves verify.png
    python verify.py --N 400 --t 200 --out v.png
"""

from __future__ import annotations

import argparse
import time

import matplotlib

matplotlib.use("Agg")  # headless

import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402

from simulator import HardDiskGas2D  # noqa: E402
from run import maxwell_2d  # noqa: E402


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--N", type=int, default=300)
    p.add_argument("--L", type=float, default=12.0)
    p.add_argument("--R", type=float, default=0.15)
    p.add_argument("--speed", type=float, default=1.0)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--t", type=float, default=120.0, help="total simulated time")
    p.add_argument("--burn", type=float, default=20.0,
                   help="time to discard before averaging the final distribution")
    p.add_argument("--samples", type=int, default=100,
                   help="number of snapshots to pool for the final distribution")
    p.add_argument("--out", type=str, default="verify.png")
    return p.parse_args()


def main() -> None:
    args = parse_args()

    print(f"Initialising N={args.N} disks in box L={args.L}, R={args.R}...")
    gas = HardDiskGas2D(N=args.N, L=args.L, R=args.R, speed=args.speed, seed=args.seed)
    kT = gas.kT()
    print(f"  Total KE = {gas.E0:.4f},   kT (per DOF*2) = {kT:.4f}")
    print(f"  Initial momentum |P| = {np.linalg.norm(gas.P0):.2e}")

    speeds_init = gas.speeds().copy()

    print(f"Burning in for t={args.burn}...")
    t0 = time.time()
    gas.advance_to(args.burn)
    print(f"  done in {time.time() - t0:.2f}s   ({gas.collisions_pair} pair, {gas.collisions_wall} wall)")

    print(f"Collecting {args.samples} samples up to t={args.t}...")
    dt = (args.t - args.burn) / args.samples
    pooled_speeds = []
    pooled_vx = []
    pooled_vy = []
    energies = []
    t0 = time.time()
    for s in range(args.samples):
        gas.advance_to(args.burn + (s + 1) * dt)
        pooled_speeds.append(gas.speeds())
        pooled_vx.append(gas.vel[:, 0].copy())
        pooled_vy.append(gas.vel[:, 1].copy())
        energies.append(gas.kinetic_energy())
    elapsed = time.time() - t0
    pooled = np.concatenate(pooled_speeds)
    vx_all = np.concatenate(pooled_vx)
    vy_all = np.concatenate(pooled_vy)
    print(f"  done in {elapsed:.2f}s   ({gas.collisions_pair} pair, {gas.collisions_wall} wall total)")

    E = np.array(energies)
    print()
    print("Conservation / equilibrium checks:")
    print(f"  KE          : mean {E.mean():.6f}  std {E.std():.2e}  drift {(E[-1]-gas.E0)/gas.E0:+.2e}")
    print(f"  <v_x^2>     : {np.mean(vx_all**2):.4f}   (expect kT/m = {kT:.4f})")
    print(f"  <v_y^2>     : {np.mean(vy_all**2):.4f}   (expect kT/m = {kT:.4f})")
    print(f"  <v_x>,<v_y> : {np.mean(vx_all):+.2e}, {np.mean(vy_all):+.2e}   (expect ~0)")
    print(f"  Note: rigid walls absorb momentum, so total gas momentum is")
    print(f"        NOT conserved -- only kinetic energy is.")

    # --- Plot ---
    v_max = max(3.0 * args.speed, 3.5 * np.sqrt(kT))
    bins = np.linspace(0.0, v_max, 50)
    v_arr = np.linspace(0.0, v_max, 400)
    theory = maxwell_2d(v_arr, kT)

    fig, (ax0, ax1) = plt.subplots(1, 2, figsize=(13, 5.5))

    ax0.hist(speeds_init, bins=bins, density=True, color="goldenrod", alpha=0.8,
             edgecolor="black", linewidth=0.4, label="t = 0 (mono-energetic)")
    ax0.plot(v_arr, theory, "r-", lw=2.5, label="Maxwell-Boltzmann (2D)")
    ax0.axvline(args.speed, color="black", linestyle="--", linewidth=1, alpha=0.6)
    ax0.set_xlim(0.0, v_max)
    ax0.set_xlabel("speed |v|")
    ax0.set_ylabel("PDF")
    ax0.set_title("Initial speeds")
    ax0.legend()
    ax0.grid(alpha=0.3)

    ax1.hist(pooled, bins=bins, density=True, color="steelblue", alpha=0.8,
             edgecolor="navy", linewidth=0.4,
             label=f"pooled t∈[{args.burn:.0f}, {args.t:.0f}]")
    ax1.plot(v_arr, theory, "r-", lw=2.5, label="Maxwell-Boltzmann (2D)")
    ax1.set_xlim(0.0, v_max)
    ax1.set_xlabel("speed |v|")
    ax1.set_ylabel("PDF")
    ax1.set_title(f"Equilibrated speeds   (kT = {kT:.3f})")
    ax1.legend()
    ax1.grid(alpha=0.3)

    fig.suptitle(
        f"2D hard-disk gas: emergence of the Maxwell-Boltzmann distribution"
        f"   (N={args.N}, pair collisions = {gas.collisions_pair})",
        fontsize=12,
    )
    fig.tight_layout()
    fig.savefig(args.out, dpi=130)
    print(f"\nWrote {args.out}")


if __name__ == "__main__":
    main()
