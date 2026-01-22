/**
 * Types for the Conversational Agent streaming API.
 * 
 * The agent uses Server-Sent Events (SSE) to stream workflow progress
 * and responses back to the client in real-time.
 */

// =============================================================================
// Stream Event Types
// =============================================================================

/**
 * All possible SSE event types from the conversational agent.
 */
export type StreamEventType =
  | "metadata"
  | "status"
  | "node_start"
  | "node_end"
  | "intent"
  | "filters"
  | "items_found"
  | "analysis"
  | "tool_call"
  | "chunk"
  | "done"
  | "error";

/**
 * Base stream event structure.
 */
export interface BaseStreamEvent {
  type: StreamEventType;
  timestamp?: string;
}

/**
 * Initial metadata about the session.
 */
export interface MetadataEvent extends BaseStreamEvent {
  type: "metadata";
  session_id: string;
  user_id: string;
  trace_id?: string;
}

/**
 * Human-readable status message.
 */
export interface StatusEvent extends BaseStreamEvent {
  type: "status";
  message: string;
}

/**
 * Workflow node started executing.
 */
export interface NodeStartEvent extends BaseStreamEvent {
  type: "node_start";
  node: string;
  display_name: string;
}

/**
 * Workflow node finished executing.
 */
export interface NodeEndEvent extends BaseStreamEvent {
  type: "node_end";
  node: string;
}

/**
 * Intent classification result.
 */
export interface IntentEvent extends BaseStreamEvent {
  type: "intent";
  intent: "general" | "clothing";
}

/**
 * Extracted search filters.
 */
export interface FiltersEvent extends BaseStreamEvent {
  type: "filters";
  filters: Record<string, any> | null;
  scope: "commerce" | "wardrobe" | "both" | null;
}

/**
 * Items found during search.
 */
export interface ItemsFoundEvent extends BaseStreamEvent {
  type: "items_found";
  count: number;
  sources: string[];
}

/**
 * Analyzer decision result.
 */
export interface AnalysisEvent extends BaseStreamEvent {
  type: "analysis";
  decision: "approve" | "refine" | "clarify";
  confidence: number | null;
}

/**
 * MCP tool being called.
 */
export interface ToolCallEvent extends BaseStreamEvent {
  type: "tool_call";
  tool: string;
  input: string;
}

/**
 * Response text chunk (for streaming text).
 */
export interface ChunkEvent extends BaseStreamEvent {
  type: "chunk";
  content: string;
}

/**
 * Workflow completed with final response.
 */
export interface DoneEvent extends BaseStreamEvent {
  type: "done";
  response: string;
  intent: "general" | "clothing" | null;
  items: ClothingItem[];
  workflow_status: "active" | "awaiting_clarification" | "completed";
  needs_clarification: boolean;
  clarification_question: string | null;
  session_id: string;
}

/**
 * Error occurred during workflow.
 */
export interface ErrorEvent extends BaseStreamEvent {
  type: "error";
  message: string;
}

/**
 * Union type for all stream events.
 */
export type StreamEvent =
  | MetadataEvent
  | StatusEvent
  | NodeStartEvent
  | NodeEndEvent
  | IntentEvent
  | FiltersEvent
  | ItemsFoundEvent
  | AnalysisEvent
  | ToolCallEvent
  | ChunkEvent
  | DoneEvent
  | ErrorEvent;

// =============================================================================
// Clothing Item Types
// =============================================================================

/**
 * A clothing item returned from the agent.
 */
export interface ClothingItem {
  id: string;
  name: string;
  source: "wardrobe" | "commerce" | "web";
  category?: string;
  subCategory?: string;
  colorHex?: string;
  brand?: string;
  size?: string;
  price?: number;
  imageUrl?: string;
  productUrl?: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// Chat Request/Response Types
// =============================================================================

/**
 * Request body for chat endpoints.
 * Uses camelCase to match backend DTO format.
 */
export interface ChatRequest {
  sessionId?: string;
  message: string;
}

/**
 * Response from non-streaming chat endpoint.
 */
export interface ChatResponse {
  session_id: string;
  response: string;
  intent: "general" | "clothing" | null;
  metadata: Record<string, any>;
}

// =============================================================================
// Session Types
// =============================================================================

/**
 * Clarification context saved when workflow is paused.
 */
export interface ClarificationContext {
  original_message: string;
  clarification_question: string;
  extracted_filters: Record<string, any> | null;
  search_scope: string | null;
  retrieved_items: ClothingItem[];
  iteration: number;
}

/**
 * Chat session state for the frontend.
 */
export interface ChatSessionState {
  sessionId: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  currentStatus: string | null;
  currentNode: string | null;
  pendingClarification: ClarificationContext | null;
  error: string | null;
}

// =============================================================================
// UI Message Types
// =============================================================================

/**
 * A message in the chat UI.
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[];
  items?: ClothingItem[];
  isStreaming?: boolean;
  metadata?: {
    intent?: string;
    sources?: string[];
    needsClarification?: boolean;
  };
}

/**
 * A completed workflow node.
 */
export interface CompletedNode {
  node: string;
  displayName: string;
}

/**
 * A tool call made during workflow execution.
 */
export interface ToolCall {
  tool: string;
  input: string;
}

/**
 * Progress state during streaming.
 */
export interface StreamingProgress {
  currentNode: string | null;
  displayName: string | null;
  completedNodes: CompletedNode[];
  intent: string | null;
  itemsFound: number;
  sources: string[];
  decision: string | null;
  toolCalls: ToolCall[];
}
