# Historical charts are free, and the revenue path moves

The v1 PRD listed "paid alert tiers and historical rate charts" under deferred revenue. Charts ship free instead. The revenue path becomes export, trend alerts, and the licensed-BDC directory.

## Why

Taking a live feature away costs far more goodwill than never shipping it, so the choice was between free now and paid from the start — "free now, gate later" was rejected outright.

Paid was rejected because a chart of the gap between the parallel and official markets over time is the strongest argument for the app existing at all. It is the one view nobody else presents well, and it is built almost entirely from data Aboki Rate already holds: the official history is a single public fetch, and the parallel series accumulates from observations the Admin records anyway. Charging for the best demonstration of why the product is worth opening is a poor trade against charging for something incremental.

Looking at a line stays free. The things worth charging for are the ones that do work on a Reader's behalf: taking data away with them (export), being told about a trend without looking (trend alerts), and the directory, which is a different product surface entirely.

## Consequences

The PRD's out-of-scope section is amended rather than left contradicting the code; a specification that disagrees with the build is worse than no specification.

Revenue now rests on features that do not exist yet. That is a real risk and it is accepted deliberately: v1 has no users, and a product with no audience has no revenue problem worth optimising. Revisit when there is an audience to monetise.

## The asymmetry this creates

Official history reaches back to December 2001. Parallel history begins the day Aboki Rate started observing, and cannot be reconstructed, because nobody was watching. A chart offering a five-year range would draw one complete line and one stub, inviting the reader to conclude the parallel market did not exist before 2026.

So ranges unlock only as the parallel series earns them, and official-only views range freely. Per-currency start dates differ too — the CBN began publishing AED in January 2026, ZAR in 2017, CNY in 2011 — so the rule is per currency, not global.
