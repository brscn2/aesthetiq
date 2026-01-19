# Document Inconsistencies Report

This report identifies inconsistencies found across the multi-agent system documentation.

## Critical Inconsistencies

### 1. A2A Protocol vs LangGraph State Management

**Location:** `MULTI_AGENT_ARCHITECTURE.md` vs `MULTI_AGENT_PLAN.md`

**Issue:**
- **ARCHITECTURE.md** (lines 5, 70-72, 415-444): Describes **A2A (Agent-to-Agent) protocol** as the mechanism for inter-agent communication, including protocol structure, message types, and implementation details.
- **PLAN.md** (lines 80-127): Explicitly states: *"The workflow state replaces A2A protocol for agent communication"* and *"All agents read/write to shared state. No explicit A2A messages needed."*

**Impact:** High - This is a fundamental architectural decision that affects implementation.

**Recommendation:** 
- Update `MULTI_AGENT_ARCHITECTURE.md` to remove A2A protocol section (lines 415-444) or mark it as deprecated
- Update the architecture diagram to remove A2A protocol references (lines 70-72)
- Update technology stack table (line 589) to remove "A2A Protocol (custom)"
- Keep the A2A sequence diagram in `MULTI_AGENT_FLOW_DIAGRAM.md` but add a note that it's conceptual - actual implementation uses LangGraph state

---

### 2. MCP Server Tool Signatures

**Location:** `MULTI_AGENT_ARCHITECTURE.md` vs `02-mcp-servers.md`

**Issue:**
- **ARCHITECTURE.md** (line 316): Wardrobe MCP tool signature: `search_wardrobe_items(query: str, filters: Dict)`
- **Issue 2** (line 14): Wardrobe MCP tool signature: `search_wardrobe_items(query, user_id, filters)`

**Impact:** Medium - This affects implementation and API contracts.

**Recommendation:**
- Standardize on including `user_id` parameter since wardrobe searches are user-specific
- Update ARCHITECTURE.md to match Issue 2 specification

**Other MCP Tool Signature Issues:**
- **ARCHITECTURE.md** (line 342): Commerce MCP: `search_commerce_items(query: str, user_style_dna: StyleDNA, filters: Dict)`
- **Issue 2** (line 24): Commerce MCP: `search_commerce_items(query, style_dna, filters)` - Missing `user_` prefix, but functionally same

---

### 3. Guardrails in Workflow

**Location:** `MULTI_AGENT_ARCHITECTURE.md` vs `MULTI_AGENT_PLAN.md`

**Issue:**
- **ARCHITECTURE.md**: Workflow diagrams and descriptions do NOT include Input/Output Guardrails
- **PLAN.md** (lines 299-356, 700-764): Detailed guardrail implementation and workflow integration with guardrails at entry/exit points

**Impact:** Medium - Missing critical safety components in architecture documentation.

**Recommendation:**
- Add guardrails to the workflow diagram in ARCHITECTURE.md
- Add a section describing guardrails in ARCHITECTURE.md
- Update the architecture diagram to show guardrail nodes

---

### 4. Session Management and Chat History

**Location:** `MULTI_AGENT_ARCHITECTURE.md` vs `MULTI_AGENT_PLAN.md`

**Issue:**
- **ARCHITECTURE.md**: Does NOT mention session management, chat history loading, or message persistence
- **PLAN.md** (lines 128-298): Detailed section on session management, backend client, and history formatting

**Impact:** Medium - Missing important feature in architecture documentation.

**Recommendation:**
- Add a section in ARCHITECTURE.md describing session management
- Update workflow state diagram to show session_id and conversation_history
- Add session management to the data flow examples

---

### 5. Intent Classifier Implementation

**Location:** All documents vs `03-agents-workflow.md`

**Issue:**
- **ARCHITECTURE.md**, **PLAN.md**, **FLOW_DIAGRAM.md**: All show Intent Classifier as a node in the workflow
- **Issue 3** (03-agents-workflow.md): Does NOT list Intent Classifier as a task - only Query Analyzer Node is mentioned

**Impact:** Medium - Missing implementation task for a critical component.

**Recommendation:**
- Add Intent Classifier Node as a task in Issue 3
- Create file: `conversational_agent/app/workflows/nodes/intent_classifier_node.py`
- Or clarify if Intent Classifier is part of the workflow routing logic rather than a separate node

---

### 6. File Structure Inconsistencies

**Location:** `MULTI_AGENT_ARCHITECTURE.md` vs `MULTI_AGENT_PLAN.md`

**Issue:**
- **ARCHITECTURE.md** (lines 599-646): File structure does NOT include:
  - `guardrails/` folder
  - `services/tracing/` folder structure
  - `services/session/` folder structure
- **PLAN.md** (lines 1012-1086): Includes all these folders

**Impact:** Low - Documentation only, but should be consistent.

**Recommendation:**
- Update ARCHITECTURE.md file structure to match PLAN.md
- Include guardrails, tracing, and session service folders

---

## Minor Inconsistencies

### 7. Workflow Node Naming

**Location:** Various documents

**Issue:**
- Some documents refer to "Query Analyzer Node" vs "Query Analyzer"
- Some refer to "Response Formatter Node" vs "Response Formatter"

**Impact:** Low - Naming consistency.

**Recommendation:**
- Standardize on "Node" suffix for workflow nodes: "Query Analyzer Node", "Response Formatter Node"
- Use "Agent" suffix for agents: "Conversation Agent", "Clothing Recommender Agent"

---

### 8. MCP Server Port Numbers

**Location:** All documents

**Issue:**
- No port numbers specified for MCP servers in any document
- Only Gateway (8000) and Conversational Agent Service (8002) have ports

**Impact:** Low - Implementation detail, but should be documented.

**Recommendation:**
- Document MCP server ports or clarify they run as stdio processes (not HTTP)

---

### 9. Refinement Loop Iteration Limit

**Location:** `MULTI_AGENT_PLAN.md` vs other documents

**Issue:**
- **PLAN.md** (line 123): State includes `iteration: int  # Track refinement iterations (max 3)`
- **ARCHITECTURE.md**: No mention of iteration limits
- **Issue 3**: No mention of iteration limits

**Impact:** Low - Implementation detail.

**Recommendation:**
- Add iteration limit logic to workflow description in ARCHITECTURE.md
- Ensure Issue 3 mentions iteration limit implementation

---

## Summary of Required Updates

### Priority 1 (Critical - Affects Implementation)
1. ✅ **RESOLVED** - Removed/updated A2A protocol references in ARCHITECTURE.md (replaced with LangGraph state management)
2. ✅ **RESOLVED** - Standardized MCP tool signatures (added user_id to wardrobe tools)
3. ✅ **RESOLVED** - Added Intent Classifier Node task to Issue 3

### Priority 2 (Important - Missing Features)
4. ✅ **RESOLVED** - Added guardrails to ARCHITECTURE.md workflow diagrams and descriptions
5. ✅ **RESOLVED** - Added session management section to ARCHITECTURE.md
6. ✅ **RESOLVED** - Updated file structure in ARCHITECTURE.md (added guardrails, tracing, session folders)

### Priority 3 (Nice to Have)
7. ✅ **RESOLVED** - Standardized node naming conventions (using "Node" suffix)
8. ⚠️ **PARTIAL** - MCP server ports/communication method (noted as stdio in implementation, but not explicitly documented in architecture)
9. ✅ **RESOLVED** - Added iteration limit (max 3) to workflow descriptions

---

## Recommended Action Plan

✅ **COMPLETED** - All critical and important updates have been applied:

1. ✅ **Updated MULTI_AGENT_ARCHITECTURE.md:**
   - Removed A2A protocol section, replaced with LangGraph state management
   - Added guardrails to workflow diagrams and descriptions
   - Added session management section
   - Updated MCP tool signatures (added user_id to wardrobe tools)
   - Updated file structure (added guardrails, tracing, session folders)
   - Added iteration limit logic (max 3)

2. ✅ **Updated 03-agents-workflow.md:**
   - Added Intent Classifier Node as Task 1
   - Updated workflow assembly to include guardrails

3. ✅ **Updated MULTI_AGENT_FLOW_DIAGRAM.md:**
   - Added note that A2A sequence diagram is conceptual
   - Updated sequence diagram to show state-based communication

4. ⚠️ **Remaining Minor Items:**
   - MCP server ports/communication method could be explicitly documented (currently implied as stdio)
   - All other inconsistencies have been resolved
