import { describe, it, expect, vi, beforeEach } from 'vitest'
import { openaiPlugin } from '../src/index'
import { ModelType } from '@elizaos/core'

describe('OpenAI Plugin Structure', () => {
  // Create a mock runtime for testing
  const mockRuntime = {
    getSetting: vi.fn(),
    getAllServices: vi.fn(() => new Map()),
    getService: vi.fn(),
    emit: vi.fn(),
    registerCommand: vi.fn()
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should have the correct structure', () => {
    // Check that the plugin has the expected properties
    expect(openaiPlugin).toHaveProperty('name')
    expect(openaiPlugin).toHaveProperty('description')
    expect(openaiPlugin).toHaveProperty('config')
    expect(openaiPlugin).toHaveProperty('init')
    expect(openaiPlugin).toHaveProperty('models')

    // Check the specific properties
    expect(openaiPlugin.name).toBe('openai')
    expect(typeof openaiPlugin.description).toBe('string')
    expect(typeof openaiPlugin.init).toBe('function')
  })

  it('should have expected model functions', () => {
    // Make sure the models object exists
    expect(openaiPlugin.models).toBeDefined()
    if (!openaiPlugin.models) return

    // Check for at least one model function
    // We're not checking specific model functions, as they might change
    const modelKeys = Object.keys(openaiPlugin.models)
    expect(modelKeys.length).toBeGreaterThan(0)
  })

  it('should export an init function', () => {
    // Verify the init function exists
    expect(openaiPlugin.init).toBeInstanceOf(Function)
  })

  it('should define the necessary config options', () => {
    // Check for config presence - we're not validating specific values
    expect(openaiPlugin.config).toBeDefined()
    expect(typeof openaiPlugin.config).toBe('object')
  })
})
