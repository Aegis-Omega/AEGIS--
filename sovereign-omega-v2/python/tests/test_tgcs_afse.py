"""
SOVEREIGN OMEGA — TGCS / AFSE Tests
EPISTEMIC TIER: T1

Comprehensive tests for tgcs_afse.py: TGCSTelemetry, TGCSController,
AFSETelemetry, AFSEController — all using a mock HardwareProfile with
no thermal path (no sysfs reads, no real GPU required).

Run: python python/tests/test_tgcs_afse.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from hardware_config import (
    HardwareProfile, AFSE_R2_THRESHOLD, TGCS_VARIANCE_TARGET,
    INT_SCALE,
)
from tgcs_afse import (
    TGCSTelemetry, TGCSController,
    AFSETelemetry, AFSEController,
)

PASS = 0
FAIL = 0

# Minimal mock hardware profile with no thermal path
MOCK_HW = HardwareProfile(
    ram_bytes=8 * 1024 ** 3,
    vram_bytes=8 * 1024 ** 3,
    cpu_cores=4,
    platform='Linux',
    is_target_hardware=True,
    thermal_path=None,
)


def ok(name: str) -> None:
    global PASS
    PASS += 1
    print(f'  PASS  {name}')


def fail(name: str, reason: str) -> None:
    global FAIL
    FAIL += 1
    print(f'  FAIL  {name}: {reason}')


def test(name: str, condition: bool, reason: str = '') -> None:
    if condition:
        ok(name)
    else:
        fail(name, reason or 'assertion failed')


def expect_raises(name: str, exc_type, fn) -> None:
    try:
        fn()
        fail(name, f'expected {exc_type.__name__} but no exception raised')
    except exc_type:
        ok(name)
    except Exception as e:
        fail(name, f'expected {exc_type.__name__} but got {type(e).__name__}: {e}')


# ── TGCSTelemetry dataclass ───────────────────────────────────────────────────

def test_tgcs_telemetry_dataclass():
    print('\nTGCSTelemetry dataclass:')

    t = TGCSTelemetry(
        sequence=5,
        temperature_c=75.0,
        cycle_stretch_ms=10.0,
        throttle_active=True,
        run_variance=0.0,
        passes_criterion=True,
    )

    test('sequence field correct', t.sequence == 5)
    test('temperature_c field correct', t.temperature_c == 75.0)
    test('cycle_stretch_ms field correct', t.cycle_stretch_ms == 10.0)
    test('throttle_active field correct', t.throttle_active is True)
    test('run_variance field correct', t.run_variance == 0.0)
    test('passes_criterion field correct', t.passes_criterion is True)
    test('passes_criterion is bool', isinstance(t.passes_criterion, bool))
    test('run_variance is float', isinstance(t.run_variance, float))
    test('cycle_stretch_ms is float', isinstance(t.cycle_stretch_ms, float))
    test('sequence is int', isinstance(t.sequence, int))

    # passes_criterion semantics: True when variance == TGCS_VARIANCE_TARGET
    t2 = TGCSTelemetry(
        sequence=0, temperature_c=None, cycle_stretch_ms=0.0,
        throttle_active=False, run_variance=0.0,
        passes_criterion=abs(0.0) <= TGCS_VARIANCE_TARGET,
    )
    test('passes_criterion True when variance=0.0', t2.passes_criterion is True)

    t3 = TGCSTelemetry(
        sequence=0, temperature_c=None, cycle_stretch_ms=0.0,
        throttle_active=False, run_variance=1.0,
        passes_criterion=abs(1.0) <= TGCS_VARIANCE_TARGET,
    )
    test('passes_criterion False when variance=1.0', t3.passes_criterion is False)

    # Frozen — cannot mutate
    expect_raises('TGCSTelemetry frozen', (AttributeError, TypeError),
                  lambda: setattr(t, 'sequence', 99))

    # temperature_c can be None
    t4 = TGCSTelemetry(
        sequence=1, temperature_c=None, cycle_stretch_ms=0.0,
        throttle_active=False, run_variance=0.0, passes_criterion=True,
    )
    test('temperature_c can be None', t4.temperature_c is None)


# ── TGCSController — basic calls ──────────────────────────────────────────────

def test_tgcs_controller_basic():
    print('\nTGCSController basic:')

    ctrl = TGCSController(hw_profile=MOCK_HW)
    tel = ctrl.regulate_cycle(sequence=0)

    test('regulate_cycle returns TGCSTelemetry', isinstance(tel, TGCSTelemetry))
    test('no thermal path → temperature_c is None', tel.temperature_c is None)
    test('no thermal path → throttle_active is False', tel.throttle_active is False)
    test('no thermal path → cycle_stretch_ms == 0.0', tel.cycle_stretch_ms == 0.0)
    test('first call sequence field matches', tel.sequence == 0)

    # With 1 sample, variance=0.0 → passes_criterion True
    test('first call passes_criterion True', tel.passes_criterion is True)
    test('first call run_variance == 0.0', tel.run_variance == 0.0)


def test_tgcs_controller_seq_tracking():
    print('\nTGCSController sequence tracking:')

    ctrl = TGCSController(hw_profile=MOCK_HW)

    # 10 sequential calls: constant intervals = zero variance
    for i in range(10):
        tel = ctrl.regulate_cycle(sequence=i)
        test(f'seq={i} field matches', tel.sequence == i)

    # All 10 calls: variance = 0 (constant interval 1)
    final = ctrl.regulate_cycle(sequence=10)
    test('constant intervals → variance = 0.0', final.run_variance == 0.0)
    test('constant intervals → passes_criterion True', final.passes_criterion is True)

    # Internal buffer tracks sequences
    test('_cycle_seqs has correct count', len(ctrl._cycle_seqs) == 11)


def test_tgcs_controller_buffer_cap():
    print('\nTGCSController buffer cap:')

    ctrl = TGCSController(hw_profile=MOCK_HW)

    # Push 1200 calls — buffer should cap at 1000
    for i in range(1200):
        ctrl.regulate_cycle(sequence=i)

    test('_cycle_seqs capped at 1000', len(ctrl._cycle_seqs) == 1000)

    # Most recent value should be 1199
    test('most recent seq is last pushed', ctrl._cycle_seqs[-1] == 1199)


def test_tgcs_controller_variance_uniform():
    print('\nTGCSController variance uniform intervals:')

    ctrl = TGCSController(hw_profile=MOCK_HW)

    # Uniform seq += 1: all intervals = 1, mean = 1, variance = 0
    for i in range(50):
        ctrl.regulate_cycle(sequence=i)

    tel = ctrl.regulate_cycle(sequence=50)
    test('uniform seq (step=1) → variance = 0.0', tel.run_variance == 0.0)

    # Uniform step=5: same, variance = 0
    ctrl2 = TGCSController(hw_profile=MOCK_HW)
    for i in range(0, 50, 5):
        ctrl2.regulate_cycle(sequence=i)
    tel2 = ctrl2.regulate_cycle(sequence=50)
    test('uniform seq (step=5) → variance = 0.0', tel2.run_variance == 0.0)


def test_tgcs_controller_variance_nonuniform():
    print('\nTGCSController variance non-uniform:')

    ctrl = TGCSController(hw_profile=MOCK_HW)

    # Alternating steps 1 and 10: intervals = [1, 10, 1, 10, ...] → non-zero variance
    seqs = []
    s = 0
    for i in range(20):
        step = 1 if i % 2 == 0 else 10
        s += step
        seqs.append(s)

    for s in seqs:
        ctrl.regulate_cycle(sequence=s)

    tel = ctrl.regulate_cycle(sequence=seqs[-1] + 1)
    test('alternating intervals → variance > 0.0', tel.run_variance > 0.0,
         f'got {tel.run_variance}')
    test('non-zero variance → passes_criterion False', tel.passes_criterion is False)


# ── _compute_variance internals ───────────────────────────────────────────────

def test_compute_variance_internals():
    print('\n_compute_variance internals:')

    ctrl = TGCSController(hw_profile=MOCK_HW)

    # 0 samples → variance = 0.0
    test('0 samples → variance = 0.0', ctrl._compute_variance() == 0.0)

    # 1 sample → variance = 0.0
    ctrl.regulate_cycle(sequence=0)
    test('1 sample → variance = 0.0', ctrl._compute_variance() == 0.0)

    # 2 identical intervals → variance = 0.0
    ctrl2 = TGCSController(hw_profile=MOCK_HW)
    ctrl2.regulate_cycle(sequence=0)
    ctrl2.regulate_cycle(sequence=1)
    ctrl2.regulate_cycle(sequence=2)
    test('2 uniform intervals → variance = 0.0', ctrl2._compute_variance() == 0.0)

    # Non-uniform: [0, 1, 10] → intervals [1, 9] → mean=5, variance=16
    ctrl3 = TGCSController(hw_profile=MOCK_HW)
    ctrl3.regulate_cycle(sequence=0)
    ctrl3.regulate_cycle(sequence=1)
    ctrl3.regulate_cycle(sequence=10)
    v = ctrl3._compute_variance()
    test('intervals [1,9] → variance = 16.0', abs(v - 16.0) < 0.001,
         f'got {v}')


# ── AFSETelemetry dataclass ───────────────────────────────────────────────────

def test_afse_telemetry_dataclass():
    print('\nAFSETelemetry dataclass:')

    t = AFSETelemetry(
        sequence=100,
        local_throughput=500.0,
        distributed_baseline=1000.0,
        r_squared=0.99,
        scaling_factor=0.5,
        passes_criterion=True,
    )

    test('sequence field correct', t.sequence == 100)
    test('local_throughput field correct', t.local_throughput == 500.0)
    test('distributed_baseline field correct', t.distributed_baseline == 1000.0)
    test('r_squared field correct', t.r_squared == 0.99)
    test('scaling_factor field correct', t.scaling_factor == 0.5)
    test('passes_criterion field correct', t.passes_criterion is True)
    test('passes_criterion is bool', isinstance(t.passes_criterion, bool))
    test('r_squared is float', isinstance(t.r_squared, float))

    # passes_criterion semantics
    t2 = AFSETelemetry(
        sequence=0, local_throughput=800.0, distributed_baseline=1000.0,
        r_squared=0.98, scaling_factor=0.8,
        passes_criterion=0.98 >= AFSE_R2_THRESHOLD,
    )
    test('passes_criterion True when r_squared == 0.98', t2.passes_criterion is True)

    t3 = AFSETelemetry(
        sequence=0, local_throughput=800.0, distributed_baseline=1000.0,
        r_squared=0.97, scaling_factor=0.8,
        passes_criterion=0.97 >= AFSE_R2_THRESHOLD,
    )
    test('passes_criterion False when r_squared == 0.97', t3.passes_criterion is False)

    # Frozen
    expect_raises('AFSETelemetry frozen', (AttributeError, TypeError),
                  lambda: setattr(t, 'r_squared', 0.0))


# ── AFSEController — record_event ─────────────────────────────────────────────

def test_afse_controller_record_event():
    print('\nAFSEController record_event:')

    ctrl = AFSEController()

    # First 99 events return None
    for i in range(99):
        result = ctrl.record_event(i)
        test(f'event {i}: returns None before 100', result is None,
             f'got {result}') if i < 5 else None  # only test first 5 to keep output manageable

    # Test that events 0-98 all return None (sampling approach)
    ctrl2 = AFSEController()
    nones = [ctrl2.record_event(i) for i in range(99)]
    test('first 99 events all return None', all(r is None for r in nones))

    # Event 100 may return None or AFSETelemetry (needs elapsed time > 0)
    # No assertion on this because of time.monotonic dependency


def test_afse_controller_get_r2():
    print('\nAFSEController get_r2:')

    ctrl = AFSEController()

    # < 2 samples → R² = 0.0
    test('get_r2 with no samples returns 0.0', ctrl.get_r2() == 0.0)

    # After 1 sample
    ctrl._local_samples.append(500.0)
    test('get_r2 with 1 sample returns 0.0', ctrl.get_r2() == 0.0)

    # After 2+ identical samples → R² = 1.0 (zero variance)
    ctrl._local_samples.append(500.0)
    r2 = ctrl.get_r2()
    test('get_r2 with 2 identical samples returns 1.0', r2 == 1.0, f'got {r2}')

    # Variable samples → R² < 1.0
    ctrl2 = AFSEController()
    ctrl2._local_samples.extend([100.0, 500.0, 200.0, 800.0, 50.0])
    r2_var = ctrl2.get_r2()
    test('variable samples → R² in [0, 1]', 0.0 <= r2_var <= 1.0, f'got {r2_var}')

    # get_r2 returns float
    test('get_r2 returns float', isinstance(ctrl.get_r2(), float))


def test_afse_controller_r2_bounds():
    print('\nAFSEController R² always in [0, 1]:')

    ctrl = AFSEController()

    # Many identical samples: R² = 1.0
    ctrl._local_samples.extend([1000.0] * 50)
    r2_uniform = ctrl.get_r2()
    test('uniform samples → R² = 1.0', r2_uniform == 1.0, f'got {r2_uniform}')

    # Highly variable samples: R² < 1.0
    ctrl2 = AFSEController()
    import random
    random.seed(42)
    ctrl2._local_samples.extend([random.uniform(0.1, 1000.0) for _ in range(100)])
    r2_var = ctrl2.get_r2()
    test('variable samples → R² < 1.0', r2_var < 1.0, f'got {r2_var}')
    test('variable samples → R² >= 0.0', r2_var >= 0.0, f'got {r2_var}')

    # Exactly 1 sample
    ctrl3 = AFSEController()
    ctrl3._local_samples.append(500.0)
    test('1 sample → R² = 0.0', ctrl3.get_r2() == 0.0)


# ── AFSEController — throughput_entropy ───────────────────────────────────────

def test_afse_throughput_entropy():
    print('\nAFSEController throughput_entropy:')

    ctrl = AFSEController()
    test('entropy with 0 samples = 0.0', ctrl.throughput_entropy() == 0.0)

    ctrl2 = AFSEController()
    ctrl2._local_samples.append(500.0)
    test('entropy with 1 sample = 0.0', ctrl2.throughput_entropy() == 0.0)

    # Uniform throughput (all same value): hi == lo → entropy = 0.0
    ctrl3 = AFSEController()
    ctrl3._local_samples.extend([500.0] * 20)
    test('uniform throughput → entropy = 0.0', ctrl3.throughput_entropy() == 0.0)

    # Non-uniform: entropy > 0.0
    ctrl4 = AFSEController()
    ctrl4._local_samples.extend([100.0, 200.0, 300.0, 400.0, 500.0,
                                   100.0, 200.0, 300.0, 400.0, 500.0] * 10)
    ent = ctrl4.throughput_entropy()
    test('non-uniform throughput → entropy >= 0.0', ent >= 0.0, f'got {ent}')

    # Returns float
    test('throughput_entropy returns float', isinstance(ctrl4.throughput_entropy(), float))


# ── AFSEController — effective_bandwidth ──────────────────────────────────────

def test_afse_effective_bandwidth():
    print('\nAFSEController effective_bandwidth:')

    ctrl = AFSEController()
    test('effective_bandwidth with no samples = 0.0', ctrl.effective_bandwidth() == 0.0)

    # Some samples
    ctrl2 = AFSEController()
    ctrl2._local_samples.extend([500.0] * 20)
    eb = ctrl2.effective_bandwidth()
    test('effective_bandwidth >= 0.0', eb >= 0.0, f'got {eb}')
    test('effective_bandwidth with uniform tp = mean (entropy=0, factor=1)',
         abs(eb - 500.0) < 1.0, f'got {eb}, expected ~500.0')

    # Highly variable samples: effective_bandwidth < mean (entropy penalises)
    ctrl3 = AFSEController()
    ctrl3._local_samples.extend([1.0, 999.0, 1.0, 999.0, 1.0, 999.0] * 10)
    mean_tp = sum(ctrl3._local_samples) / len(ctrl3._local_samples)
    eb3 = ctrl3.effective_bandwidth()
    test('variable tp → effective_bandwidth <= mean', eb3 <= mean_tp + 1.0,
         f'eb={eb3}, mean={mean_tp}')
    test('effective_bandwidth returns float', isinstance(eb3, float))


# ── AFSEController — holonic_scaling_score ────────────────────────────────────

def test_afse_holonic_scaling():
    print('\nAFSEController holonic_scaling_score:')

    ctrl = AFSEController()
    test('holonic_scaling_score with no samples = 0.0',
         ctrl.holonic_scaling_score() == 0.0)

    ctrl2 = AFSEController()
    ctrl2._local_samples.extend([500.0] * 20)
    score = ctrl2.holonic_scaling_score()
    test('holonic_scaling_score >= 0.0', score >= 0.0, f'got {score}')

    # With uniform 1000 eps (= DISTRIBUTED_BASELINE_EPS): R²=1.0, EB=1000, score≈1.0
    ctrl3 = AFSEController()
    ctrl3._local_samples.extend([1000.0] * 50)
    score3 = ctrl3.holonic_scaling_score()
    test('uniform at baseline → score ≈ 1.0', abs(score3 - 1.0) < 0.01,
         f'got {score3}')

    test('holonic_scaling_score returns float',
         isinstance(ctrl.holonic_scaling_score(), float))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('=== TGCS / AFSE TESTS ===')
    test_tgcs_telemetry_dataclass()
    test_tgcs_controller_basic()
    test_tgcs_controller_seq_tracking()
    test_tgcs_controller_buffer_cap()
    test_tgcs_controller_variance_uniform()
    test_tgcs_controller_variance_nonuniform()
    test_compute_variance_internals()
    test_afse_telemetry_dataclass()
    test_afse_controller_record_event()
    test_afse_controller_get_r2()
    test_afse_controller_r2_bounds()
    test_afse_throughput_entropy()
    test_afse_effective_bandwidth()
    test_afse_holonic_scaling()
    print(f'\n{"=" * 27}')
    print(f'PASS: {PASS}  FAIL: {FAIL}')
    if FAIL > 0:
        print('RESULT: FAIL')
        sys.exit(1)
    print('RESULT: PASS')
