// Selectors for Hyperfy UI elements

export const selectors = {
  // Main layout
  app: '.App, #root', // Support both class and React root
  viewport: '.App__viewport, #viewport, .viewport, canvas',
  ui: '.App__ui, .ui, [data-ui]',

  // Core UI
  coreUI: '.CoreUI',
  chat: '.Chat',
  chatInput: '.Chat__input',
  chatMessages: '.Chat__messages',

  // Sidebar
  sidebar: '.Sidebar',
  sidebarTabs: {
    apps: '[data-tab="apps"]',
    inspect: '[data-tab="inspect"]',
    avatar: '[data-tab="avatar"]',
    settings: '[data-tab="settings"]',
    code: '[data-tab="code"]',
    script: '[data-tab="script"]',
  },

  // Panels
  appsPane: '.AppsPane',
  appsList: '.AppsList',
  inspectPane: '.InspectPane',
  avatarPane: '.AvatarPane',
  settingsPane: '.SettingsPane',
  codeEditor: '.CodeEditor',
  scriptEditor: '.ScriptEditor',

  // Menu
  menu: '.Menu',
  menuMain: '.MenuMain',
  menuApp: '.MenuApp',
  menuItem: '.Menu__item',

  // Forms and inputs
  input: '.Input',
  button: '.Button',
  field: '.Field',
  fieldLabel: '.Field__label',
  fieldValue: '.Field__value',

  // Inventory and items
  inventory: '.Inventory',
  inventorySlot: '.Inventory__slot',
  inventoryItem: '.Inventory__item',

  // World elements
  entity: '[data-entity]',
  player: '[data-player]',
  npc: '[data-npc]',

  // Modals and dialogs
  modal: '.Modal',
  dialog: '.Dialog',
  tooltip: '.Tooltip',

  // Loading and status
  loading: '.Loading',
  spinner: '.Spinner',
  connectionStatus: '.ConnectionStatus',

  // RPG specific
  healthBar: '.HealthBar',
  manaBar: '.ManaBar',
  experienceBar: '.ExperienceBar',
  questLog: '.QuestLog',
  questItem: '.Quest__item',

  // Combat
  combatUI: '.CombatUI',
  targetFrame: '.TargetFrame',
  damageNumber: '.DamageNumber',

  // Trading
  tradeWindow: '.TradeWindow',
  tradeSlot: '.Trade__slot',
  tradeConfirm: '.Trade__confirm',

  // Banking
  bankWindow: '.BankWindow',
  bankTab: '.Bank__tab',
  bankSlot: '.Bank__slot',
}

// Helper function to get selector
export const getSelector = (path: string): string => {
  const parts = path.split('.')
  let current: any = selectors

  for (const part of parts) {
    current = current[part]
    if (!current) {
      throw new Error(`Selector not found: ${path}`)
    }
  }

  return current
}

// Common element queries
export const getByTestId = (testId: string) => `[data-testid="${testId}"]`
export const getByRole = (role: string) => `[role="${role}"]`
export const getByAriaLabel = (label: string) => `[aria-label="${label}"]`
