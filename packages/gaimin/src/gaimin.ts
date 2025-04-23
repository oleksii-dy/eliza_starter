export enum CHAT_ROLES {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system'
  }
  
  export interface IGaiminChatConfig {
    apiKey: string;
    baseURL?: string;
    subscriptionName?: string;
    subscriptionId?: string;
    fetch?: typeof fetch;
  }
  
  export interface IGaiminChatConversation {
    role: CHAT_ROLES;
    content: string;
  }
  
  export interface GaiminChatSettings {
    temperature?: number;
    maxTokens?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    model?: string;
    stream?: boolean;
  }
  
  export interface GaiminChatLanguageModel {
    specificationVersion: string;
    provider: string;
    modelId: string;
    defaultObjectGenerationMode: string;
    generateText(params: {
      prompt: string;
      system?: string;
      temperature?: number;
      maxTokens?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
    }): Promise<string>;
  }
  
  export interface GaiminProvider {
    languageModel(modelId: string, settings?: GaiminChatSettings): GaiminChatLanguageModel;
  }
  
  /**
   * Gaimin API client for text generation
   */
  export class Gaimin {
    private readonly API_URL: string;
    private readonly apiKey: string;
    private readonly subscriptionName?: string;
    private readonly subscriptionId?: string;
    private readonly fetchFn: typeof fetch;
  
    /**
     * Creates a new Gaimin client
     * @param config Configuration for the Gaimin API
     */
    constructor(private readonly config: IGaiminChatConfig) {
      this.API_URL = config.baseURL || 'https://api.cloud.gaimin.io/ai/text-2-text/api/generate';
      this.apiKey = config.apiKey;
      this.subscriptionName = config.subscriptionName;
      this.subscriptionId = config.subscriptionId;
      this.fetchFn = config.fetch || fetch;
    }
  
    /**
     * Creates a language model interface for use with the AI SDK
     * @param modelId The model ID to use (e.g., "llama3.2")
     * @param settings Optional settings for the model
     * @returns A language model compatible with AI SDK
     */
    languageModel(modelId: string, settings?: GaiminChatSettings): GaiminChatLanguageModel {
      // Create a reference to 'this' that can be used inside the object literal
      const self = this;
      
      return {
        specificationVersion: "v1",
        provider: "gaimin",
        modelId: modelId,
        defaultObjectGenerationMode: "generation",
        
        // Option 1: Use an arrow function (preferred)
        generateText: async function(params) {
          const { prompt, system, temperature, maxTokens, frequencyPenalty, presencePenalty } = params;
          
          // Construct messages array
          const messages = [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: prompt }
          ];
  
          // Now use self instead of this
          const response = await fetch(self.API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${self.apiKey}`,
              ...(self.subscriptionName && { 'Subscription-Name': self.subscriptionName }),
              ...(self.subscriptionId && { 'Subscription-ID': self.subscriptionId }),
            },
            body: JSON.stringify({
              model: modelId,
              messages,
              temperature: temperature ?? settings?.temperature ?? 0.7,
              max_tokens: maxTokens ?? settings?.maxTokens ?? 1000,
              frequency_penalty: frequencyPenalty ?? settings?.frequencyPenalty ?? 0,
              presence_penalty: presencePenalty ?? settings?.presencePenalty ?? 0,
              stream: false
            })
          });
  
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gaimin API error (${response.status}): ${errorText}`);
          }
  
          const data = await response.json();
          return data.choices[0]?.message?.content || '';
        }
      };
    }
  
    /**
     * Send a message to the Gaimin API with streaming support
     * @param message The user message to send
     * @param options Configuration options
     * @returns The conversation history
     */
    async sendMessage(message: string, options: {
      model?: string, 
      system?: string,
      temperature?: number,
      maxTokens?: number,
      stream?: boolean,
      history?: IGaiminChatConversation[]
    } = {}): Promise<{ text: string, stream?: ReadableStream<string> }> {
      const conversationHistory = options.history || [];
      
      // Add system message if provided
      if (options.system) {
        conversationHistory.unshift({ role: CHAT_ROLES.SYSTEM, content: options.system });
      }
      
      // Add user message
      conversationHistory.push({ role: CHAT_ROLES.USER, content: message });
  
      try {
        // Handle streaming if requested
        if (options.stream) {
          let botResponse = '';
          const stream = new ReadableStream<string>({
            start: (controller) => {
              fetch(this.API_URL, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${this.apiKey}`,
                  ...(this.subscriptionName && { 'Subscription-Name': this.subscriptionName }),
                  ...(this.subscriptionId && { 'Subscription-ID': this.subscriptionId }),
                },
                body: JSON.stringify({
                  model: options.model || 'llama3.2',
                  messages: conversationHistory,
                  temperature: options.temperature ?? 0.7,
                  max_tokens: options.maxTokens ?? 1000,
                  stream: true
                })
              })
              .then(response => {
                if (!response.ok) {
                  controller.error(new Error(`API error: ${response.status}`));
                  return;
                }
                
                const reader = response.body!.getReader();
                const decoder = new TextDecoder('utf-8');
                
                function push() {
                  reader.read().then(({ done, value }) => {
                    if (done) {
                      controller.close();
                      return;
                    }
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const parsed = parseJSONLines(chunk);
                    
                    parsed.forEach((data: any) => {
                      const content = data.message?.content || '';
                      botResponse += content;
                      controller.enqueue(content);
                    });
                    
                    push();
                  }).catch(err => {
                    controller.error(err);
                  });
                }
                
                push();
              })
              .catch(err => {
                controller.error(err);
              });
            }
          });
          
          // Return the stream itself instead of trying to get its controller
          return { 
            text: '', 
            stream // Return the stream directly
          };
        }
        
        // Non-streaming request
        const response = await this.fetchFn(this.API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...(this.subscriptionName && { 'Subscription-Name': this.subscriptionName }),
            ...(this.subscriptionId && { 'Subscription-ID': this.subscriptionId }),
          },
          body: JSON.stringify({
            model: options.model || 'llama3.2',
            messages: conversationHistory,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1000,
            stream: false
          })
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch response from API');
        }
  
        const data = await response.json();
        return { text: data.choices[0]?.message?.content || '' };
      } catch (error) {
        console.error('Error in Gaimin API request:', error);
        throw error;
      }
    }
  }
  
  /**
   * Parse JSON lines from streaming response
   * @param input String input from stream
   * @returns Array of parsed JSON objects
   */
  function parseJSONLines(input: string) {
    const lines = input.trim().split('\n');
    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.error(`Error parsing line: ${line}`, error);
          return null;
        }
      })
      .filter((obj) => obj !== null);
  }
  
  /**
   * Creates a Gaimin provider instance
   * @param options Configuration options
   * @returns A Gaimin provider instance
   */
  export function createGaimin(options: IGaiminChatConfig): GaiminProvider {
    const gaimin = new Gaimin(options);
    
    return {
      languageModel: (modelId: string, settings?: GaiminChatSettings) => 
        gaimin.languageModel(modelId, settings)
    };
  }