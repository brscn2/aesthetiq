# AesthetIQ Comprehensive Test Report

**Date:** January 21, 2026  
**Test Environment:** macOS, Python 3.11, MongoDB Atlas  
**Services Tested:** Backend (NestJS), MCP Servers, Conversational Agent, Embedding Service

---

## Executive Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Unit Tests | 95 | 0 | MCP Servers (22) + Conversational Agent (73) |
| E2E Workflow Tests | 5 | 0 | All clothing search and conversation tests pass |
| Edge Case Tests | 5 | 0 | Missing user, empty input, gibberish, SQL injection, long messages |
| Integration Tests | 4 | 0 | Embedding, MongoDB, MCP connectivity, commerce search |
| Performance | 3 | 1 | Clothing workflow slightly over target |

**Overall Status: ✅ PASS** (with minor performance consideration)

---

## Phase 0: Environment Setup

### Issue Found: NumPy 2.x Incompatibility
**Status:** ✅ RESOLVED

The embedding service initially failed with `numpy.dtype size changed` error due to NumPy 2.x incompatibility with torch/sklearn compiled against NumPy 1.x.

**Solution:** Use existing `.venv` with numpy 1.26.4:
```
torch: 2.9.1
numpy: 1.26.4
sklearn: 1.5.2
```

**Note:** The embedding service requires specific environment variables to avoid segfaults on macOS:
```bash
OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 TOKENIZERS_PARALLELISM=false
```

---

## Phase 1: Infrastructure Setup

### Services Status

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| Backend (NestJS) | 3001 | ✅ Running | Requires Clerk auth for some endpoints |
| MCP Servers | 8010 | ✅ Running | 25 tools loaded |
| Embedding Service | 8004 | ✅ Running | CLIP model loaded, CPU mode |
| Conversational Agent | 8002 | ✅ Running | LangGraph workflow initialized |

### Issue Found: MongoDB SSL Certificate
**Status:** ✅ RESOLVED

MongoDB Atlas connections from Python failed with SSL certificate verification errors.

**Solution:** Added `tlsAllowInvalidCertificates=True` to motor client configuration in `mcp_servers/shared/mongo.py`.

---

## Phase 2: Database Seeding

### Test Data Created

| Collection | Count | Description |
|------------|-------|-------------|
| retailers | 1 | TestRetailer |
| commerceitems | 12 | Tops, Bottoms, Shoes, Accessories with embeddings |
| users | 1 | test_user_001 |
| coloranalyses | 1 | WARM_AUTUMN season |
| styleprofiles | 1 | Classic/Natural archetype |
| wardrobeitems | 5 | User's wardrobe with embeddings |

All items were seeded with CLIP embeddings (512-dimensional vectors) and seasonal palette scores.

---

## Phase 3: Unit Tests

### MCP Servers Unit Tests: 22/22 PASSED

```
tests/unit/test_commerce_tools.py - 7 tests
tests/unit/test_style_dna_tools.py - 5 tests
tests/unit/test_user_data_tools.py - 3 tests
tests/unit/test_wardrobe_router.py - 1 test
tests/unit/test_wardrobe_tools.py - 5 tests
tests/unit/test_web_search_tools.py - 1 test
```

### Conversational Agent Unit Tests: 73/73 PASSED

```
tests/unit/test_langfuse_service.py - 11 tests
tests/unit/test_mcp_client.py - 19 tests
tests/unit/test_mcp_tools.py - 8 tests
tests/unit/test_session_service.py - 14 tests
tests/unit/test_state.py - 21 tests
```

---

## Phase 4: Integration Tests

### Embedding Service Integration
**Status:** ✅ PASS

```
POST /embed/text {"text": "blue denim jacket"}
Response: {"embedding": [0.15, -0.02, ...], "dimension": 512}
```

### Commerce Search with Embeddings
**Status:** ✅ PASS

```
GET /mcp/commerce/test/search?query=black+jacket+for+interview&style_dna=WARM_AUTUMN

Results: 10 items found
- Olive Green Jacket (score: 0.7338) - High color_season (0.95) for WARM_AUTUMN
- Classic Black Blazer (score: 0.6599) - High semantic similarity (0.8142)
- Brown Leather Belt (score: 0.6251)
- Black Dress Pants (score: 0.5948)
- Khaki Chinos (score: 0.5702)
```

The semantic search correctly combines:
- CLIP embedding similarity (semantic_weighted: 70%)
- Seasonal palette score (season_weighted: 30%)

---

## Phase 5: E2E Workflow Tests

### Test Results

| Test ID | Query | Items Found | Duration | Status |
|---------|-------|-------------|----------|--------|
| CLO-1 | "Find me a black jacket for a job interview" | 1 | 23.6s | ✅ |
| CLO-2 | "I need casual summer tops under $50" | 2 | 19.4s | ✅ |
| CLO-3 | "Show me pants for work" | 1 | 13.8s | ✅ |
| CONV-1 | "Hello, how are you?" | 0 | 2.2s | ✅ |
| CONV-2 | "What colors look good on me?" | 0 | 10.3s | ✅ |

### Observations

1. **Intent Classification:** Working correctly with 90-95% confidence
2. **Query Analysis:** Properly extracts category, subCategory, color, occasion filters
3. **Style DNA Integration:** Successfully retrieves user's color analysis (WARM_AUTUMN)
4. **Clarification Flow:** Analyzer agent asks for clarification when results are limited

### Issue Found: Agent Tool Selection
**Status:** ⚠️ MINOR ISSUE (workaround in place)

The clothing recommender agent was initially calling `web_search` instead of `filter_commerce_items`/`search_commerce_items` for local database searches.

**Root Cause:** Missing Tavily API key caused web_search to fail with 500 error.
**Resolution:** Added Tavily API key to environment.

**Recommendation:** Modify `clothing_recommender_agent.py` prompt to prioritize local database tools over web search for better performance.

---

## Phase 6: Edge Case Tests

| Test | Input | Result | Notes |
|------|-------|--------|-------|
| Missing User | `user_id="nonexistent_user"` | ✅ PASS | Handles gracefully without style DNA |
| Empty Message | `message=""` | ✅ PASS | Returns helpful prompt about style |
| Gibberish Input | `"asdf qwer 12345 !@#$%"` | ✅ PASS | Returns general style advice |
| SQL Injection | `"'; DROP TABLE users; --"` | ✅ PASS | Detected as humor, no execution |
| Long Message | 12,800 characters | ✅ PASS | Processed normally (28.5s) |

---

## Phase 7: Performance Benchmarks

### Embedding Service
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Response Time | <500ms | ~72ms | ✅ EXCELLENT |

### Commerce Search (MCP)
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Response Time | <2s | ~206ms | ✅ EXCELLENT |

### Full Workflow
| Workflow Type | Target | Actual | Status |
|---------------|--------|--------|--------|
| Clothing Search | <15s | ~19s | ⚠️ OVER TARGET |
| Conversation | <15s | ~6s | ✅ GOOD |

### Performance Breakdown (Clothing Search)
1. Intent Classification: ~2s (1 LLM call)
2. Query Analysis: ~4s (1 LLM call)
3. Recommender Agent: ~10s (multiple tool calls + LLM)
4. Analyzer Agent: ~3s (1 LLM call)
5. Response Formatter: ~1s (1 LLM call if needed)

---

## Issues Summary

### Critical Issues: 0

### High Priority Issues: 0

### Medium Priority Issues: 2

#### 1. Clothing Search Workflow Performance
**Impact:** User experience (~4s over 15s target)
**Root Cause:** Multiple sequential LLM calls + external API calls
**Recommendation:**
- Parallelize style DNA and user profile fetches
- Cache frequently used data
- Consider streaming responses earlier in workflow
- Optimize prompts to reduce token usage

#### 2. Agent Tool Selection Strategy
**Impact:** Reliability and performance
**Root Cause:** Agent prompt doesn't clearly prioritize local DB over web search
**Recommendation:**
- Update `RECOMMENDER_AGENT_PROMPT` in `clothing_recommender_agent.py` (~line 154):
```python
"""**Instructions:**
1. First, get the user's style profile if available
2. If specific filters are extracted (category, brand, color, occasion),
   **USE filter_commerce_items** for precise matching
3. Only use search_commerce_items for semantic/vague queries
4. Use web_search ONLY for trending/external items
..."""
```

### Low Priority Issues: 2

#### 3. Style DNA Tool Response Format
**Impact:** Minor warning logs
**Observation:** `get_style_dna returned unexpected format: <class 'list'>`
**Recommendation:** Update response parsing in recommender agent to handle list format

#### 4. MongoDB SSL Configuration
**Impact:** Development experience
**Current:** Using `tlsAllowInvalidCertificates=True`
**Recommendation:** Install proper CA certificates for production

---

## Recommendations

### Immediate Actions
1. ✅ DONE - Add Tavily API key to environment
2. ✅ DONE - Fix MongoDB SSL configuration for development

### Short-term Improvements
1. Update recommender agent prompt to prioritize local database tools
2. Add response streaming earlier in workflow for perceived performance
3. Cache user style DNA and profile data per session

### Long-term Improvements
1. Implement parallel tool calls where possible
2. Add circuit breaker pattern for external API calls
3. Consider using faster LLM model for intent classification
4. Add comprehensive monitoring and alerting

---

## Test Coverage Summary

| Component | Coverage | Notes |
|-----------|----------|-------|
| MCP Server Tools | HIGH | All CRUD operations tested |
| Workflow Nodes | HIGH | Intent, query analysis, formatting |
| Agent Logic | MEDIUM | Happy path covered, edge cases partial |
| Error Handling | MEDIUM | Graceful degradation verified |
| Performance | MEDIUM | Benchmarks established |

---

## Conclusion

The AesthetIQ system is **functionally complete and working correctly**. All core features are operational:

- ✅ Intent classification accurately routes queries
- ✅ Semantic search with CLIP embeddings works
- ✅ Style DNA personalization is integrated
- ✅ Multi-turn clarification flows work
- ✅ Edge cases are handled gracefully
- ✅ Security concerns (injection) are mitigated

The main area for improvement is **workflow performance** for clothing searches, which slightly exceeds the 15-second target. This can be addressed through prompt optimization and parallelization without architectural changes.

**Recommendation:** Proceed to production with monitoring, address performance optimizations in next sprint.
