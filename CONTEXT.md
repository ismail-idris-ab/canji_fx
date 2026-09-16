# Canji

Canji reports Nigerian foreign-exchange rates. It observes and republishes rates that others set — it does not set, quote, guarantee, or transact in them. Every term below is chosen to keep that distinction visible.

## Language

### Money and rates

**Naira**:
The Nigerian naira (NGN). The base of every rate Canji reports; never itself a Quoted Currency.
_Avoid_: NGN as a listed currency, base currency

**Quoted Currency**:
A foreign currency whose value Canji reports against the Naira, such as USD or GBP.
_Avoid_: currency pair, symbol, ticker

**Tracked Currency**:
A Quoted Currency the Admin observes in the Parallel Market. A small set — most Quoted Currencies appear only in the Official Market, and simply show nothing for the Parallel Market.
_Avoid_: supported currency, enabled currency

**Rate**:
An observation of what one unit of a Quoted Currency was worth in Naira, in one Market, at one moment, according to one Source. A Rate is a historical record of an observation, never a live price offered by Canji.
_Avoid_: price, quote, our rate, the rate we give

**Correction**:
A later Rate that supersedes an earlier mistaken one. Corrections are made by observing again, never by altering the original observation.
_Avoid_: edit, fix, update, amend

### Perspective

**Buy Rate**:
What the market operator pays in Naira to acquire one unit of the Quoted Currency from the public. The lower side of the Spread.
_Avoid_: bid, we buy, your buy price

**Sell Rate**:
What the market operator charges in Naira to release one unit of the Quoted Currency to the public. The higher side of the Spread.
_Avoid_: ask, offer, we sell

**Central Rate**:
The midpoint rate published alongside Buy and Sell in the Official Market.
_Avoid_: mid, mid-market, average

**Spread**:
The gap between a Buy Rate and a Sell Rate within one Market.
_Avoid_: margin, commission

**Gap**:
The difference between the Parallel Market and the Official Market for the same Quoted Currency.
_Avoid_: spread (reserved for within-market), premium, arbitrage

### Markets

**Market**:
A distinct place rates are formed and observed. Canji reports exactly two: the Parallel Market and the Official Market.
_Avoid_: exchange, channel, venue

**Parallel Market**:
The informal street market for foreign currency in Nigeria, observed by survey rather than published by any institution. One national figure, not per-city.
_Avoid_: aboki, black market, unofficial rate

**Official Market**:
The institutionally published rate for Nigeria. Named as a market rather than after its present publisher, because the publishing institution and mechanism have changed before and will change again.
_Avoid_: CBN rate, government rate, bank rate

### Provenance and trust

**Source**:
The institution or method a Rate came from, named on the Rate itself. Every displayed Rate states its Source.
_Avoid_: provider, feed, origin

**Observed At**:
The moment a Rate was recorded by Canji. Always shown to the reader alongside the Rate; a Rate without its Observed At is never displayed.
_Avoid_: updated at, timestamp, last refreshed

**Rate Date**:
The day a Rate belongs to according to its Source, which is not the moment Canji observed it. An Official Market Rate fetched on Monday may carry Friday's Rate Date.
_Avoid_: date, effective date, as-of date

**Freshness**:
How much confidence a reader should place in a Rate given how long ago it was observed. Expressed to readers as Fresh, Aging, or Stale.
_Avoid_: staleness, expiry, TTL, validity

**Admin**:
The person who observes and records Parallel Market Rates and curates News. Not a dealer, not a market maker, not a price setter.
_Avoid_: operator, dealer, trader, publisher

### News

**News Item**:
A pointer to an article published elsewhere — its headline, publisher, image and link. Canji never holds or shows article text.
_Avoid_: article, story, post, content

**News Source**:
A recognised publisher whose articles may be linked. Identified by the domain it publishes on.
_Avoid_: outlet, site, feed

### Alerts

**Rate Alert**:
A reader's standing request to be notified when a Rate for one Quoted Currency in one Market crosses a threshold they chose.
_Avoid_: notification, trigger, watch, subscription

**Watched Side**:
Which number of a Rate a Rate Alert compares against its threshold — the Buy Rate, the Sell Rate, or the Central Rate.
_Avoid_: field, price type

**Crossing**:
The moment a Rate moves from one side of a Rate Alert's threshold to the other. A Rate Alert fires on the Crossing, not for as long as the threshold is exceeded.
_Avoid_: breach, hit, match

**Reader**:
Someone who uses Canji to look up rates. Known to the system only as a device, unless they choose to identify themselves.
_Avoid_: user, customer, client, trader
