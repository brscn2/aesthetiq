import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

export interface AgentChatRequest {
  user_id: string;
  session_id?: string;
  message: string;
  auth_token?: string;
}

export interface AgentChatResponse {
  session_id: string;
  response: string;
  intent: string | null;
  metadata: Record<string, any>;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly gatewayUrl: string;
  private readonly timeout: number;

  constructor(private configService: ConfigService) {
    this.gatewayUrl = this.configService.get<string>('PYTHON_GATEWAY_URL', 'http://localhost:8000');
    this.timeout = this.configService.get<number>('AGENT_TIMEOUT', 120000); // 2 minutes default
    this.logger.log(`Agent service initialized with gateway: ${this.gatewayUrl}`);
  }

  /**
   * Send a non-streaming chat request to the conversational agent.
   */
  async chat(request: AgentChatRequest): Promise<AgentChatResponse> {
    const url = `${this.gatewayUrl}/api/v1/agent/chat`;
    
    this.logger.log(`Sending chat request for user ${request.user_id}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Forward the auth token if provided
    if (request.auth_token) {
      headers['X-Auth-Token'] = request.auth_token;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: request.user_id,
        session_id: request.session_id,
        message: request.message,
      }),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Agent chat failed: ${response.status} - ${errorText}`);
      throw new Error(`Agent service error: ${response.status}`);
    }

    const data = await response.json();
    this.logger.log(`Chat response received for session ${data.session_id}`);
    return data;
  }

  /**
   * Stream a chat response using Server-Sent Events.
   * Proxies the SSE stream from the Python agent to the client.
   */
  async streamChat(request: AgentChatRequest, res: Response): Promise<void> {
    const url = `${this.gatewayUrl}/api/v1/agent/chat/stream`;
    
    this.logger.log(`Starting streaming chat for user ${request.user_id}`);

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Handle client disconnect
    res.on('close', () => {
      this.logger.log('Client disconnected from stream');
      controller.abort();
      clearTimeout(timeoutId);
    });

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };
    
    // Forward the auth token if provided
    if (request.auth_token) {
      headers['X-Auth-Token'] = request.auth_token;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: request.user_id,
          session_id: request.session_id,
          message: request.message,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Agent stream failed: ${response.status} - ${errorText}`);
        res.write(`data: ${JSON.stringify({ type: 'error', message: `Agent service error: ${response.status}` })}\n\n`);
        res.end();
        return;
      }

      if (!response.body) {
        this.logger.error('No response body from agent');
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'No response from agent' })}\n\n`);
        res.end();
        return;
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            this.logger.log('Stream completed');
            break;
          }

          // Forward the chunk directly to the client
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          this.logger.log('Stream aborted');
        } else {
          throw error;
        }
      } finally {
        reader.releaseLock();
      }

      clearTimeout(timeoutId);
      res.end();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        this.logger.log('Request timed out or was aborted');
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Request timed out' })}\n\n`);
          res.end();
        }
      } else {
        this.logger.error(`Stream error: ${error.message}`);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
          res.end();
        }
      }
    }
  }

  /**
   * Check if the agent service is healthy.
   */
  async healthCheck(): Promise<{ status: string; gateway: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/health`, {
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        return { status: 'healthy', gateway: this.gatewayUrl };
      }
      return { status: 'unhealthy', gateway: this.gatewayUrl };
    } catch (error) {
      return { status: 'unreachable', gateway: this.gatewayUrl };
    }
  }
}
