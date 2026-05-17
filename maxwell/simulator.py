"""Event-driven hard-disk gas in 2D.

Each collision (disk-wall or disk-disk) is solved exactly in closed form,
then the simulation jumps directly to the next collision time using a
priority queue. Collisions conserve momentum and kinetic energy by
construction, so any speed distribution converges to Maxwell-Boltzmann.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass, field

import numpy as np

INF = float("inf")
TOL = 1e-12


@dataclass(order=True)
class Event:
    t: float
    seq: int
    kind: str = field(compare=False)
    i: int = field(compare=False)
    j: int = field(compare=False, default=-1)
    ci: int = field(compare=False, default=0)
    cj: int = field(compare=False, default=0)


class HardDiskGas2D:
    """2D hard-disk gas in box [0, L] x [0, L]."""

    def __init__(
        self,
        N: int = 200,
        L: float = 10.0,
        R: float = 0.15,
        m: float = 1.0,
        speed: float = 1.0,
        seed: int = 42,
    ):
        self.N = N
        self.L = L
        self.R = R
        self.m = m
        self.t = 0.0

        rng = np.random.default_rng(seed)
        self.pos = self._place_particles(rng)

        # Mono-energetic start: identical speed, random directions.
        # Thermalisation to Maxwell-Boltzmann happens entirely via collisions.
        angles = rng.uniform(0.0, 2.0 * np.pi, size=N)
        self.vel = speed * np.stack([np.cos(angles), np.sin(angles)], axis=1)
        # Remove bulk drift so total momentum is zero.
        self.vel -= self.vel.mean(axis=0)
        # Rescale so total KE = N * 0.5 * m * speed^2.
        ke = 0.5 * m * np.sum(self.vel ** 2)
        target_ke = 0.5 * m * N * speed ** 2
        self.vel *= np.sqrt(target_ke / ke)

        self.last_update = np.zeros(N)
        self.col_count = np.zeros(N, dtype=np.int64)
        self.heap: list[Event] = []
        self._seq = 0

        for i in range(N):
            self._schedule_wall(i)
        self._schedule_all_pairs()

        self.E0 = self.kinetic_energy()
        self.P0 = self.momentum()
        self.collisions_pair = 0
        self.collisions_wall = 0

    def _place_particles(self, rng) -> np.ndarray:
        N, L, R = self.N, self.L, self.R
        margin = 0.25 * R
        spacing = 2 * R + margin
        nside = int(np.ceil(np.sqrt(N)))
        usable = L - 2 * R
        step = usable / max(nside - 1, 1)
        if step < spacing:
            raise ValueError(
                f"Box too small: need step >= {spacing} but only have {step:.3f}. "
                f"Lower N or R, or raise L."
            )
        pos = np.empty((N, 2))
        for k in range(N):
            ix, iy = k % nside, k // nside
            pos[k, 0] = R + ix * step
            pos[k, 1] = R + iy * step
        jitter = 0.1 * R
        pos += rng.uniform(-jitter, jitter, size=pos.shape)
        return np.clip(pos, R + TOL, L - R - TOL)

    def _next_seq(self) -> int:
        self._seq += 1
        return self._seq

    def _push(self, ev: Event) -> None:
        heapq.heappush(self.heap, ev)

    def _sync(self, i: int) -> None:
        dt = self.t - self.last_update[i]
        if dt > 0:
            self.pos[i] += self.vel[i] * dt
            self.last_update[i] = self.t

    def _sync_all(self) -> None:
        dt = self.t - self.last_update
        self.pos += self.vel * dt[:, None]
        self.last_update[:] = self.t

    def _schedule_wall(self, i: int) -> None:
        self._sync(i)
        x, y = self.pos[i]
        vx, vy = self.vel[i]

        if vx > 0:
            dt_x = (self.L - self.R - x) / vx
        elif vx < 0:
            dt_x = (self.R - x) / vx
        else:
            dt_x = INF

        if vy > 0:
            dt_y = (self.L - self.R - y) / vy
        elif vy < 0:
            dt_y = (self.R - y) / vy
        else:
            dt_y = INF

        if dt_x <= 0:
            dt_x = INF
        if dt_y <= 0:
            dt_y = INF

        if dt_x < dt_y < INF or (dt_x < INF and dt_y == INF):
            self._push(
                Event(self.t + dt_x, self._next_seq(), "wall_x", i, -1, self.col_count[i], 0)
            )
        elif dt_y < INF:
            self._push(
                Event(self.t + dt_y, self._next_seq(), "wall_y", i, -1, self.col_count[i], 0)
            )

    def _schedule_pairs_for(self, i: int) -> None:
        self._sync_all()
        dr = self.pos - self.pos[i]
        dv = self.vel - self.vel[i]
        b = np.einsum("kj,kj->k", dr, dv)
        a = np.einsum("kj,kj->k", dv, dv)
        c = np.einsum("kj,kj->k", dr, dr) - (2 * self.R) ** 2
        disc = b * b - a * c
        mask = (b < 0) & (a > 0) & (disc > 0)
        # Safe sqrt
        sqrt_disc = np.zeros_like(disc)
        sqrt_disc[mask] = np.sqrt(disc[mask])
        dt = np.full(self.N, INF)
        with np.errstate(divide="ignore", invalid="ignore"):
            dt[mask] = (-b[mask] - sqrt_disc[mask]) / a[mask]
        dt[i] = INF
        for k in range(self.N):
            d = dt[k]
            if 0 < d < INF:
                i0, i1 = (i, k) if i < k else (k, i)
                self._push(
                    Event(
                        self.t + d,
                        self._next_seq(),
                        "pair",
                        i0,
                        i1,
                        self.col_count[i0],
                        self.col_count[i1],
                    )
                )

    def _schedule_all_pairs(self) -> None:
        self._sync_all()
        R2 = (2 * self.R) ** 2
        for i in range(self.N):
            dr = self.pos[i + 1 :] - self.pos[i]
            dv = self.vel[i + 1 :] - self.vel[i]
            b = np.einsum("kj,kj->k", dr, dv)
            a = np.einsum("kj,kj->k", dv, dv)
            c = np.einsum("kj,kj->k", dr, dr) - R2
            disc = b * b - a * c
            mask = (b < 0) & (a > 0) & (disc > 0)
            if not np.any(mask):
                continue
            sqrt_disc = np.sqrt(disc[mask])
            dts = (-b[mask] - sqrt_disc) / a[mask]
            for local_k, d in zip(np.where(mask)[0], dts):
                if d > 0:
                    j = i + 1 + local_k
                    self._push(
                        Event(
                            self.t + d,
                            self._next_seq(),
                            "pair",
                            i,
                            j,
                            self.col_count[i],
                            self.col_count[j],
                        )
                    )

    def advance_to(self, t_target: float) -> None:
        """Process every event with t <= t_target, then sync all positions to t_target."""
        while self.heap and self.heap[0].t <= t_target:
            ev = heapq.heappop(self.heap)
            # Stale-event filter.
            if self.col_count[ev.i] != ev.ci:
                continue
            if ev.j >= 0 and self.col_count[ev.j] != ev.cj:
                continue
            self.t = ev.t

            if ev.kind == "wall_x":
                self._sync(ev.i)
                # Clamp to wall to suppress numerical drift outside box.
                if self.vel[ev.i, 0] > 0:
                    self.pos[ev.i, 0] = self.L - self.R
                else:
                    self.pos[ev.i, 0] = self.R
                self.vel[ev.i, 0] = -self.vel[ev.i, 0]
                self.col_count[ev.i] += 1
                self.collisions_wall += 1
                self._schedule_wall(ev.i)
                self._schedule_pairs_for(ev.i)

            elif ev.kind == "wall_y":
                self._sync(ev.i)
                if self.vel[ev.i, 1] > 0:
                    self.pos[ev.i, 1] = self.L - self.R
                else:
                    self.pos[ev.i, 1] = self.R
                self.vel[ev.i, 1] = -self.vel[ev.i, 1]
                self.col_count[ev.i] += 1
                self.collisions_wall += 1
                self._schedule_wall(ev.i)
                self._schedule_pairs_for(ev.i)

            else:  # pair
                i, j = ev.i, ev.j
                self._sync(i)
                self._sync(j)
                dr = self.pos[j] - self.pos[i]
                dist = float(np.linalg.norm(dr))
                if dist < TOL:
                    continue
                n = dr / dist
                dv = self.vel[j] - self.vel[i]
                # Exchange normal component; equal-mass elastic 2D collision.
                imp = float(np.dot(dv, n)) * n
                self.vel[i] += imp
                self.vel[j] -= imp
                self.col_count[i] += 1
                self.col_count[j] += 1
                self.collisions_pair += 1
                self._schedule_wall(i)
                self._schedule_wall(j)
                self._schedule_pairs_for(i)
                self._schedule_pairs_for(j)

        self.t = t_target
        self._sync_all()

    # --- diagnostics ---

    def speeds(self) -> np.ndarray:
        return np.linalg.norm(self.vel, axis=1)

    def kinetic_energy(self) -> float:
        return float(0.5 * self.m * np.sum(self.vel ** 2))

    def momentum(self) -> np.ndarray:
        return self.m * np.sum(self.vel, axis=0)

    def kT(self) -> float:
        # 2D: equipartition gives <KE>/particle = 2 * (kT/2) = kT (with m=1).
        return self.kinetic_energy() / self.N
