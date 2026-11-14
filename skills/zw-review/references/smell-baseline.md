# zw-review reference: smell baseline

The fixed set of Fowler code smells that applies even when a repo documents nothing. Each entry reads what it is, then how to fix it. A documented repo standard overrides any smell it endorses; every smell is a judgement call, never a hard violation.

- Mysterious Name: a function, variable, or type whose name does not reveal what it does or holds. Rename it; if no honest name comes, the design is murky.
- Duplicated Code: the same logic shape appears in more than one hunk or file in the change. Extract the shared shape and call it from both.
- Feature Envy: a method reaches into another object's data more than its own. Move the method onto the data it envies.
- Data Clumps: the same few fields or parameters keep travelling together. Bundle them into one type and pass that.
- Primitive Obsession: a primitive or string stands in for a domain concept that deserves its own type. Give the concept a small type.
- Repeated Switches: the same switch or if-cascade on the same type recurs across the change. Replace with polymorphism, or one map both sites share.
- Shotgun Surgery: one logical change forces scattered edits across many files. Gather what changes together into one module.
- Divergent Change: one file or module is edited for several unrelated reasons. Split it so each module changes for one reason.
- Speculative Generality: abstraction, parameters, or hooks added for needs the spec does not have. Delete them; inline back until a real need shows.
- Message Chains: long navigation chains a caller should not depend on. Hide the walk behind one method on the first object.
- Middle Man: a class or function that mostly delegates onward. Cut it and call the real target direct.
- Refused Bequest: a subclass or implementer ignores or overrides most of what it inherits. Drop the inheritance and use composition.
