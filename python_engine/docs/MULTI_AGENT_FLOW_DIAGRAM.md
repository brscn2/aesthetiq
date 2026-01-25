# Multi-Agent System Flow Diagrams

## Complete System Flow

```mermaid
graph TB
    subgraph external [External Layer]
        FE[Frontend Next.js]
    end
    
    subgraph backend_layer [Backend Layer]
        BE[NestJS Backend<br/>Port 3001<br/>Clerk Auth]
    end
    
    subgraph gateway_layer [Gateway Layer]
        GW[Python Gateway<br/>Port 8000<br/>SSE Proxy]
    end
    
    subgraph agent_service [Conversational Agent Service]
        CAS[LangGraph Workflow<br/>Port 8002]
        
        subgraph workflow_nodes [Workflow Nodes]
            CheckClarify[check_clarification]
            IG[input_guardrails]
            IC[intent_classifier]
            QA[query_analyzer]
            GCA[conversation_agent]
            CRA[clothing_recommender]
            CAA[clothing_analyzer]
            OG[output_guardrails]
            RF[response_formatter]
        end
    end
    
    subgraph mcp_layer [MCP Servers - Port 8010]
        MCP[fastapi-mcp<br/>at /mcp]
        WS[Wardrobe Server]
        CS[Commerce Server]
        WSS[Web Search Server]
        UDS[User Data Server]
        SDS[Style DNA Server]
    end
    
    subgraph data_layer [Data Layer]
        MW[(wardrobeitems)]
        MC[(commerceitems)]
        MU[(users)]
        MSP[(styleprofiles)]
        MCA[(coloranalyses)]
        EXT[Tavily API]
    end
    
    FE -->|NEXT_PUBLIC_API_URL| BE
    BE -->|PYTHON_GATEWAY_URL| GW
    GW --> CAS
    
    CAS --> CheckClarify
    CheckClarify --> IG
    IG --> IC
    IC -->|general| GCA
    IC -->|clothing| QA
    QA --> CRA
    CRA --> CAA
    CAA --> OG
    GCA --> OG
    OG --> RF
    RF --> CAS
    
    CAS -->|SSE| GW
    GW -->|SSE| BE
    BE -->|SSE| FE
    
    CRA -.->|langchain-mcp-adapters| MCP
    GCA -.->|langchain-mcp-adapters| MCP
    
    MCP --> WS
    MCP --> CS
    MCP --> WSS
    MCP --> UDS
    MCP --> SDS
    
    WS --> MW
    CS --> MC
    UDS --> MU
    SDS --> MSP
    SDS --> MCA
    WSS --> EXT
```

## Clothing Recommendation Workflow (Detailed)

```mermaid
graph TB
    Start([User Message]) --> CheckClarify[check_clarification]
    
    CheckClarify -->|fresh| IG[input_guardrails]
    CheckClarify -->|resume| Merge[merge_clarification]
    
    IG -->|safe| IC[intent_classifier]
    IG -->|unsafe| Error[error_response]
    
    IC -->|clothing| QA[query_analyzer]
    IC -->|general| GCA[conversation_agent]
    
    QA --> CRA[clothing_recommender]
    Merge --> CRA
    
    subgraph recommender [Clothing Recommender Agent]
        CRA -->|1| FetchProfile[get_user_profile MCP]
        CRA -->|2| FetchDNA[get_style_dna MCP]
        CRA -->|3| Search{search_scope?}
        Search -->|commerce| SearchComm[search_commerce_items]
        Search -->|wardrobe| SearchWard[search_wardrobe_items]
        Search -->|both| SearchBoth[Search Both]
    end
    
    SearchComm --> CheckResults{Results?}
    SearchWard --> CheckResults
    SearchBoth --> CheckResults
    
    CheckResults -->|none| Fallback[web_search MCP]
    CheckResults -->|found| CAA[clothing_analyzer]
    Fallback --> CAA
    
    CAA --> Analysis{decision?}
    
    Analysis -->|approve| OG[output_guardrails]
    Analysis -->|refine| CRA
    Analysis -->|clarify| SaveCtx[save_clarification]
    
    SaveCtx --> OG
    GCA --> OG
    
    OG -->|safe| RF[response_formatter]
    OG -->|unsafe| Error
    
    RF --> EndNode([END])
    Error --> EndNode
```

## Multi-Turn Clarification Flow

```mermaid
sequenceDiagram
    participant User
    participant Workflow
    participant Analyzer
    participant SaveCtx as Save Context
    participant Formatter
    participant Merge as Merge Context
    participant Recommender
    
    Note over User,Recommender: Turn 1: Vague Request
    User->>Workflow: "I need something nice"
    Workflow->>Analyzer: Analyze items
    Analyzer->>Analyzer: Query too vague
    Analyzer->>Workflow: decision: CLARIFY
    Workflow->>SaveCtx: Save workflow state
    SaveCtx->>SaveCtx: Store filters, items, iteration
    SaveCtx->>Formatter: Send clarification question
    Formatter->>User: "What occasion is this for?"
    Note over User: workflow_status = awaiting_clarification
    
    Note over User,Recommender: Turn 2: Clarification Response
    User->>Workflow: "A formal dinner party"
    Workflow->>Workflow: Detect pending clarification
    Workflow->>Merge: Merge user response
    Merge->>Merge: Extract: occasion=party
    Merge->>Merge: Merge with saved filters
    Merge->>Recommender: Resume with updated filters
    Recommender->>Analyzer: Updated items
    Analyzer->>Workflow: decision: APPROVE
    Workflow->>Formatter: Format response
    Formatter->>User: "Here are formal party options..."
    Note over User: workflow_status = completed
```

## Agent Communication (LangGraph State Management)

**Note:** Agents communicate through shared `ConversationState` TypedDict. State updates trigger workflow transitions automatically via conditional routing functions.

```mermaid
sequenceDiagram
    participant User
    participant Backend as NestJS Backend
    participant Gateway as Python Gateway
    participant Agent as Conversational Agent
    participant LG as LangGraph Workflow
    participant Recommender as clothing_recommender node
    participant Analyzer as clothing_analyzer node
    participant MCP as MCP Servers
    
    User->>Backend: POST /api/agent/chat/stream
    Note over Backend: Validate Clerk JWT<br/>Extract user_id
    Backend->>Gateway: POST /api/v1/agent/chat/stream
    Gateway->>Agent: Forward request
    Agent->>LG: run_workflow_streaming()
    
    LG->>LG: check_clarification node
    LG->>LG: input_guardrails node
    LG->>LG: intent_classifier node
    LG->>LG: query_analyzer node
    
    LG->>Recommender: Execute clothing_recommender
    
    Recommender->>MCP: get_user_profile via langchain-mcp-adapters
    MCP-->>Recommender: UserProfile
    Recommender->>Recommender: Write state.user_profile
    
    Recommender->>MCP: get_style_dna
    MCP-->>Recommender: StyleDNA
    Recommender->>Recommender: Write state.style_dna
    
    Recommender->>MCP: search_commerce_items
    MCP-->>Recommender: Items
    Recommender->>Recommender: Write state.retrieved_items
    
    LG->>Analyzer: Execute clothing_analyzer
    Note over Analyzer: Read state.retrieved_items<br/>Read state.style_dna<br/>Analyze relevance
    
    alt decision = approve
        Analyzer->>Analyzer: Write state.analysis_result
        LG->>LG: route_after_analysis returns "approve"
        LG->>LG: output_guardrails node
        LG->>LG: response_formatter node
        Agent->>Gateway: SSE done event
    else decision = refine
        Analyzer->>Analyzer: Write state.refinement_notes
        LG->>LG: route_after_analysis returns "refine"
        LG->>Recommender: Re-execute with updated filters
    else decision = clarify
        Analyzer->>Analyzer: Write state.needs_clarification = true
        LG->>LG: save_clarification node
        LG->>LG: Set workflow_status = awaiting_clarification
        Agent->>Gateway: SSE done with clarification_question
        Gateway->>Backend: SSE
        Backend->>User: Display question
    end
```

## Multi-Turn Clarification Resume Flow

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant Workflow
    participant CheckNode as Check Clarification
    participant MergeNode as Merge Context
    participant Recommender
    participant Analyzer
    
    Note over User,Analyzer: Turn 2: User responds to clarification
    User->>Gateway: "A formal dinner party"
    Gateway->>Workflow: run_workflow(pending_context)
    
    Workflow->>CheckNode: Entry point
    CheckNode->>CheckNode: Detect pending clarification
    CheckNode->>MergeNode: Route to merge
    
    MergeNode->>MergeNode: Parse response:<br/>"formal dinner party"<br/>→ {occasion: "party"}
    MergeNode->>MergeNode: Merge with saved filters
    MergeNode->>MergeNode: Restore iteration count
    
    MergeNode->>Recommender: Resume with updated filters
    Note over Recommender: Skipped Intent Classifier<br/>and Query Analyzer
    
    Recommender->>Recommender: Search with merged filters
    Recommender->>Analyzer: Updated items
    Analyzer->>Analyzer: Analyze items
    Analyzer->>Workflow: decision = "approve"
    Workflow->>Workflow: Set workflow_status = "completed"
    Workflow->>Gateway: Stream response
    Gateway->>User: "Here are formal party options..."
```

## MCP Server Tool Call Flow

```mermaid
graph LR
    subgraph agent [LangGraph Agent Node]
        ReactAgent[create_react_agent]
        ToolCall[Tool Call Decision]
    end
    
    subgraph mcp_client [MCP Client]
        MCPAdapter[langchain-mcp-adapters<br/>MultiServerMCPClient]
        BaseTool[LangChain BaseTool]
    end
    
    subgraph mcp_server [MCP Server Port 8010]
        MCPEndpoint[/mcp endpoint<br/>streamable_http]
        FastAPIRoute[FastAPI Route<br/>/tools/*]
        ToolFunc[Tool Function]
    end
    
    subgraph data [Data Layer]
        MongoDB[(MongoDB)]
        External[External API]
    end
    
    ReactAgent -->|1 Decide tool| ToolCall
    ToolCall -->|2 Invoke| BaseTool
    BaseTool -->|3 Call| MCPAdapter
    MCPAdapter -->|4 HTTP POST| MCPEndpoint
    MCPEndpoint -->|5 Route| FastAPIRoute
    FastAPIRoute -->|6 Execute| ToolFunc
    ToolFunc -->|7 Query| MongoDB
    ToolFunc -->|7 Query| External
    MongoDB -->|8 Results| ToolFunc
    External -->|8 Results| ToolFunc
    ToolFunc -->|9 Response| FastAPIRoute
    FastAPIRoute -->|10 JSON| MCPEndpoint
    MCPEndpoint -->|11 MCP Response| MCPAdapter
    MCPAdapter -->|12 Return| BaseTool
    BaseTool -->|13 Tool Result| ReactAgent
```

## Streaming Architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend as Frontend Next.js
    participant Backend as NestJS Backend
    participant Gateway as Python Gateway
    participant Agent as Conversational Agent
    participant LG as LangGraph
    participant MCP as MCP Servers
    
    User->>Frontend: Type message
    Frontend->>Backend: POST /api/agent/chat/stream<br/>with Clerk JWT
    
    Note over Backend: Validate Clerk token<br/>Extract user_id
    
    Backend->>Gateway: POST /api/v1/agent/chat/stream<br/>SSE Accept headers
    Gateway->>Agent: Forward with timeout 600s
    Agent->>Agent: Load session via BackendClient
    Agent->>LG: run_workflow_streaming()
    
    loop LangGraph astream_events
        LG->>LG: Execute node
        LG->>Agent: Stream event
        
        alt Tool Call
            LG->>MCP: MCP tool via langchain-mcp-adapters
            MCP-->>LG: Tool result
        end
        
        Agent->>Gateway: SSE: event
        Gateway->>Backend: SSE: event
        Backend->>Frontend: SSE: event
        Frontend->>User: Display update
    end
    
    LG->>Agent: Workflow complete
    Agent->>Agent: Save messages via BackendClient
    Agent->>Gateway: SSE: done event
    Gateway->>Backend: SSE: done
    Backend->>Frontend: SSE: done
    Frontend->>User: Complete response
```

## Example: Complete Flow for "Find me jackets"

```mermaid
graph TB
    Start([User: Find me jackets]) --> CC[check_clarification<br/>fresh request]
    CC --> IG[input_guardrails<br/>safe]
    IG --> IC[intent_classifier<br/>clothing]
    IC --> QA[query_analyzer]
    
    QA -->|Extract| Extract[extracted_filters:<br/>category: TOP<br/>subCategory: Jacket<br/>search_scope: commerce]
    
    Extract --> CRA[clothing_recommender]
    
    subgraph recommender [clothing_recommender node]
        CRA -->|MCP| UD[get_user_profile]
        CRA -->|MCP| SD[get_style_dna<br/>returns: WARM_AUTUMN]
        CRA -->|MCP| CS[search_commerce_items<br/>query=jackets<br/>style_dna=WARM_AUTUMN]
        CS -->|5 items| Items[state.retrieved_items]
    end
    
    Items --> CAA[clothing_analyzer]
    
    subgraph analyzer [clothing_analyzer node]
        CAA --> Analysis{Analyze:<br/>items vs style_dna}
        Analysis -->|2/5 match colors| Refine[decision: refine<br/>refinement_notes]
        Analysis -->|3/3 match| Approve[decision: approve]
    end
    
    Refine -->|iteration++ < 3| CRA2[clothing_recommender<br/>retry with notes]
    CRA2 -->|3 better items| CAA
    
    Approve --> OG[output_guardrails]
    OG --> RF[response_formatter]
    
    RF --> Done[SSE done event:<br/>response, items, intent]
    Done --> Backend[NestJS Backend]
    Backend --> Frontend[Frontend Next.js]
    Frontend --> User[User sees jackets]
```

## MCP Server Architecture

```mermaid
graph TB
    subgraph agent [Conversational Agent]
        MCPClient[MultiServerMCPClient<br/>langchain-mcp-adapters]
        Tools[LangChain BaseTool objects]
        ReactAgent[create_react_agent]
    end
    
    subgraph mcp_server [MCP Servers - Port 8010]
        FastAPI[FastAPI App]
        FastApiMCP[FastApiMCP<br/>fastapi-mcp]
        MCPEndpoint[/mcp endpoint<br/>streamable_http transport]
        
        subgraph routers [FastAPI Routers]
            WR[/api/v1/wardrobe/tools/*]
            CR[/api/v1/commerce/tools/*]
            WSR[/api/v1/web-search/tools/*]
            UDR[/api/v1/user-data/tools/*]
            SDR[/api/v1/style-dna/tools/*]
        end
    end
    
    subgraph shared [Shared Services]
        Mongo[MongoDB Client<br/>shared/mongo.py]
        Embed[Embedding Client<br/>shared/embeddings_client.py]
    end
    
    subgraph data [Data Sources]
        WI[(wardrobeitems)]
        CI[(commerceitems)]
        U[(users)]
        SP[(styleprofiles)]
        CA[(coloranalyses)]
        Tavily[Tavily API]
        EmbedSvc[Embedding Service<br/>Port 8004]
    end
    
    MCPClient -->|get_tools| Tools
    Tools --> ReactAgent
    MCPClient <-->|streamable_http| MCPEndpoint
    
    FastAPI --> FastApiMCP
    FastApiMCP --> MCPEndpoint
    FastAPI --> WR
    FastAPI --> CR
    FastAPI --> WSR
    FastAPI --> UDR
    FastAPI --> SDR
    
    WR --> Mongo
    CR --> Mongo
    CR --> Embed
    UDR --> Mongo
    SDR --> Mongo
    WSR --> Tavily
    
    Mongo --> WI
    Mongo --> CI
    Mongo --> U
    Mongo --> SP
    Mongo --> CA
    Embed --> EmbedSvc
```
