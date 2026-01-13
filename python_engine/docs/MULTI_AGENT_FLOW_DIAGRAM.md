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
    Start([User Query:<br/>Clothing Request]) --> QA[Query Analyzer Node]
    
    QA -->|Determine Scope| Scope{Search Scope?}
    
    Scope -->|Commerce Only| CRA1[Clothing Recommender Agent]
    Scope -->|Wardrobe Only| CRA2[Clothing Recommender Agent]
    Scope -->|Both| CRA3[Clothing Recommender Agent]
    
    CRA1 -->|Fetch Context| UD[User Data MCP<br/>Get Profile]
    CRA1 -->|Fetch Context| SD[Style DNA MCP<br/>Get Style DNA]
    CRA1 -->|Search| CS[Commerce MCP<br/>Search Items]
    
    CRA2 -->|Fetch Context| UD
    CRA2 -->|Fetch Context| SD
    CRA2 -->|Search| WS[Wardrobe MCP<br/>Search Items]
    
    CRA3 -->|Fetch Context| UD
    CRA3 -->|Fetch Context| SD
    CRA3 -->|Search| WS
    CRA3 -->|Search| CS
    
    CS -->|Items Found?| Check1{Results?}
    WS -->|Items Found?| Check1
    
    Check1 -->|No Results| WSS[Web Search MCP<br/>Fallback Search]
    Check1 -->|Has Results| CAA[Clothing Analyzer Agent]
    WSS --> CAA
    
    CAA -->|Analyze| Analysis{Analysis Result}
    
    Analysis -->|APPROVE| RF[Response Formatter]
    Analysis -->|REFINE| Notes[Add Refinement Notes]
    Analysis -->|CLARIFY| Ask[Ask User for Info]
    
    Notes -->|Retry| CRA1
    Notes -->|Retry| CRA2
    Notes -->|Retry| CRA3
    
    Ask -->|User Response| QA
    
    RF -->|Stream| Backend[Backend Chat API]
    Backend -->|SSE| Frontend[Frontend]
    
    End([Response Delivered])
    RF --> End
    
    style Start fill:#e3f2fd
    style QA fill:#fff3e0
    style CRA1 fill:#e8f5e9
    style CRA2 fill:#e8f5e9
    style CRA3 fill:#e8f5e9
    style CAA fill:#f3e5f5
    style RF fill:#e1bee7
    style Analysis fill:#fff9c4
    style Notes fill:#ffccbc
    style Ask fill:#ffccbc
```

## Agent Communication (A2A Protocol)

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
    Workflow->>Recommender: Start recommendation
    
    Recommender->>MCP: get_user_profile(user_id)
    MCP-->>Recommender: UserProfile
    
    Recommender->>MCP: get_style_dna(user_id)
    MCP-->>Recommender: StyleDNA
    
    Recommender->>MCP: search_commerce_items(query, style_dna)
    MCP-->>Recommender: List[Items]
    
    Recommender->>Workflow: Update state: retrieved_items
    
    Workflow->>Analyzer: Request analysis (A2A)
    Note over Analyzer: A2A Message:<br/>{from: recommender,<br/>to: analyzer,<br/>type: request_analysis,<br/>payload: {items, query, style_dna}}
    
    Analyzer->>Analyzer: Analyze items vs query + style_dna
    
    alt Items Approved
        Analyzer->>Workflow: A2A: analysis_result (APPROVE)
        Workflow->>Gateway: Stream: items + response
    else Items Need Refinement
        Analyzer->>Workflow: A2A: refinement_request (notes)
        Workflow->>Recommender: Retry with notes
        Recommender->>MCP: search_commerce_items(query + notes)
        MCP-->>Recommender: List[Items]
        Recommender->>Workflow: Update state
        Workflow->>Analyzer: Request analysis again
        Analyzer->>Workflow: A2A: analysis_result (APPROVE)
    else Query Unclear
        Analyzer->>Workflow: A2A: clarification_request
        Workflow->>Gateway: Stream: ask user
        Gateway->>User: "What occasion is this for?"
        User->>Gateway: Response
        Gateway->>Workflow: Updated query
        Workflow->>Recommender: Retry with clarification
    end
    
    Gateway->>User: SSE Stream: Final response
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
