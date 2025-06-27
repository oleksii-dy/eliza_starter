declare module '@elizaos/scenarios' {
  export interface Scenario {
    id: string;
    name: string;
    description: string;
    steps: ScenarioStep[];
  }

  export interface ScenarioStep {
    id: string;
    type: string;
    config: unknown;
  }

  export function loadScenarios(): Promise<Scenario[]>;
  export function runScenario(scenario: Scenario): Promise<unknown>;
  const defaultExport: unknown;
  export default defaultExport;
}
