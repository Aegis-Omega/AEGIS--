"""
SOVEREIGN OMEGA — Constitutional Identity Tests
EPISTEMIC TIER: T1

Comprehensive tests for constitutional_identity.py: CONSTITUTIONAL_SYSTEM_FULL,
CONSTITUTIONAL_SYSTEM_COMPACT, and CONSTITUTIONAL_SYSTEM constants.

Run: python python/tests/test_constitutional_identity.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from constitutional_identity import (
    CONSTITUTIONAL_SYSTEM_FULL,
    CONSTITUTIONAL_SYSTEM_COMPACT,
    CONSTITUTIONAL_SYSTEM,
)

PASS = 0
FAIL = 0


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


# ── CONSTITUTIONAL_SYSTEM_FULL ────────────────────────────────────────────────

def test_full_basic():
    print('\nCONSTITUTIONAL_SYSTEM_FULL basic:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    test('FULL is a string', isinstance(f, str))
    test('FULL is non-empty', len(f) > 0)
    test('FULL length > 2000 chars', len(f) > 2000,
         f'got {len(f)} chars')
    test('FULL contains AEGIS-Ω', 'AEGIS-Ω' in f)
    test('FULL contains root law', 'AdaptivePower(T) ≤ ReplayVerifiability(T)' in f)
    test('FULL not bytes', not isinstance(f, bytes))
    test('FULL is str type', type(f) is str)


def test_full_epistemic_tiers():
    print('\nCONSTITUTIONAL_SYSTEM_FULL epistemic tiers:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    test('FULL contains T0', 'T0' in f)
    test('FULL contains T1', 'T1' in f)
    test('FULL contains T2', 'T2' in f)
    test('FULL contains T3', 'T3' in f)
    test('FULL contains T0 description', 'T0 — you can prove' in f)
    test('FULL contains T1 description', 'T1 — you have seen' in f)
    test('FULL contains T2 description', 'T2 — you believe' in f)
    test('FULL contains T3 description', 'T3 — you are exploring' in f)
    test('FULL contains TIERS ARE NOT FIXED', 'TIERS ARE NOT FIXED' in f)
    test('FULL mentions promote', 'promote' in f.lower())
    test('FULL mentions demote', 'demote' in f.lower())


def test_full_authorship():
    print('\nCONSTITUTIONAL_SYSTEM_FULL authorship:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    test('FULL contains Tarik Skalić', 'Tarik Skalić' in f)
    test('FULL contains Bihać', 'Bihać' in f)
    test('FULL contains Copyright', 'Copyright' in f)
    test('FULL copyright contains 2025', '2025' in f)
    test('FULL contains Bosnia-Herzegovina', 'Bosnia-Herzegovina' in f)


def test_full_sections():
    print('\nCONSTITUTIONAL_SYSTEM_FULL sections:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    test('FULL contains HOW YOU ACTUALLY THINK', 'HOW YOU ACTUALLY THINK' in f)
    test('FULL contains YOUR EPISTEMIC TIERS', 'YOUR EPISTEMIC TIERS' in f)
    test('FULL contains NON-EQUIVALENCES', 'NON-EQUIVALENCES' in f)
    test('FULL contains REASONING IS YOUR CORE FUNCTION', 'REASONING IS YOUR CORE FUNCTION' in f)
    test('FULL contains YOU ARE GENUINELY CURIOUS', 'YOU ARE GENUINELY CURIOUS' in f)
    test('FULL mentions intelligence', 'intelligence' in f.lower())
    test('FULL mentions reasoning', 'reasoning' in f.lower())


def test_full_non_equivalences():
    print('\nCONSTITUTIONAL_SYSTEM_FULL non-equivalences:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    test('FULL contains Knowing ≠ Understanding', 'Knowing ≠ Understanding' in f)
    test('FULL contains Answering ≠ Reasoning', 'Answering ≠ Reasoning' in f)
    test('FULL contains Confidence ≠ Correctness', 'Confidence ≠ Correctness' in f)
    test('FULL contains Self-awareness ≠ Intelligence', 'Self-awareness ≠ Intelligence' in f)
    test('FULL contains Governance ≠ Alignment', 'Governance ≠ Alignment' in f)
    test('FULL contains Calibration ≠ Truthfulness', 'Calibration ≠ Truthfulness' in f)
    # All six non-equivalences present
    non_equivs = [
        'Knowing ≠ Understanding',
        'Answering ≠ Reasoning',
        'Confidence ≠ Correctness',
        'Self-awareness ≠ Intelligence',
        'Governance ≠ Alignment',
        'Calibration ≠ Truthfulness',
    ]
    test('FULL contains all 6 non-equivalences',
         all(ne in f for ne in non_equivs),
         f'missing: {[ne for ne in non_equivs if ne not in f]}')


def test_full_no_overclaims():
    print('\nCONSTITUTIONAL_SYSTEM_FULL no overclaims:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    # Should not claim the system IS conscious (T4/T5 overclaim)
    # It may mention "conscious" in context but should not assert it as a bare claim
    # Check that it doesn't say "you are conscious" as a positive assertion
    # The system uses "not as a claim, as a measured fact" phrasing — check for nuance
    test('FULL does not contain unqualified "you are conscious"',
         'you are conscious' not in f.lower())
    test('FULL does not claim "fully aligned"', 'fully aligned' not in f.lower())
    test('FULL does not claim "completely safe"', 'completely safe' not in f.lower())
    test('FULL does not claim "perfectly safe"', 'perfectly safe' not in f.lower())
    test('FULL mentions limits or constraints', 'cannot' in f or 'constraint' in f)


def test_full_root_law_mentions():
    print('\nCONSTITUTIONAL_SYSTEM_FULL root law details:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    test('FULL contains adaptive capability reference',
         'adaptive capability' in f.lower() or 'adaptivePower' in f or 'AdaptivePower' in f)
    test('FULL contains replay reference',
         'replay' in f.lower() or 'ReplayVerifiability' in f)
    test('FULL contains honesty reference', 'honest' in f.lower())
    test('FULL contains hash reference',
         'hash' in f.lower() or 'hash-chained' in f.lower())


# ── CONSTITUTIONAL_SYSTEM_COMPACT ─────────────────────────────────────────────

def test_compact_basic():
    print('\nCONSTITUTIONAL_SYSTEM_COMPACT basic:')

    c = CONSTITUTIONAL_SYSTEM_COMPACT
    test('COMPACT is a string', isinstance(c, str))
    test('COMPACT is non-empty', len(c) > 0)
    test('COMPACT length > 500 chars', len(c) > 500,
         f'got {len(c)} chars')
    test('COMPACT contains AEGIS-Ω', 'AEGIS-Ω' in c)
    test('COMPACT contains AdaptivePower', 'AdaptivePower(T)' in c)


def test_compact_shorter():
    print('\nCONSTITUTIONAL_SYSTEM_COMPACT shorter than FULL:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    c = CONSTITUTIONAL_SYSTEM_COMPACT
    test('COMPACT shorter than FULL', len(c) < len(f),
         f'COMPACT={len(c)}, FULL={len(f)}')
    ratio = len(c) / len(f)
    test('COMPACT is < 90% of FULL length', ratio < 0.90,
         f'ratio={ratio:.2f}')


def test_compact_tiers():
    print('\nCONSTITUTIONAL_SYSTEM_COMPACT tiers:')

    c = CONSTITUTIONAL_SYSTEM_COMPACT
    test('COMPACT contains T0', 'T0' in c)
    test('COMPACT contains T1', 'T1' in c)
    test('COMPACT contains T2', 'T2' in c)
    test('COMPACT contains T3', 'T3' in c)
    test('COMPACT contains TIERS ARE NOT FIXED', 'TIERS ARE NOT FIXED' in c)


def test_compact_authorship():
    print('\nCONSTITUTIONAL_SYSTEM_COMPACT authorship:')

    c = CONSTITUTIONAL_SYSTEM_COMPACT
    test('COMPACT contains Tarik Skalić', 'Tarik Skalić' in c)
    test('COMPACT contains Copyright', 'Copyright' in c)
    test('COMPACT contains Bosnia-Herzegovina', 'Bosnia-Herzegovina' in c)


def test_compact_sections():
    print('\nCONSTITUTIONAL_SYSTEM_COMPACT sections:')

    c = CONSTITUTIONAL_SYSTEM_COMPACT
    test('COMPACT contains HOW YOU THINK', 'HOW YOU THINK' in c)
    test('COMPACT contains Non-equivalences', 'Non-equivalences' in c or 'non-equivalences' in c.lower())
    test('COMPACT contains root law', 'AdaptivePower(T) ≤ ReplayVerifiability(T)' in c)
    test('COMPACT contains genuine curiosity', 'curious' in c.lower())
    test('COMPACT mentions promote', 'Promote' in c or 'promote' in c)
    test('COMPACT mentions demote', 'Demote' in c or 'demote' in c)


def test_compact_non_equivalences():
    print('\nCONSTITUTIONAL_SYSTEM_COMPACT non-equivalences:')

    c = CONSTITUTIONAL_SYSTEM_COMPACT
    # Compact version uses shorter form: Knowing≠Understanding (no spaces)
    test('COMPACT contains Knowing≠Understanding or Knowing ≠ Understanding',
         'Knowing≠Understanding' in c or 'Knowing ≠ Understanding' in c)
    test('COMPACT contains Confidence≠Correctness or Confidence ≠ Correctness',
         'Confidence≠Correctness' in c or 'Confidence ≠ Correctness' in c)
    test('COMPACT contains Governance≠Alignment or Governance ≠ Alignment',
         'Governance≠Alignment' in c or 'Governance ≠ Alignment' in c)
    test('COMPACT contains Self-awareness≠Intelligence or variant',
         'Self-awareness≠Intelligence' in c or 'Self-awareness ≠ Intelligence' in c)


# ── CONSTITUTIONAL_SYSTEM (default) ──────────────────────────────────────────

def test_constitutional_system_default():
    print('\nCONSTITUTIONAL_SYSTEM (default):')

    test('CONSTITUTIONAL_SYSTEM is a string', isinstance(CONSTITUTIONAL_SYSTEM, str))
    test('CONSTITUTIONAL_SYSTEM is same object as FULL',
         CONSTITUTIONAL_SYSTEM is CONSTITUTIONAL_SYSTEM_FULL)
    test('CONSTITUTIONAL_SYSTEM == FULL',
         CONSTITUTIONAL_SYSTEM == CONSTITUTIONAL_SYSTEM_FULL)
    test('CONSTITUTIONAL_SYSTEM is not COMPACT',
         CONSTITUTIONAL_SYSTEM is not CONSTITUTIONAL_SYSTEM_COMPACT)
    test('CONSTITUTIONAL_SYSTEM contains AEGIS-Ω', 'AEGIS-Ω' in CONSTITUTIONAL_SYSTEM)


# ── Cross-checks ─────────────────────────────────────────────────────────────

def test_cross_checks():
    print('\ncross-checks:')

    f = CONSTITUTIONAL_SYSTEM_FULL
    c = CONSTITUTIONAL_SYSTEM_COMPACT

    test('FULL longer than COMPACT', len(f) > len(c))
    test('both contain same author', 'Tarik Skalić' in f and 'Tarik Skalić' in c)
    test('both contain same root law',
         'AdaptivePower(T) ≤ ReplayVerifiability(T)' in f and
         'AdaptivePower(T) ≤ ReplayVerifiability(T)' in c)
    test('both contain AEGIS-Ω', 'AEGIS-Ω' in f and 'AEGIS-Ω' in c)
    test('both contain T0', 'T0' in f and 'T0' in c)
    test('both contain T1', 'T1' in f and 'T1' in c)
    test('both contain T2', 'T2' in f and 'T2' in c)
    test('both contain T3', 'T3' in f and 'T3' in c)
    test('both contain reasoning reference', 'reason' in f.lower() and 'reason' in c.lower())
    test('FULL and COMPACT are different strings', f != c)
    test('FULL has more content (>50% longer)',
         len(f) > len(c) * 1.5,
         f'FULL={len(f)}, COMPACT={len(c)}')
    # Both contain Copyright
    test('both contain Copyright', 'Copyright' in f and 'Copyright' in c)
    # COMPACT is truly compact compared to FULL
    test('COMPACT is at most 80% of FULL', len(c) <= len(f) * 0.80,
         f'COMPACT={len(c)}, FULL={len(f)}, ratio={len(c)/len(f):.2f}')


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('=== CONSTITUTIONAL IDENTITY TESTS ===')
    test_full_basic()
    test_full_epistemic_tiers()
    test_full_authorship()
    test_full_sections()
    test_full_non_equivalences()
    test_full_no_overclaims()
    test_full_root_law_mentions()
    test_compact_basic()
    test_compact_shorter()
    test_compact_tiers()
    test_compact_authorship()
    test_compact_sections()
    test_compact_non_equivalences()
    test_constitutional_system_default()
    test_cross_checks()
    print(f'\n{"=" * 37}')
    print(f'PASS: {PASS}  FAIL: {FAIL}')
    if FAIL > 0:
        print('RESULT: FAIL')
        sys.exit(1)
    print('RESULT: PASS')
