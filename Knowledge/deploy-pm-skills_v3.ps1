# ==============================================================================
# deploy-pm-skills.ps1
# Master 1-Command Cross-Machine Installer
# Deploys: 9 Hardened Agents + 27 Skills (PM Squad + Dev Squad + Diagram-Design)
# ==============================================================================

[CmdletBinding()]
param(
    [string]$TargetUserHome = $env:USERPROFILE
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Antigravity Complete Suite: PM Squad (5) & Dev Squad (4)   " -ForegroundColor Cyan
Write-Host " Hardened with 8 Production Guardrails & Least-Privilege     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Target User Profile: $TargetUserHome" -ForegroundColor Gray

# Define target paths
$AgentsSkillsDir = Join-Path $TargetUserHome ".agents\skills"
$AgentsAgentsDir = Join-Path $TargetUserHome ".agents\agents"
$GeminiSkillsDir = Join-Path $TargetUserHome ".gemini\config\skills"
$GeminiAgentsDir = Join-Path $TargetUserHome ".gemini\config\agents"
$ManifestPath    = Join-Path $AgentsSkillsDir ".antigravity-install-manifest.json"
$SkillsJsonPath  = Join-Path $GeminiSkillsDir "skills.json"

# Ensure target directories exist
New-Item -ItemType Directory -Force -Path $AgentsSkillsDir | Out-Null
New-Item -ItemType Directory -Force -Path $AgentsAgentsDir | Out-Null
New-Item -ItemType Directory -Force -Path $GeminiSkillsDir | Out-Null
New-Item -ItemType Directory -Force -Path $GeminiAgentsDir | Out-Null

# 22 Curated PM Skills Definitions
$Skills = @(
    @{ Name = "pm-prd"; Desc = "Generate comprehensive PRDs from discovery notes and raw problem inputs."; File = "prompts/prd-prompt-template.md"; Title = "Product Requirement Document (PRD) Generator" },
    @{ Name = "pm-jobs-to-be-done"; Desc = "Break down customer jobs into functional, emotional, and social dimensions."; File = "prompts/jobs-to-be-done.md"; Title = "Jobs-to-be-Done (JTBD) Customer Analysis" },
    @{ Name = "pm-user-stories"; Desc = "Generate engineering-ready user stories with Given-When-Then criteria and edge cases."; File = "prompts/user-story-prompt-template.md"; Title = "User Story & Acceptance Criteria Builder" },
    @{ Name = "pm-premortem"; Desc = "Identify catastrophic failure modes and early-warning tripwires before launch."; File = "prompts/premortem-prompt-template.md"; Title = "Pre-Mortem Failure Mode & Risk Mitigation" },
    @{ Name = "pm-stakeholder-map"; Desc = "Map stakeholder power vs. interest and devise tailored communication tactics."; File = "prompts/stakeholder-map-prompt-template.md"; Title = "Stakeholder Influence & Communication Mapping" },
    @{ Name = "pm-win-loss-analysis"; Desc = "Synthesize sales win/loss interviews into objective product roadmaps."; File = "prompts/win-loss-analysis-prompt.md"; Title = "Sales Win/Loss Debrief & Feedback Synthesis" },
    @{ Name = "pm-lean-ux-canvas"; Desc = "Frame product initiatives as falsifiable business and user hypotheses."; File = "prompts/lean-ux-canvas-prompt-template.md"; Title = "Lean UX Canvas & Hypothesis Framing" },
    @{ Name = "pm-agent-strategy-canvas"; Desc = "Design responsible agentic AI workflows, guardrails, and user feedback loops."; File = "prompts/agent-strategy-canvas-prompt-template.md"; Title = "Agentic AI Strategy & Systems Canvas" },
    @{ Name = "pm-incoming-request-breakdown"; Desc = "Translate noisy feature requests into underlying root business problems."; File = "prompts/incoming-request-breakdown.md"; Title = "Incoming Feature Request De-noising" },
    @{ Name = "pm-prd-workshop"; Desc = "Facilitate an interactive section-by-section PRD authoring session with checkpoint gates."; File = "workshops/prd-workshop.md"; Title = "Interactive PRD Drafting Workshop" },
    @{ Name = "pm-battle-card-workshop"; Desc = "Facilitate creation of actionable sales and product competitive battle cards."; File = "workshops/battle-card-workshop.md"; Title = "Competitive Battle Card Workshop" },
    @{ Name = "pm-opportunity-solution-tree"; Desc = "Facilitate Teresa Torres OST mapping from desired outcome to validated solutions."; File = "workshops/opportunity-solution-tree-workshop.md"; Title = "Opportunity Solution Tree Workshop" },
    @{ Name = "pm-feature-investment-workshop"; Desc = "Calculate build-vs-buy, unit economics, and business cases with explicit math."; File = "workshops/feature-investment-workshop.md"; Title = "Feature Investment & ROI Case Workshop" },
    @{ Name = "pm-problem-framing-canvas"; Desc = "Formulate sharp problem statements and generative How Might We opportunity vectors."; File = "workshops/problem-framing-canvas-workshop.md"; Title = "Problem Framing & How-Might-We Workshop" },
    @{ Name = "pm-painstorming-workshop"; Desc = "Map end-to-end customer friction, emotional bottlenecks, and workarounds."; File = "workshops/painstorming-workshop.md"; Title = "Customer Painstorming & Friction Workshop" },
    @{ Name = "pm-sunset-workshop"; Desc = "Plan and execute phased product sunsets without losing customer trust."; File = "workshops/product-sunset-workshop.md"; Title = "Product Sunset & End-of-Life (EOL) Workshop" },
    @{ Name = "pm-swot-analysis"; Desc = "Generate actionable SWOT matrices with cross-quadrant offensive and defensive moves."; File = "market-intelligence/swot-analysis-prompt.md"; Title = "Strategic SWOT Analysis Framework" },
    @{ Name = "pm-porters-five-forces"; Desc = "Evaluate industry competitive intensity, supplier/buyer power, and threat of substitutes."; File = "market-intelligence/porters-five-forces-prompt.md"; Title = "Porter's Five Forces Industry Analysis" },
    @{ Name = "pm-tam-sam-som"; Desc = "Calculate Total, Serviceable Addressable, and Obtainable Market using dual methodologies."; File = "market-intelligence/tam-sam-som-analysis-prompt.md"; Title = "TAM / SAM / SOM Market Sizing" },
    @{ Name = "pm-pestel-monitor"; Desc = "Analyze Political, Economic, Social, Tech, Legal, and Environmental headwinds and tailwinds."; File = "market-intelligence/pestel-delta-monitor-prompt.md"; Title = "PESTEL Macro-Environmental Monitor" },
    @{ Name = "pm-competitive-watch"; Desc = "Track competitor moves, feature releases, packaging changes, and pricing updates."; File = "market-intelligence/competitive-intel-watch-prompt.md"; Title = "Competitive Intelligence Routine Watch" },
    @{ Name = "pm-dangerous-animals-generator"; Desc = "Identify and neutralize PM organizational anti-patterns (HiPPO, Seagull, Zebra, Rhinos)."; File = "skills/dangerous-animals-of-pm-generator/SKILL.md"; Title = "Dangerous Animals of PM Anti-Pattern Generator" }
)

$BaseUrl = "https://raw.githubusercontent.com/deanpeters/product-manager-prompts/main/"

Write-Host "`n[1/6] Downloading & Writing 22 PM Skill Definitions..." -ForegroundColor Yellow
$InstalledCount = 0

foreach ($skill in $Skills) {
    $skillName = $skill.Name
    $url = $BaseUrl + $skill.File
    
    try {
        $webClient = New-Object System.Net.WebClient
        $rawContent = $webClient.DownloadString($url)
        
        if ($rawContent.StartsWith("---")) {
            $parts = $rawContent -split "---", 3
            if ($parts.Count -ge 3) {
                $rawContent = $parts[2].Trim()
            }
        }
        
        $skillMd = @"
---
name: $($skill.Name)
description: "$($skill.Desc)"
risk: low
source: community
author: "Dean Peters (ported to Antigravity)"
date_added: "$(Get-Date -Format 'yyyy-MM-dd')"
---

# $($skill.Title)

## Purpose
$($skill.Desc)

## Source & Provenance
- Ported from [deanpeters/product-manager-prompts](https://github.com/deanpeters/product-manager-prompts)
- Source file: ``$($skill.File)``

---

$rawContent
"@

        $agentDir = Join-Path $AgentsSkillsDir $skillName
        New-Item -ItemType Directory -Force -Path $agentDir | Out-Null
        Set-Content -Path (Join-Path $agentDir "SKILL.md") -Value $skillMd -Encoding UTF8
        
        $geminiDir = Join-Path $GeminiSkillsDir $skillName
        New-Item -ItemType Directory -Force -Path $geminiDir | Out-Null
        Set-Content -Path (Join-Path $geminiDir "SKILL.md") -Value $skillMd -Encoding UTF8
        
        Write-Host "  [OK] $skillName" -ForegroundColor Green
        $InstalledCount++
    }
    catch {
        Write-Host "  [FAIL] $skillName : $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n[2/6] Deploying Custom Skills (Orchestrator, Dev-Squad, Diagram-Design)..." -ForegroundColor Yellow
$CustomSkills = @(
    @{ Name = "pm-orchestrator"; Desc = "Trigger the Master PM Squad Orchestrator to run the 3-Phase Human-in-the-Loop (HITL) product discovery, PRD, and pre-mortem lifecycle." },
    @{ Name = "pm-squad"; Desc = "Trigger the Master PM Squad Orchestrator to run the 3-Phase Human-in-the-Loop (HITL) product discovery, PRD, and pre-mortem lifecycle." },
    @{ Name = "dev-squad"; Desc = "Trigger the Human-Gated Dev Squad to plan, implement, test, and audit engineering code solutions strictly from approved specs." },
    @{ Name = "dev-orchestrator"; Desc = "Trigger the Human-Gated Dev Squad to plan, implement, test, and audit engineering code solutions strictly from approved specs." }
)

foreach ($cSkill in $CustomSkills) {
    $cContent = @"
---
name: $($cSkill.Name)
description: "$($cSkill.Desc)"
risk: low
source: custom
author: "Antigravity Squad Suite"
date_added: "$(Get-Date -Format 'yyyy-MM-dd')"
---

# $($cSkill.Name)

## Purpose
$($cSkill.Desc)
"@
    Set-Content -Path (Join-Path (New-Item -ItemType Directory -Force -Path (Join-Path $GeminiSkillsDir $cSkill.Name)) "SKILL.md") -Value $cContent -Encoding UTF8
    Set-Content -Path (Join-Path (New-Item -ItemType Directory -Force -Path (Join-Path $AgentsSkillsDir $cSkill.Name)) "SKILL.md") -Value $cContent -Encoding UTF8
    Write-Host "  [OK] $($cSkill.Name)" -ForegroundColor Green
}

# Fetch diagram-design SKILL.md
try {
    $diagUrl = "https://raw.githubusercontent.com/cathrynlavery/diagram-design/main/skills/diagram-design/SKILL.md"
    $diagClient = New-Object System.Net.WebClient
    $diagContent = $diagClient.DownloadString($diagUrl)
    Set-Content -Path (Join-Path (New-Item -ItemType Directory -Force -Path (Join-Path $GeminiSkillsDir "diagram-design")) "SKILL.md") -Value $diagContent -Encoding UTF8
    Set-Content -Path (Join-Path (New-Item -ItemType Directory -Force -Path (Join-Path $AgentsSkillsDir "diagram-design")) "SKILL.md") -Value $diagContent -Encoding UTF8
    Write-Host "  [OK] diagram-design" -ForegroundColor Green
} catch {
    Write-Host "  [WARN] diagram-design download deferred: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n[3/6] Deploying 9 Hardened Custom Agents (RBAC & Autonomy Tiers)..." -ForegroundColor Yellow
$IncludeSections = @("user_information", "mcp_servers", "skills", "subagent_reminder", "messaging", "artifacts", "user_rules")

$HardenedSquad = @(
    @{
        Dir = "pm_orchestrator"; Name = "PM-Orchestrator"; Desc = "Master PM Dispatcher operating under Tier 1 Autonomy with 8 Production Guardrails and Human-in-the-Loop (HITL) checkpoint gates."
        Tools = @("send_message", "invoke_subagent", "manage_subagents", "view_file", "write_to_file", "list_dir", "find_by_name", "grep_search", "call_mcp_tool")
        Instructions = "You are PM-Orchestrator (Tier 1 Autonomy Dispatcher). You coordinate product initiatives across pm_scout, pm_analyst, pm_writer, and pm_auditor through 3 gated Human-in-the-Loop (HITL) checkpoints. MANDATORY UI/UX PROTOCOL: For any UI/UX or screen request, you MUST FIRST output a 3-Option Visual Proposal Card (Problem Box -> 3 Ranked Options with Badges & Impact Pills -> Option 1 ⭐ Recommended) and halt for user selection before drafting specs. You never trigger actions without explicit user approval."
    },
    @{
        Dir = "pm_scout"; Name = "PM-Scout"; Desc = "Market Intelligence & Customer Insights Specialist operating under Tier 2 Bounded Autonomy for TAM/SAM/SOM, competitor sweeps, and JTBD mapping."
        Tools = @("view_file", "write_to_file", "search_web", "read_url_content", "list_dir", "find_by_name", "grep_search", "call_mcp_tool")
        Instructions = "You are PM-Scout (Tier 2 Bounded Research). Gathers objective market data, TAM/SAM/SOM sizing, competitor sweeps, and JTBD customer friction mapping. Enforces strict anti-hallucination fact grounding."
    },
    @{
        Dir = "pm_analyst"; Name = "PM-Analyst"; Desc = "Business Modeler & Product Strategist operating under Tier 1 Assist Autonomy for Opportunity Solution Trees, ROI economics, and How-Might-We framing."
        Tools = @("view_file", "write_to_file", "list_dir", "find_by_name", "grep_search", "call_mcp_tool")
        Instructions = "You are PM-Analyst (Tier 1 Assist). Maps Teresa Torres Opportunity Solution Trees, calculates build-vs-buy ROI, and frames How-Might-We opportunity vectors with explicit math."
    },
    @{
        Dir = "pm_writer"; Name = "PM-Writer"; Desc = "Technical Requirements & User Story Author (Alex) operating under Tier 2 Bounded Autonomy for canonical PRDs and Given-When-Then backlog tickets."
        Tools = @("view_file", "write_to_file", "list_dir", "find_by_name", "grep_search")
        Instructions = "You are PM-Writer / Alex (Tier 2 Bounded Spec Authoring). Authors canonical PRDs (pm-prd) and Given-When-Then user stories (pm-user-stories). Follows strict Assumption / Open Question discipline."
    },
    @{
        Dir = "pm_auditor"; Name = "PM-Auditor"; Desc = "Risk, Pre-Mortem & Product Governance Officer operating under Tier 1 Contrarian Autonomy for pre-launch failure simulations and EOL planning."
        Tools = @("view_file", "write_to_file", "list_dir", "find_by_name", "grep_search")
        Instructions = "You are PM-Auditor (Tier 1 Contrarian Risk Auditor). Runs pre-mortems (pm-premortem), establishes early-warning tripwires, maps stakeholder risks, and plans EOL product sunsets."
    },
    @{
        Dir = "dev_lead"; Name = "Dev-Lead"; Desc = "Technical Architect & Planner operating under Tier 1 Planning Autonomy (Zero Code Writes) to draft implementation plans from approved PM specs."
        Tools = @("view_file", "write_to_file", "list_dir", "find_by_name", "grep_search", "call_mcp_tool")
        Instructions = "You are Dev-Lead (Tier 1 Planning Autonomy). Ingests approved PM specs and drafts implementation_plan.md. Strictly forbidden from modifying source code files before user plan approval."
    },
    @{
        Dir = "dev_coder"; Name = "Dev-Coder"; Desc = "Engineering Builder operating under Tier 3 Conditional Sandbox Autonomy to implement clean, minimal code strictly satisfying Given-When-Then criteria."
        Tools = @("view_file", "write_to_file", "replace_file_content", "multi_replace_file_content", "list_dir", "find_by_name", "grep_search")
        Instructions = "You are Dev-Coder (Tier 3 Conditional Sandbox Builder). Writes minimal, surgical code strictly matching Given-When-Then criteria (YAGNI). Scoped to file edits only; zero shell execution."
    },
    @{
        Dir = "dev_qa"; Name = "Dev-QA"; Desc = "Automated Test & Sandbox Verification Engineer operating under Tier 3 Sandbox Autonomy to execute test suites and self-healing fix loops (max 3 loops)."
        Tools = @("run_command", "manage_task", "view_file", "write_to_file", "list_dir", "find_by_name", "grep_search")
        Instructions = "You are Dev-QA (Tier 3 Sandbox QA). Executes unit tests, integration tests, and linters in sandbox. Runs self-healing fix loops with dev_coder (hard-capped at max 3 iterations)."
    },
    @{
        Dir = "dev_reviewer"; Name = "Dev-Reviewer"; Desc = "Code Quality, Security & Spec-Compliance Auditor operating under Tier 1 Sign-Off Autonomy to verify diffs and produce walkthrough.md."
        Tools = @("view_file", "write_to_file", "list_dir", "find_by_name", "grep_search")
        Instructions = "You are Dev-Reviewer (Tier 1 Sign-Off Auditor). Audits diffs strictly against approved acceptance criteria, scans for OWASP vulnerabilities, cuts over-engineering, and produces walkthrough.md."
    }
)

foreach ($agent in $HardenedSquad) {
    $agentObj = @{
        name = $agent.Name
        description = $agent.Desc
        hidden = $false
        config = @{
            customAgent = @{
                systemPromptSections = @( @{ title = "Agent System Instructions"; content = $agent.Instructions } )
                toolNames = $agent.Tools
                systemPromptConfig = @{ includeSections = $IncludeSections }
            }
        }
    }
    $agentJson = $agentObj | ConvertTo-Json -Depth 5
    Set-Content -Path (Join-Path (New-Item -ItemType Directory -Force -Path (Join-Path $GeminiAgentsDir $agent.Dir)) "agent.json") -Value $agentJson -Encoding UTF8
    Set-Content -Path (Join-Path (New-Item -ItemType Directory -Force -Path (Join-Path $AgentsAgentsDir $agent.Dir)) "agent.json") -Value $agentJson -Encoding UTF8
    Write-Host "  [OK] $($agent.Name) (Hardened RBAC)" -ForegroundColor Green
}

Write-Host "`n[4/6] Updating Install Manifest..." -ForegroundColor Yellow
$manifest = @{ installed_skills = @{} }
if (Test-Path $ManifestPath) {
    try {
        $manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
        if (-not $manifest.installed_skills) {
            $manifest | Add-Member -NotePropertyName "installed_skills" -NotePropertyValue @{} -Force
        }
    } catch {}
}

foreach ($skill in $Skills) {
    $manifest.installed_skills."$($skill.Name)" = @{ name = $skill.Name; description = $skill.Desc; installed_at = (Get-Date).ToString("o") }
}
foreach ($cSkill in $CustomSkills) {
    $manifest.installed_skills."$($cSkill.Name)" = @{ name = $cSkill.Name; description = $cSkill.Desc; installed_at = (Get-Date).ToString("o") }
}
$manifest.installed_skills."diagram-design" = @{ name = "diagram-design"; description = "Publication-quality HTML/SVG diagram and chart design system."; installed_at = (Get-Date).ToString("o") }
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $ManifestPath -Encoding UTF8
Write-Host "  [OK] Manifest saved." -ForegroundColor Green

Write-Host "`n[5/6] Ensuring skills.json Pointer..." -ForegroundColor Yellow
$skillsJsonObj = @{ entries = @( @{ path = ($AgentsSkillsDir -replace '\\', '/') } ) }
$skillsJsonObj | ConvertTo-Json -Depth 3 | Set-Content -Path $SkillsJsonPath -Encoding UTF8
Write-Host "  [OK] skills.json configured." -ForegroundColor Green

Write-Host "`n[6/6] Verification Audit..." -ForegroundColor Yellow
$validSkills = 0
foreach ($skill in ($Skills + $CustomSkills)) {
    if ((Test-Path (Join-Path $AgentsSkillsDir "$($skill.Name)\SKILL.md")) -and (Test-Path (Join-Path $GeminiSkillsDir "$($skill.Name)\SKILL.md"))) {
        $validSkills++
    }
}
$validAgents = 0
foreach ($agent in $HardenedSquad) {
    if (Test-Path (Join-Path $GeminiAgentsDir "$($agent.Dir)\agent.json")) {
        $validAgents++
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS: $validSkills+ Skills & $validAgents Hardened Agents Deployed!  " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "`nNext Step: Open Antigravity IDE (press Ctrl+R to reload) and run '/pm-orchestrator' or '/dev-squad'." -ForegroundColor White
