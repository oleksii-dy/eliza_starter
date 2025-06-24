export interface Scenario {
  name: string;
  description: string;
  messages: ScenarioMessage[];
  validate?: (runtime: any) => Promise<any>;
}

export interface ScenarioMessage {
  role: 'user' | 'assistant';
  content?: string;
  expectedActions?: string[];
  expectedContent?: string[];
}
