---- MODULE Omega ----
EXTENDS Naturals, Sequences
CONSTANTS Events
VARIABLES state, digest
Init == state = <<>> /\ digest = 0
Canon(e) == e
Hash(d, e) == d + 1
FoldHash(s) == Len(s)
Next == \E e \in Events : state' = Append(state, e) /\ digest' = Hash(digest, Canon(e))
Invariant == digest = FoldHash(state)
Spec == Init /\ [][Next]_<<state, digest>>
Safety == []Invariant
====
