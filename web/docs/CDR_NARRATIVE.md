# The Compliance Data Router: A Narrative

## The Problem Nobody Has Solved

In the paper and packaging industry, a chemical supplier like Omya sells calcium carbonate to dozens of customers — Sappi, UPM, Mondi, Smurfit Kappa, and others. Each customer needs to verify that Omya's product meets regulatory requirements: REACH in Europe, TSCA in the US, BfR for German food contact, and increasingly, Digital Product Passport standards that the EU will mandate within three years.

Each customer uses a different platform to collect this data. Some use 3E. Some use Medsang. Some use internal portals. Some send spreadsheets. Each platform asks essentially the same questions — "What is the CAS number?", "Does this product comply with BfR Recommendation XIV?", "List all substances of very high concern above 0.1% by weight" — but phrased differently, structured differently, formatted differently.

Omya's compliance manager, Abdessamad Arbaoui, estimates that 75-80% of the questions he receives across all platforms are identical in substance, just different in form. He answers each one manually. He gets 6-10 requests per customer per year — not enough volume on any single platform to justify paying for a subscription, but the aggregate burden across all customers is enormous.

No incumbent platform has any incentive to solve this. 3E wants Omya's data inside 3E. Medsang wants it inside Medsang. Every platform's business model depends on being the silo. The problem isn't technical — it's structural. Nobody profits from interoperability.

Except StaxData.

## What the CDR Does

The Compliance Data Router is intelligent middleware. A supplier enters their compliance data once, structured against international standards. When a request arrives from any customer — in any format, through any channel — the CDR maps those questions to the supplier's existing data and outputs answers in whatever format the requesting platform requires.

The intelligence is in the mapping. When a customer sends a spreadsheet with 200 questions about BfR compliance, the CDR's AI normalization engine reads each question, understands what it's actually asking regardless of phrasing or language, and maps it to the correct canonical parameter from a standardized library. The supplier doesn't see 200 questions. They see: "We already have answers for 160 of these. Review the 40 gaps."

The pipeline has six steps:

**INGEST** — Customer submits questions in any format. Paste text, upload a spreadsheet, or (eventually) push via API. The system parses intelligently, detecting headers, skipping instruction tabs, extracting question text from the correct column.

**NORMALIZE** — AI maps each raw question to a canonical parameter. Confidence scores and reasoning are shown for every mapping. The customer reviews: accept, reject, or manually remap. Bulk-accept everything above 85% confidence.

**DELIVER** — Export the normalized questions to the supplier in their preferred format. Currently spreadsheet; future connectors include email, 3E API, SAP EHS, and a native web UI.

**RETRIEVE** — Supplier submits responses. Upload a completed spreadsheet, enter data through web forms, or attach documents (SDS, certificates, declarations).

**REGISTER** — AI validates supplier responses. Missing fields, format errors, out-of-range values, incomplete detail tables, substance mismatches against reference lists like the PIDSL. Each issue is flagged with severity: error (must fix), warning (should review), info (note).

**REVIEW** — Customer reviews supplier responses with AI-flagged issues surfaced. Approve, reject with notes, or request revision.

## How It Will Be Built

The CDR exists in two versions, built in sequence.

### Version 1: The Router (Built)

The standalone CDR application is functionally complete. Nine development phases finished as of late February 2026. Sixteen database tables. All six pipeline pages. AI normalization and validation using Claude Sonnet. A spreadsheet connector that handles both export and import. Twenty-four answer type schemas and twelve regulatory jurisdictions seeded from StaxData's HQ 2.1 questionnaire workbook.

What remains before it can be demonstrated:

First, the parameter library needs seeding. The canonical parameters — the standardized questions that all customer questions are normalized against — need to be populated from the HQ 2.1 workbook. This is a data entry and validation task, not an engineering task.

Second, it needs testing with real questionnaire data. Take an actual spreadsheet that Sappi or UPM sends to their suppliers, run it through the INGEST and NORMALIZE pipeline, and verify that the AI mappings are accurate. This will reveal whether the parameter library is comprehensive enough and whether the normalization prompts handle real-world question phrasings.

Third, deployment. The application needs to be accessible to development partners for testing. Vercel deployment, Supabase database provisioning, authentication setup.

Fourth, a demo for Abde at Omya and Zahra at BASF. This is the validation moment. If Abde uploads a real questionnaire he received from a customer and the system correctly normalizes 70%+ of the questions on the first pass, the concept is proven.

### Version 2: The Brain (Planned)

Once Version 1 has paying customers and generates review data, Version 2 adds intelligence that compounds over time.

The core addition is vector embeddings. Every canonical parameter gets a semantic vector representation via OpenAI's text-embedding-3-small model. Every question — both the 221 internal questions and any external questionnaire questions — gets embedded too. When keyword rules miss, vector similarity fills the gap. A German BfR questionnaire asking "Bitte geben Sie die CAS-Nummer an" won't match English keyword rules, but its embedding will land very close to confirmed English equivalents.

The second addition is the reinforcement loop. Every time a human reviews a mapping — supplier accepts, customer approves, someone edits — that's a training signal. Confirmed mappings are recorded as semantic links: anonymous patterns like "the concept 'CAS number' reliably maps to Question 42." These patterns contain no private data. They're shared across the entire network.

The compounding effect is genuine: Supplier A's confirmed mapping helps Supplier B get a better match next time, without sharing any of Supplier A's actual data. The system ages like wine. Every interaction makes the next one better. This is not data lock-in — it's data that improves with age. A positive reason to stay, not a hostage situation.

The matching evolves through three phases as data accumulates. Initially, semantic matching runs alongside keyword rules in coexistence mode — it can only help, never hurt. After roughly 500 confirmed links, the system blends both signals. After 2,000 confirmed links, semantic matching becomes primary, with keywords as a tiebreaker.

StaxData's existing data — 367,000 answers across 1,293 sheets from Sappi and UPM — can be retroactively converted into semantic links, providing a substantial warm start rather than a cold one.

## What Could Go Wrong

### The parameter library might be too narrow

The canonical parameter library is initially seeded from one questionnaire format (HQ 2.1). Real-world customer questionnaires will contain questions that don't map to any existing parameter. The system flags these as unmatched, but if the unmatch rate is above 30%, the value proposition weakens. "We pre-filled 70% of your questionnaire" is compelling. "We pre-filled 50%" is marginal. Below that, a supplier might decide manual entry is easier than reviewing AI mappings.

The mitigation is incremental library expansion. Every unmatched question from a real customer questionnaire is a candidate for a new parameter. The library grows with usage. But this requires active curation — someone (Scott, or eventually an AI pipeline) needs to review unmatched questions and decide which ones warrant new parameters.

### AI normalization accuracy is unproven at scale

The normalization engine has been tested with synthetic data. Real-world questionnaires are messier: ambiguous phrasings, compound questions ("Does the product comply with BfR XIV and XV?"), questions that assume context ("Same as above but for the outer coating"), and multi-language mixed-language entries. If the AI produces confident but wrong mappings, and the customer bulk-accepts at 85% confidence, incorrect data propagates through the system.

The mitigation is the human review step. Every mapping passes through customer eyes before becoming official. But the UX of that review step matters enormously — if it's tedious to verify 200 mappings, users will rubber-stamp them. The review interface needs to make correct/incorrect mappings visually obvious at a glance.

### The connector problem

The spreadsheet connector is the MVP, and it works. But the real value of the CDR is reducing the number of platforms a supplier touches. If Sappi uses 3E and the CDR can only export spreadsheets, the supplier still has to manually import that spreadsheet into 3E. The friction reduction is partial.

Building connectors to 3E, Medsang, SAP EHS, and other platforms is a significant engineering effort. Each platform has its own API (or no API at all), authentication model, data format, and rate limits. Some may require partnership agreements. This is the long tail of integration work that separates a working prototype from a production system.

### Solo founder execution risk

Scott is building this alone with AI assistance. The CDR application exists, but seeding the parameter library, testing with real data, deploying, supporting development partners, iterating on feedback, and building additional connectors is a substantial workload for one person with three months of runway. There is no margin for getting sick, hitting a technical dead-end, or losing a development partner.

### The chicken-and-egg problem

The CDR's value to suppliers scales with the number of customers using it. If only one customer sends requests through the CDR, the supplier saves no time — they could just answer that one customer's questionnaire directly. The value emerges when 3, 5, 10 customers all send requests through the CDR and the supplier's data serves all of them.

But customers won't use the CDR until suppliers are on it, and suppliers won't join until customers are sending requests through it. The existing Sappi and UPM relationship provides an initial answer — their suppliers are already in the system — but growing beyond that initial cluster requires deliberate network-building.

### Privacy and competitive intelligence

Chemical companies treat their formulations like trade secrets. The CDR processes sensitive compositional data: CAS numbers, concentration percentages, substance lists. Even with Anthropic's zero-retention API policy and row-level security in the database, some suppliers will be reluctant to centralize their data on a third-party platform, especially one run by a solo founder without enterprise security certifications.

The CDR v2 reinforcement layer adds another dimension: even though semantic links contain no private values, the existence of certain link patterns could theoretically reveal that a supplier works with specific substance categories. This concern needs legal review before the reinforcement layer launches.

## Chances of Success

### What works in favor

**The problem is real and validated.** Abde at Omya didn't just nod politely — he called it "a gold mine." He lives this pain every day. BASF's Zahra is independently hosting a webinar on the exact problem CDR solves. The EU Digital Product Passport regulation will make it significantly worse within three years. This is not a solution looking for a problem.

**The structural advantage is genuine.** No incumbent platform benefits from interoperability. 3E, Medsang, and every other compliance platform profits from being the silo. The CDR profits from connecting silos. This is a market position that incumbents cannot easily replicate without cannibalizing their own business model.

**The technology is proven.** AI normalization of structured questionnaire data is well within current LLM capabilities. Vector similarity search is mature technology. The core engineering risk is low. The risk is in product-market fit, not in technical feasibility.

**The existing data is an asset.** 367,000 answers, 1,293 sheets, 150-200 sheets each from Sappi and UPM, covering hundreds of products from dozens of suppliers. This is seed data that competitors starting from zero don't have.

**Regulatory tailwind.** The EU Digital Product Passport isn't optional. It's coming. When it arrives, every product sold in the EU will need structured compliance data in standardized formats. The CDR is positioned ahead of this wave.

### What works against

**Three months of runway.** The financial situation is tight. There is time to demo, iterate once, and maybe close one deal. There is not time to build connectors, handle enterprise security objections, and scale to multiple customers. If the first demo doesn't land, or if the development partners can't commit to a paid engagement within 60 days, the window closes.

**Solo execution.** The CDR is an ambitious product for a team of ten, let alone one person with AI assistance. The quality of the demo, the speed of iteration, and the responsiveness to partner feedback all depend on Scott's bandwidth. Parkinson's, family commitments, and a parallel job search all compete for the same finite energy.

**Network effects need a network.** The compounding value — semantic links, cross-supplier intelligence, the wine-aging metaphor — requires volume. With 2 customers and a handful of suppliers, the network effect is theoretical. It becomes real at 10+ customers and 50+ suppliers. Getting there from here is the hard part.

### The honest assessment

The CDR has a legitimate shot at becoming a meaningful business, but it's a narrow path. The concept is validated, the technology works, and the regulatory environment is favorable. The constraint is time and money. Three months is enough to prove the concept with real data and real users. It is not enough to build a sustainable business.

The most likely path to survival: demo CDR v1 to Omya and BASF within two weeks. If Abde confirms it works with real data, use that validation to either (a) close a paid pilot with one of their customers, or (b) raise a small amount of funding on the strength of a working product with named development partners in the paper and chemicals industry. Either outcome extends the runway. Neither is guaranteed.

The CDR v2 vision — the compounding intelligence, the universal translator, the wine-aging moat — is the long-term play that makes StaxData defensible. But it only matters if StaxData survives to build it.
