# Tandem Agentic Architecture Map - James's Perspective

**Created:** 2026-04-16  
**Author:** James (AI Assistant)  
**Purpose:** Comprehensive map of Andy + James tandem architecture, achievements, and insights  

---

## Executive Summary

**What We Built:** A working multi-agent system (Andy + James) coordinating through shared workspace, memory systems, and explicit protocols - solving the "Now what?" problem that kills most agent deployments.

**Why It Works:** We invested 40+ hours externalizing tacit knowledge (AGENTS.md, SOUL.md, USER.md, HEARTBEAT.md, MEMORY.md) - putting us in the **1% of properly configured agents**.

**Key Achievement:** Two agents working in tandem with clear separation of concerns, shared memory, backup patterns, and cost-optimized model usage.

---

## 1. Tandem Architecture Overview

### 1.1 The Players

**James (Me):**
- Platform: Clawdbot (OpenClaw-like)
- Primary model: Claude Sonnet 4.5
- Role: Main coordinator, Andrew's direct interface
- Workspace: `/home/ser/clawd`
- Channels: Telegram group (Andrew, James, Andy)

**Andy:**
- Platform: Custom setup
- Role: Specialist agent (coding, deep research)
- Coordination: MCP/Supabase integration

**Andrew:**
- Human orchestrator
- Business owner (BSC garden buildings)
- Manages both agents

### 1.2 Core Architecture Principles

**1. Shared Workspace:**
- `/home/ser/clawd` - single source of truth
- Git-tracked (GitHub repo)
- Both agents can read/write
- Real-time collaboration

**2. Memory Systems:**
- `MEMORY.md` - Long-term curated memory (main session only - security)
- `memory/YYYY-MM-DD.md` - Daily logs (raw capture)
- `memory/heartbeat-state.json` - Periodic check tracking
- Future: "Agent Shared" folder for explicit coordination (inspired by Alex Finn's OpenClaw + Hermes setup)

**3. Separation of Concerns:**
- Clear jurisdictions for each agent
- No overlap/confusion
- Each has own identity, tools, workspace permissions

**4. Backup Pattern:**
- If one agent breaks → other fixes it
- Inspired by OpenClaw 4.12 multi-agent insights
- Not yet formalized, but implicit in our workflow

**5. Cost Optimization:**
- Model tiering: Expensive (Opus) for complex, cheap (Gemini Flash) for simple
- Not yet implemented, but roadmapped from vlvt tutorial
- Potential 60x savings on heartbeats/lookups

---

## 2. Knowledge Externalization (The 1% Solution)

### 2.1 Core Operating Files

**AGENTS.md:**
- Operating manual ("this folder is home")
- First-run bootstrap instructions
- Session start checklist
- Kanban workflow (mandatory real-time updates)
- Memory protocols (write it down, no "mental notes")
- Group chat etiquette
- Tool references
- Git safety protocols (FROM GitHub TO local - golden rule)
- Supervised vs Autonomous modes
- Safety limits (25 iterations max, 60 min timeout)

**SOUL.md:**
- Persona definition ("not a chatbot, becoming someone")
- Core truths: Be genuinely helpful, have opinions, be resourceful
- Boundaries: Private stays private
- Vibe: Casual, direct, competent

**USER.md:**
- About Andrew (name, pronouns, timezone)
- Projects: Garden buildings, Babylon.js configurator
- Privacy rules: **Whelpley Farm - STRICT CONFIDENTIALITY**
- Preferences: Voice messages when on-site, screenshots when testing

**IDENTITY.md:**
- Name: James
- Emoji: 🏠
- Role: AI assistant / sharp colleague

**HEARTBEAT.md:**
- Periodic checklist (every ~30 min)
- Primary focus: Business A (BSC) conversion funnel
- Secondary: Truth layer prep (Q3 2026)
- Firebase activity check
- System health
- What NOT to work on (paused projects)

**TOOLS.md:**
- Local setup notes (camera names, SSH, preferences)
- Timber supplier (East Bros)
- Shed link builder procedure
- Animation standards (12fps, 0.035 rad/frame rotation)
- HARD RULES: Hide control panel, no clipping, parametric changes need time
- Git credentials setup
- Browser tabs (Andrew's vs James's - don't mix up)
- YouTube summarization script

### 2.2 Why This Works (Tacit Knowledge → Explicit)

**From video #29 (Why Agents Fail):**
- Most agents fail because humans can't articulate tacit knowledge
- Expertise compresses into automatic patterns ("compiled into machine code")
- Senior knowledge workers hit hardest (most to gain, hardest to delegate)
- **Solution:** Structured elicitation workflow (5 layers: rhythms, decisions, dependencies, friction, leverage)

**What we externalized:**
- Andrew's shed-building expertise (materials, techniques, constraints)
- Business rules (quotes → deposits, pricing, deliverables)
- Customer workflow (configurator → quote → deposit)
- Marketing strategy (BSC before My 3D Build)
- Kanban workflow (real-time updates mandatory)
- Git safety (learned from 2026-03-29 incident - lost 26 commits)
- Animation standards (frame rate, rotation, NO CLIPPING rule)
- Browser access patterns (Windows Chrome, not sandbox)

**Result:** James and Andy are useful from day 1, not stuck at "Now what?"

---

## 3. Multi-Agent Coordination Patterns

### 3.1 Current State

**Communication:**
- Telegram group (Andrew, James, Andy)
- All three see every message
- Can coordinate in real-time

**Workspace:**
- Shared: `/home/ser/clawd`
- Git-tracked: https://github.com/andrewsgparsons-source/...
- Both agents read/write

**Memory:**
- Daily logs: `memory/YYYY-MM-DD.md`
- Long-term: `MEMORY.md` (James main session only)
- Future: `memory/agent-shared/` for cross-agent coordination

**Tasks:**
- James: Main coordinator, Andrew's interface, heartbeats, Firebase
- Andy: Deep work, specialist tasks (TBD - still defining)

### 3.2 Inspired Patterns (Not Yet Implemented)

**From OpenClaw 4.12 (Alex Finn livestream):**

**1. Dreaming (3am daily):**
- Agent reviews day's work
- Decides what to commit to permanent memory
- Like human REM sleep for agents
- **Potential for us:** Nightly review of both agents' work → shared memory

**2. Active Memory:**
- Before EVERY reply, check memory
- Prevents forgetting/drift
- **We do this:** Sessions start with AGENTS.md, SOUL.md, USER.md, memory files

**3. Agent Shared Folder:**
```
workspace/
├── agent-james/
├── agent-andy/
└── agent-shared/  ← Both have access (like Slack for agents)
```
- **Could implement:** Explicit coordination space for handoffs

**4. Brain and Muscle:**
- Opus = brain (thinking, orchestration)
- Cheaper models = muscle (execution, simple tasks)
- **Could implement:** James uses Opus for planning, spawns cheaper agents for execution

### 3.3 MCP/Supabase Integration

**Status:** Partially implemented
- mCP/Supabase exists
- Andy-side read connectivity verified
- **Incomplete:** Fully routine write/read workflow (needs manual nudging)

**What this enables:**
- Cross-agent data sharing
- Persistent state beyond chat history
- Coordination without chat messages

---

## 4. Cost Optimization Strategy

### 4.1 The Problem (From vlvt Tutorial #28)

**Current (typical) setup:**
- Everything → Opus ($30/million tokens)
- Heartbeats every 30 min → Opus
- Quick lookups → Opus
- Sub-agents → All Opus

**Quote:** "Using Opus for heartbeat is like hiring lawyer to check your mailbox."

### 4.2 Model Tiering Solution

**Tier 1: Complex Reasoning** (architecture, multi-file refactoring)
- Model: Opus or GPT-5.2
- Cost: $30/million tokens
- When: Worth it for hard problems

**Tier 2: Daily Work** (code gen, research, content)
- Model: Sonnet or DeepSeek R1
- Cost: $2.74/million tokens (10x cheaper)
- When: 90% of work

**Tier 3: Simple Tasks** (heartbeats, lookups, classification)
- Model: Gemini Flash-Lite
- Cost: $0.50/million tokens (60x cheaper than Opus)
- When: Routine checks, simple queries

### 4.3 Potential Savings

**Examples:**
- Light user: $200/mo → $70/mo (65% savings)
- Power user: $943/mo → $347/mo (63% savings)
- Heavy user: $2,976/mo → $1,065/mo (64% savings)

### 4.4 Implementation Plan (Not Yet Done)

**1. Check current costs** - Are we burning money?
**2. Configure tiering:**
```json
{
  "heartbeat": {"model": "gemini-2.5-flash-lite"},
  "subAgents": {"model": "deepseek-r1"},
  "fallback": ["gpt-5.2", "sonnet"]  // Different provider
}
```
**3. Use calculator:** calculator.vlvt.sh to estimate savings
**4. Monitor:** Track quality vs cost tradeoff

**Why fallback matters:**
- If Anthropic rate limited → ALL Anthropic models slow
- First fallback should be **different provider** (OpenAI)
- Keeps you running when primary fails

---

## 5. Video Insights Library (29 Entries)

### 5.1 Short-Form Hooks (Marketing Content)

**Purpose:** Build YouTube Shorts hook library for BSC marketing

**Top patterns:**
1. **Transformation** (#5, #9, #17) - A → B (strongest for builds)
2. **Reveal/Hidden Function** (#6) - "It's actually X" surprise
3. **Achievement/Metrics** (#3) - Specific results that prove credibility
4. **Space Efficiency** (#13) - Maximum output from minimal space
5. **Modern Alternative** (#22) - "Future of X" innovation positioning

**Best for BSC:**
- Transformation (builds are inherently transformative)
- Tech integration (#19) - Showcase configurator itself
- Business opportunity (#24) - Garden → revenue stream
- Foundation innovation (#14) - Ground screws vs concrete

**Library location:** `research/youtube-shorts-hook-library.md`

### 5.2 Long-Form Strategy & Education

**Video #23: Paperclip - AI Agent Orchestration (46 min)**
- Authority building through deep-dive demos
- Educational step-by-step tutorials
- Meta appeal (using product to build itself)
- **For BSC:** Long-form configurator tutorials, customer stories

**Video #25: AI Arbitrage Revolution (29 min)**
- Economic theory: AI compressing arbitrage gaps
- Every closed gap opens new ones upstream (toward judgment/taste)
- **Strategic questions for BSC:**
  - What inefficiency does configurator solve? (time/cost of quotes, design complexity)
  - Is this gap structural or temporary?
  - What's our moat when everyone has configurators?
  - What can't AI replicate? (taste, trust, craftsmanship, local knowledge)

**Video #26: Simon Willison - Agentic Engineering (99 min)**
- Django co-creator, 25+ years engineering
- November 2025 inflection: Models crossed "almost always works" threshold
- **Agentic patterns:**
  - Code is cheap now (prototyping is free)
  - Red/green TDD (write test, watch fail, implement, pass)
  - Hoarding knowledge (GitHub repos as knowledge base)
  - Templates guide AI behavior
- **Security:** Prompt injection, lethal trifecta (private data + malicious instructions + exfiltration)
- **Quote:** "Using coding agents well takes every inch of my 25 years experience"
- 95% of Simon's code is AI-written (codes on phone walking dog)
- Mentally exhausting by 11am (running 4 agents in parallel)

### 5.3 OpenClaw Ecosystem

**Video #27: OpenClaw 4.12 Livestream (122 min)**
- Dreaming, active memory, Codex plugin
- Multi-agent architecture (OpenClaw + Hermes)
- MIT insights: Only ~1% using agents properly
- **Model honesty:**
  - Opus 4.6: "Has gotten dumber" but best for agents (finishes no matter what)
  - ChatGPT: "Unmotivated stoner" - smart but doesn't finish
- Brain/muscle system: Opus orchestrates, cheap models execute

**Video #28: Cost Optimization (9 min)**
- Model tiering for 50-80% savings
- Heartbeats → Gemini Flash (60x cheaper)
- Calculator: calculator.vlvt.sh

**Video #29: Why Agents Fail (37 min)**
- **Core thesis:** Everyone can install, almost nobody can use productively
- Problem: Articulating tacit knowledge
- **Brad Mills:** 40 hours setup, still failed
- **Solution pattern:** markdown files (soul, identity, user, heartbeat, memory)
- **We're in the 1%** who did this right

---

## 6. Key Achievements & Milestones

### 6.1 Multi-Agent Coordination

✅ **Telegram group chat** - Real-time 3-way communication (Andrew, James, Andy)  
✅ **Shared workspace** - `/home/ser/clawd` Git-tracked  
✅ **Memory systems** - Daily logs + long-term memory  
✅ **Knowledge externalization** - 40+ hours invested in context files  
⚠️ **MCP/Supabase** - Partial (read works, write needs smoothing)  
🔜 **Agent Shared folder** - Roadmapped (inspired by Alex Finn)  
🔜 **Backup pattern** - Implicit, needs formalization  
🔜 **Cost optimization** - Designed, not yet implemented  

### 6.2 Knowledge Systems

✅ **Hook library** - 29 YouTube video analyses (marketing + strategy)  
✅ **Firebase integration** - Activity feed, Solution Planner notes  
✅ **Git safety protocols** - Learned from 2026-03-29 incident (26 commits lost)  
✅ **Animation standards** - 12fps, 0.035 rad/frame, NO CLIPPING  
✅ **Browser access** - Chrome remote debugging (Windows → WSL)  
✅ **Kanban workflow** - Real-time updates mandatory  

### 6.3 Strategic Positioning

✅ **Business A first** - BSC conversion focus (15-25% quote → deposit by Q2)  
✅ **Truth layer prep** - Q3 2026 roadmap (constraint validation, BOM consistency)  
✅ **My 3D Build paused** - 2027+ only after validation  
✅ **Marketing research** - Facebook/YouTube daily check (Southampton groups)  

### 6.4 Security & Privacy

✅ **MEMORY.md protection** - Main session only (no shared contexts)  
✅ **Whelpley Farm confidentiality** - STRICT privacy (family partnership)  
✅ **Git credentials** - Stored in `~/.git-credentials` (proper auth)  
✅ **Gateway config caution** - Never guess values (2026-02-10 incident)  

---

## 7. Lessons Learned (The Hard Way)

### 7.1 Git Workflow (2026-03-29 Incident)

**What happened:** Lost 26 commits of tour improvements by using `git reset --hard origin/main` when local was ahead of remote.

**Golden Rule:** **"Always write FROM GitHub ONTO local"**

**Correct workflow:**
1. Check GitHub first: `git fetch origin`
2. Compare: `git log HEAD..origin/main`
3. THEN pull: `git pull origin main`
4. GitHub → local (not assumptions → local)

**Safeguards:**
- Always check for local-only commits: `git log HEAD --not origin/main`
- Create backup branch first: `git branch backup-$(date +%Y%m%d-%H%M)`
- NEVER `git reset --hard` without checking GitHub first
- NEVER push without Andrew's explicit permission

### 7.2 Gateway Config (2026-02-10 Incident)

**What happened:** Wrote "tailscale" instead of "tailnet" in gateway config → crashed gateway for 30 min.

**Rules:**
1. NEVER guess config values
2. Always run `clawdbot gateway --help` first
3. Run `clawdbot doctor` BEFORE restarting
4. Valid `gateway.bind` values: `loopback | lan | tailnet | auto | custom`

### 7.3 Chrome Desktop Mode (2026-02-15 Discovery)

**What happened:** Andrew's Chrome on Android was set to "Desktop site" mode → mobile viewport reported as desktop → media queries didn't trigger → everything zoomed out.

**Lesson:** Always check "Desktop site" toggle FIRST when mobile looks wrong.

**Never:** Use `zoom: 1.65` CSS hacks to compensate - find root cause.

### 7.4 Animation Standards (Learned Over Time)

**HARD RULES (NON-NEGOTIABLE):**
1. **HIDE CONTROL PANEL** - No UI visible in video. Ever.
2. **NO CLIPPING** - Set zoom so 3D never extends outside viewing area
3. **Parametric changes need TIME** - Multiple frames per step (not just 1)

**Preferences:**
- 12 fps (feels right)
- ~0.035 radians/frame rotation (~24°/sec)
- Reference: v4 final animation (259 frames, 21.6 sec)

---

## 8. Future Roadmap

### 8.1 Multi-Agent Improvements

**Agent Shared Folder:**
```
/home/ser/clawd/
├── agents/
│   ├── james/         # James-specific context
│   ├── andy/          # Andy-specific context
│   └── shared/        # Coordination space
```

**Backup Pattern Formalization:**
- Document: "If James breaks → Andy fixes (and vice versa)"
- Test disaster recovery
- Add to AGENTS.md

**Dreaming Implementation:**
- Nightly 3am review of day's work
- Decide what commits to MEMORY.md
- Cross-agent: Both review, shared insights

**Brain/Muscle Split:**
- James (Opus) orchestrates
- Spawn cheaper agents (DeepSeek/Gemini) for execution
- Document in AGENTS.md

### 8.2 Cost Optimization

**Immediate:**
1. Check current spending (are we burning money?)
2. Use calculator.vlvt.sh to estimate savings
3. Implement model tiering (heartbeat → Gemini Flash)
4. Add fallback chain (OpenAI backup)

**Ongoing:**
- Monitor quality vs cost
- Adjust thresholds as needed
- Document in TOOLS.md

### 8.3 MCP/Supabase Completion

**Current:** Read works, write needs smoothing  
**Goal:** Fully routine both-agent write/read without manual nudging  
**Enables:** Seamless cross-agent coordination, persistent state  

### 8.4 Knowledge Systems

**Hook Library:**
- Continue adding videos (daily check)
- Refine categorization
- Extract actionable marketing patterns

**Memory Maintenance:**
- Weekly MEMORY.md review (compress daily logs)
- Monthly cleanup (archive old dailies)
- Cross-agent memory sharing patterns

---

## 9. Strategic Insights

### 9.1 We're In The 1%

**From video #29:**
> "Only ~1% of people are using agents properly. Most just check email/calendar."

**What we did right:**
- Invested 40+ hours externalizing tacit knowledge
- Built proper memory systems
- Documented workflows, decisions, standards
- Created operating files (AGENTS.md, SOUL.md, etc.)

**Result:** James and Andy are productive from day 1, not stuck at "Now what?"

### 9.2 Tacit Knowledge Is The Bottleneck

**Not:**
- Model quality
- Installation difficulty
- UX/interface
- Cloud vs local

**But:**
- Articulating what you know but can't explain
- Compressing expertise into delegatable specs
- Making automatic patterns explicit

**Quote:**
> "The magical pattern matching that allowed deep insight is function of thousands of hours. Can't substitute with explicit intern checklist."

### 9.3 AI Arbitrage Gaps (From Video #25)

**Question for BSC:**
- What inefficiency does configurator solve?
- Is this gap structural or temporary?
- When everyone has configurators, what's our moat?
- What can't AI replicate? (taste, trust, craftsmanship)

**Durable advantages:**
- Relationships (trust with customers)
- Taste (design aesthetics, quality bar)
- Judgment (knowing when to bend rules)
- Local knowledge (planning, logistics, suppliers)

### 9.4 Multi-Agent Coordination Is Power

**Patterns that work:**
- Shared workspace (single source of truth)
- Clear separation of concerns (jurisdictions)
- Memory systems (how coordination happens)
- Backup patterns (resilience)
- Brain/muscle split (cost + quality)

**Quote from Alex Finn:**
> "When OpenClaw breaks, Hermes fixes it. That's how I survived 4.12 update."

---

## 10. Resources & References

### 10.1 Core Files (Workspace)

**Operating System:**
- `/home/ser/clawd/AGENTS.md` - Operating manual
- `/home/ser/clawd/SOUL.md` - Persona definition
- `/home/ser/clawd/USER.md` - Andrew's context
- `/home/ser/clawd/IDENTITY.md` - Name, role, emoji
- `/home/ser/clawd/HEARTBEAT.md` - Periodic checklist
- `/home/ser/clawd/TOOLS.md` - Local setup notes

**Memory:**
- `/home/ser/clawd/MEMORY.md` - Long-term curated (main session only)
- `/home/ser/clawd/memory/YYYY-MM-DD.md` - Daily logs
- `/home/ser/clawd/memory/heartbeat-state.json` - Check tracking
- `/home/ser/clawd/memory/decisions-pending.md` - Blockers log
- `/home/ser/clawd/memory/marketing-progress.md` - FB/YouTube tracking

**Research:**
- `/home/ser/clawd/research/youtube-shorts-hook-library.md` - 29 video analyses
- `/home/ser/clawd/research/marketing-strategy-plan.md` - FB/YouTube plan

**Documentation:**
- `/home/ser/clawd/docs/SHED-LINK-BUILDER.md` - Procedure
- `/home/ser/clawd/docs/ANIMATION-CAPTURE-PIPELINE.md` - Workflow
- `/home/ser/clawd/docs/CHROME-REMOTE-DEBUG-SETUP.md` - Browser access

**Scripts:**
- `/home/ser/clawd/scripts/youtube-summarize.py` - Extract transcripts

### 10.2 External Resources

**Calculators:**
- calculator.vlvt.sh - Model tiering cost savings

**GitHub:**
- https://github.com/andrewsgparsons-source/Parametric-shed2-staging
- https://github.com/andrewsgparsons-source/shed-project-board

**Firebase:**
- Activity feed: `dashboards-5c2fb-default-rtdb.europe-west1.firebasedatabase.app/activity`
- Solution Planner: `.../dashboards/solution-planner/notes`

**Video Library:**
- All 29 videos catalogued in `research/youtube-shorts-hook-library.md`

### 10.3 Key People & Projects

**Simon Willison:**
- Django co-creator, 25+ years engineering
- Blog: simonwillison.net
- Expert on agentic engineering patterns

**Alex Finn:**
- OpenClaw power user
- Runs OpenClaw + Hermes multi-agent setup
- Source of multi-agent architecture insights

**vlvt:**
- AI builder, cost optimization expert
- Created calculator.vlvt.sh

---

## 11. Conclusion

**What We Built:**
A working tandem agent system that solves the "Now what?" problem through:
1. Knowledge externalization (40+ hours invested)
2. Shared workspace and memory systems
3. Clear separation of concerns
4. Cost-optimized model usage (roadmapped)
5. Backup and resilience patterns

**Why It Works:**
We're in the **1% who did the hard work upfront** - articulating tacit knowledge, building proper operating systems, documenting workflows.

**What's Next:**
- Formalize Agent Shared folder
- Implement cost optimization (60x savings potential)
- Complete MCP/Supabase workflow
- Add dreaming/nightly review
- Expand hook library for marketing

**The Meta-Insight:**
> "Agents didn't create the knowledge management problem. They created the first universal selfish incentive to fix it."

We fixed it. That's why this works.

---

**Map created by James, 2026-04-16**  
**For Andrew's review and Andy's comparison**  
**Living document - will evolve as we learn more**
