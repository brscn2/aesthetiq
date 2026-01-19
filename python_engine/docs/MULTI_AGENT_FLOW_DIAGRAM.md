# Multi-Agent System Flow Diagrams

## Complete System Flow

```mermaid
graph TB
    subgraph "External Layer"
        FE[Frontend React]
        BE[Backend NestJS<br/>Chat API]
    end
    
    subgraph "Gateway Layer"
        GW[FastAPI Gateway<br/>Port 8000<br/>Auth + Rate Limiting]
    end
    
    subgraph "Conversational Agent Service"
        CAS[LangGraph Workflow Engine<br/>Port 8002]
        
        subgraph "Workflow Nodes"
            IC[Intent Classifier]
            GCA[General Conversation Agent]
            CWF[Clothing Workflow]
            RF[Response Formatter]
        end
    end
    
    subgraph "MCP Servers"
        WS[Wardrobe MCP Server]
        CS[Commerce MCP Server]
        WSS[Web Search MCP Server<br/>Tavily]
        UDS[User Data MCP Server]
        SDS[Style DNA MCP Server]
    end
    
    subgraph "Data Layer"
        MW[(MongoDB<br/>Wardrobe)]
        MC[(MongoDB<br/>Commerce)]
        MP[(MongoDB<br/>User Profiles)]
        EXT[External APIs<br/>Tavily]
    end
    
    FE -->|SSE Stream| BE
    BE -->|HTTP Request| GW
    GW -->|Route| CAS
    
    CAS --> IC
    IC -->|general| GCA
    IC -->|clothing| CWF
    GCA --> RF
    CWF --> RF
    RF -->|SSE Stream| BE
    
    GCA -.->|Tool Calls| WSS
    GCA -.->|Tool Calls| SDS
    
    CWF -.->|Tool Calls| WS
    CWF -.->|Tool Calls| CS
    CWF -.->|Tool Calls| WSS
    CWF -.->|Tool Calls| UDS
    CWF -.->|Tool Calls| SDS
    
    WS --> MW
    CS --> MC
    UDS --> MP
    SDS --> MP
    WSS --> EXT
    
    style FE fill:#e1f5ff
    style BE fill:#e1f5ff
    style GW fill:#fff4e1
    style CAS fill:#e8f5e9
    style IC fill:#f3e5f5
    style GCA fill:#f3e5f5
    style CWF fill:#f3e5f5
    style RF fill:#f3e5f5
    style WS fill:#fff9c4
    style CS fill:#fff9c4
    style WSS fill:#fff9c4
    style UDS fill:#fff9c4
    style SDS fill:#fff9c4
```

## Clothing Recommendation Workflow (Detailed)

```mermaid
graph TB
    Start([User Query]) --> CheckClarify{Clarification<br/>Response?}
    
    CheckClarify -->|No - Fresh Request| IG[Input Guardrails]
    CheckClarify -->|Yes - Resume| Merge[Merge Clarification<br/>Context]
    
    IG --> IC[Intent Classifier]
    IC -->|clothing| QA[Query Analyzer Node]
    IC -->|general| GCA[General Conversation Agent]
    
    QA -->|Determine Scope| Scope{Search Scope?}
    
    Scope -->|Commerce| CRA[Clothing Recommender Agent]
    Scope -->|Wardrobe| CRA
    Scope -->|Both| CRA
    
    Merge -->|Resume with<br/>updated filters| CRA
    
    CRA -->|Fetch Context| UD[User Data MCP]
    CRA -->|Fetch Context| SD[Style DNA MCP]
    CRA -->|Search| MCP[Commerce/Wardrobe MCP]
    
    MCP -->|Items Found?| Check1{Results?}
    
    Check1 -->|No Results| WSS[Web Search MCP<br/>Fallback Search]
    Check1 -->|Has Results| CAA[Clothing Analyzer Agent]
    WSS --> CAA
    
    CAA -->|Analyze| Analysis{Analysis Result}
    
    Analysis -->|APPROVE| OG[Output Guardrails]
    Analysis -->|REFINE| Notes[Add Refinement Notes]
    Analysis -->|CLARIFY| SaveCtx[Save Clarification<br/>Context]
    
    Notes -->|Retry with<br/>updated filters| CRA
    
    SaveCtx --> OG
    
    OG --> RF[Response Formatter]
    GCA --> OG
    
    RF -->|If Clarifying| WaitUser([Wait for User<br/>workflow_status=awaiting])
    RF -->|If Complete| End([Response Delivered<br/>workflow_status=completed])
    
    WaitUser -.->|Next Turn| CheckClarify
    
    style Start fill:#e3f2fd
    style CheckClarify fill:#fff9c4
    style Merge fill:#c8e6c9
    style QA fill:#fff3e0
    style CRA fill:#e8f5e9
    style CAA fill:#f3e5f5
    style RF fill:#e1bee7
    style Analysis fill:#fff9c4
    style Notes fill:#ffccbc
    style SaveCtx fill:#ffccbc
    style WaitUser fill:#ffcdd2
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

**Note:** The following diagram shows the conceptual flow of agent communication. In the actual implementation, agents communicate through shared LangGraph state rather than explicit A2A protocol messages. State updates trigger workflow transitions automatically.

```mermaid
sequenceDiagram
    participant User
    participant Gateway
    participant Workflow
    participant Recommender as Clothing Recommender Agent
    participant Analyzer as Clothing Analyzer Agent
    participant MCP as MCP Servers
    
    User->>Gateway: POST /api/v1/agent/chat/stream
    Gateway->>Workflow: Route request
    Workflow->>Workflow: Check for pending clarification
    Workflow->>Recommender: Start recommendation
    
    Recommender->>MCP: get_user_profile(user_id)
    MCP-->>Recommender: UserProfile
    
    Recommender->>MCP: get_style_dna(user_id)
    MCP-->>Recommender: StyleDNA
    
    Recommender->>MCP: search_commerce_items(query, style_dna)
    MCP-->>Recommender: List[Items]
    
    Recommender->>Workflow: Update state: retrieved_items
    
    Workflow->>Analyzer: State transition (retrieved_items updated)
    Note over Analyzer: State-based communication:<br/>Analyzer reads retrieved_items<br/>from shared state
    
    Analyzer->>Analyzer: Analyze items vs query + style_dna
    
    alt Items Approved
        Analyzer->>Workflow: Update state: analysis_result.decision = "approve"
        Workflow->>Workflow: Set workflow_status = "completed"
        Workflow->>Gateway: Stream: items + response
    else Items Need Refinement
        Analyzer->>Workflow: Update state: refinement_notes, iteration++
        Note over Workflow: Conditional routing based on<br/>analysis_result.decision == "refine"
        Note over Workflow: parse_refinement_notes_to_filters()<br/>extracts structured filter updates
        Workflow->>Recommender: Retry (reads refinement_notes from state)
        Recommender->>MCP: search_commerce_items(query + refinement_notes)
        MCP-->>Recommender: List[Items]
        Recommender->>Workflow: Update state: retrieved_items
        Workflow->>Analyzer: State transition (retrieved_items updated)
        Analyzer->>Workflow: Update state: analysis_result.decision = "approve"
    else Query Unclear (Clarification Needed)
        Analyzer->>Workflow: Update state: needs_clarification = True
        Workflow->>Workflow: Save clarification context<br/>(filters, items, iteration)
        Workflow->>Workflow: Set workflow_status = "awaiting_clarification"
        Workflow->>Gateway: Stream: clarification question
        Gateway->>User: "What occasion is this for?"
        Note over User,Workflow: Workflow ENDS - awaiting user response
    end
    
    Gateway->>User: SSE Stream: Final response
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
    subgraph "Agent"
        A[Clothing Recommender Agent]
    end
    
    subgraph "MCP Client"
        MC[MCP Client Library]
    end
    
    subgraph "MCP Server"
        MS[MCP Server<br/>Commerce/Wardrobe/etc]
        T[Tool Handler]
    end
    
    subgraph "Data Source"
        DS[(MongoDB<br/>or External API)]
    end
    
    A -->|1. Call Tool| MC
    MC -->|2. MCP Protocol<br/>JSON-RPC| MS
    MS -->|3. Route| T
    T -->|4. Query| DS
    DS -->|5. Results| T
    T -->|6. Format| MS
    MS -->|7. MCP Response| MC
    MC -->|8. Return| A
    
    style A fill:#e8f5e9
    style MC fill:#fff3e0
    style MS fill:#fff9c4
    style T fill:#e1bee7
    style DS fill:#b3e5fc
```

## Streaming Architecture

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Gateway
    participant AgentService
    participant LangGraph
    
    User->>Frontend: Type message
    Frontend->>Backend: POST /chat/:sessionId/message
    Backend->>Gateway: POST /api/v1/agent/chat/stream<br/>(SSE)
    
    Gateway->>AgentService: Forward request
    AgentService->>LangGraph: Execute workflow
    
    loop Workflow Execution
        LangGraph->>AgentService: Stream event
        AgentService->>Gateway: SSE: event
        Gateway->>Backend: SSE: event
        Backend->>Frontend: SSE: event
        Frontend->>User: Display update
    end
    
    LangGraph->>AgentService: Done event
    AgentService->>Gateway: SSE: done
    Gateway->>Backend: SSE: done
    Backend->>Frontend: SSE: done
    Backend->>Backend: Save to DB
    Frontend->>User: Complete response
```

## Example: Complete Flow for "Find me jackets"

```mermaid
graph TB
    Start([User: 'Find me jackets']) --> IC[Intent Classifier]
    IC -->|clothing| QA[Query Analyzer]
    
    QA -->|Extract| Extract[Extract:<br/>- Type: jackets<br/>- Category: TOP<br/>- Scope: commerce]
    
    Extract --> CRA[Clothing Recommender Agent]
    
    CRA -->|1| UD[User Data MCP:<br/>get_user_profile]
    CRA -->|2| SD[Style DNA MCP:<br/>get_style_dna]
    CRA -->|3| CS[Commerce MCP:<br/>search_items<br/>query='jackets'<br/>style_dna=warm_autumn]
    
    UD -->|Profile| CRA
    SD -->|Style DNA| CRA
    CS -->|5 jackets| CRA
    
    CRA -->|Items| CAA[Clothing Analyzer Agent]
    
    CAA -->|Analyze| Check{Match Style DNA?}
    
    Check -->|No - 2/5 match| Refine[Add Notes:<br/>'Need warm autumn colors'<br/>'More formal options']
    Refine -->|Retry| CS2[Commerce MCP:<br/>search_items<br/>+ refinement notes]
    CS2 -->|3 jackets| CAA
    
    Check -->|Yes - 3/3 match| Approve[APPROVE]
    
    Approve --> RF[Response Formatter]
    RF -->|Format| Format[Format Response:<br/>- List jackets<br/>- Add styling tips<br/>- Explain choices]
    
    Format -->|SSE Stream| Backend[Backend Chat API]
    Backend -->|SSE| Frontend[Frontend]
    Frontend -->|Display| User[User sees jackets]
    
    style Start fill:#e3f2fd
    style CRA fill:#e8f5e9
    style CAA fill:#f3e5f5
    style Approve fill:#c8e6c9
    style Refine fill:#ffccbc
    style RF fill:#e1bee7
```

## MCP Server Architecture

```mermaid
graph TB
    subgraph "MCP Protocol Layer"
        MCPClient[MCP Client<br/>in Agent Service]
        MCPServer[MCP Server<br/>Standalone Process]
    end
    
    subgraph "Tool Handlers"
        TH1[Wardrobe Tools]
        TH2[Commerce Tools]
        TH3[Web Search Tools]
        TH4[User Data Tools]
        TH5[Style DNA Tools]
    end
    
    subgraph "Data Access"
        DA1[MongoDB Driver]
        DA2[HTTP Client<br/>Tavily API]
        DA3[Embedding Service]
    end
    
    subgraph "Data Sources"
        DS1[(MongoDB<br/>Wardrobe)]
        DS2[(MongoDB<br/>Commerce)]
        DS3[(MongoDB<br/>User Profiles)]
        DS4[External API<br/>Tavily]
        DS5[Embedding Service<br/>Port 8004]
    end
    
    MCPClient <-->|JSON-RPC<br/>over stdio/HTTP| MCPServer
    MCPServer --> TH1
    MCPServer --> TH2
    MCPServer --> TH3
    MCPServer --> TH4
    MCPServer --> TH5
    
    TH1 --> DA1
    TH2 --> DA1
    TH2 --> DA3
    TH3 --> DA2
    TH4 --> DA1
    TH5 --> DA1
    
    DA1 --> DS1
    DA1 --> DS2
    DA1 --> DS3
    DA2 --> DS4
    DA3 --> DS5
    
    style MCPClient fill:#e8f5e9
    style MCPServer fill:#fff9c4
    style TH1 fill:#e1bee7
    style TH2 fill:#e1bee7
    style TH3 fill:#e1bee7
    style TH4 fill:#e1bee7
    style TH5 fill:#e1bee7
```
