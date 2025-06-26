/**
 * Meshy.ai API Integration Service
 *
 * Provides comprehensive AI creation tools for generating 3D items, characters,
 * and buildings in the Hyperfy RPG using Meshy.ai's text-to-3D, image-to-3D,
 * and rigging/animation APIs.
 */

export interface MeshyConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
}

export interface TextTo3DRequest {
  prompt: string
  artStyle?: 'realistic' | 'cartoon' | 'low-poly' | 'sculpture' | 'pbr'
  negativePrompt?: string
  seed?: number
  topology?: 'quad' | 'triangle'
}

export interface ImageTo3DRequest {
  imageUrl: string
  enablePbr?: boolean
  surfaceMode?: 'hard' | 'organic'
  targetPolycount?: number
  topology?: 'quad' | 'triangle'
}

export interface RiggingRequest {
  modelUrl: string
  rigType?: 'gaming' | 'standard'
  enableAnimation?: boolean
}

export interface MeshyTaskResponse {
  result: string
  id: string
  model_urls?: {
    glb?: string
    fbx?: string
    usdz?: string
    obj?: string
    mtl?: string
    texture_urls?: string[]
  }
  thumbnail_url?: string
  video_url?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED'
  task_error?: {
    message: string
    code: string
  }
  created_at: number
  finished_at?: number
}

export interface CreationMetadata {
  itemType: 'weapon' | 'armor' | 'consumable' | 'tool' | 'decoration' | 'character' | 'building'
  weaponType?: 'sword' | 'axe' | 'bow' | 'staff' | 'shield' | 'dagger' | 'mace' | 'spear'
  handPlacement?: {
    primaryGrip: { x: number; y: number; z: number }
    secondaryGrip?: { x: number; y: number; z: number }
    orientation: { x: number; y: number; z: number; w: number }
  }
  scale?: { x: number; y: number; z: number }
  attachmentPoints?: Array<{
    name: string
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number; w: number }
  }>
}

export class MeshyAIService {
  private config: MeshyConfig
  private baseUrl: string

  constructor(config: MeshyConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://api.meshy.ai'

    if (!config.apiKey) {
      throw new Error('Meshy.ai API key is required')
    }
  }

  /**
   * Generate 3D model from text description
   */
  async textTo3D(request: TextTo3DRequest, metadata?: CreationMetadata): Promise<string> {
    console.log(`🎨 Creating 3D model from text: "${request.prompt}"`)

    try {
      const response = await fetch(`${this.baseUrl}/v2/text-to-3d`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'preview',
          prompt: request.prompt,
          art_style: request.artStyle || 'realistic',
          negative_prompt: request.negativePrompt || 'low quality, blurry, distorted',
          seed: request.seed,
          topology: request.topology || 'quad',
        }),
      })

      if (!response.ok) {
        throw new Error(`Meshy API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`✅ Text-to-3D task created: ${result.result}`)

      return result.result // Task ID
    } catch (error) {
      console.error('❌ Text-to-3D generation failed:', error)
      throw new Error(`Failed to create 3D model from text: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generate 3D model from image
   */
  async imageTo3D(request: ImageTo3DRequest, metadata?: CreationMetadata): Promise<string> {
    console.log(`🖼️ Creating 3D model from image: ${request.imageUrl}`)

    try {
      const response = await fetch(`${this.baseUrl}/v2/image-to-3d`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: request.imageUrl,
          enable_pbr: request.enablePbr !== false,
          surface_mode: request.surfaceMode || 'hard',
          target_polycount: request.targetPolycount,
          topology: request.topology || 'quad',
        }),
      })

      if (!response.ok) {
        throw new Error(`Meshy API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`✅ Image-to-3D task created: ${result.result}`)

      return result.result // Task ID
    } catch (error) {
      console.error('❌ Image-to-3D generation failed:', error)
      throw new Error(`Failed to create 3D model from image: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Add rigging and animation to 3D model
   */
  async addRiggingAndAnimation(request: RiggingRequest): Promise<string> {
    console.log(`🎭 Adding rigging and animation to model: ${request.modelUrl}`)

    try {
      const response = await fetch(`${this.baseUrl}/v1/text-to-3d/refine`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preview_task_id: request.modelUrl, // Assuming this is a task ID
          texture_richness: 'high',
          rigging: request.rigType || 'gaming',
          animation: request.enableAnimation !== false,
        }),
      })

      if (!response.ok) {
        throw new Error(`Meshy API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`✅ Rigging task created: ${result.result}`)

      return result.result // Task ID
    } catch (error) {
      console.error('❌ Rigging and animation failed:', error)
      throw new Error(`Failed to add rigging and animation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get task status and results
   */
  async getTaskStatus(taskId: string): Promise<MeshyTaskResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/text-to-3d/${taskId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Meshy API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('❌ Failed to get task status:', error)
      throw new Error(`Failed to get task status: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Wait for task completion with polling
   */
  async waitForCompletion(taskId: string, maxWaitTime: number = 300000): Promise<MeshyTaskResponse> {
    console.log(`⏳ Waiting for task completion: ${taskId}`)

    const startTime = Date.now()
    const pollInterval = 5000 // 5 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getTaskStatus(taskId)

      if (status.status === 'SUCCEEDED') {
        console.log(`✅ Task completed successfully: ${taskId}`)
        return status
      }

      if (status.status === 'FAILED') {
        throw new Error(`Task failed: ${status.task_error?.message || 'Unknown error'}`)
      }

      console.log(`⏳ Task ${taskId} status: ${status.status}, waiting...`)
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error(`Task ${taskId} timed out after ${maxWaitTime}ms`)
  }

  /**
   * Generate complete item with metadata
   */
  async createItem(
    prompt: string,
    itemType: CreationMetadata['itemType'],
    weaponType?: CreationMetadata['weaponType']
  ): Promise<{ taskId: string; metadata: CreationMetadata }> {
    console.log(`🔨 Creating ${itemType} item: "${prompt}"`)

    // Enhanced prompt based on item type
    const enhancedPrompt = this.enhancePromptForItem(prompt, itemType, weaponType)

    const metadata: CreationMetadata = {
      itemType,
      weaponType,
      scale: this.getDefaultScale(itemType),
    }

    const taskId = await this.textTo3D(
      {
        prompt: enhancedPrompt,
        artStyle: 'realistic',
        negativePrompt: 'low quality, blurry, distorted, broken, incomplete',
        topology: 'quad',
      },
      metadata
    )

    return { taskId, metadata }
  }

  /**
   * Generate complete character with rigging
   */
  async createCharacter(
    description: string,
    imageUrl?: string
  ): Promise<{ modelTaskId: string; riggingTaskId?: string; metadata: CreationMetadata }> {
    console.log(`👤 Creating character: "${description}"`)

    const metadata: CreationMetadata = {
      itemType: 'character',
      scale: { x: 1, y: 1, z: 1 },
    }

    let modelTaskId: string

    if (imageUrl) {
      // Create from image
      modelTaskId = await this.imageTo3D(
        {
          imageUrl,
          enablePbr: true,
          surfaceMode: 'organic',
          topology: 'quad',
        },
        metadata
      )
    } else {
      // Create from text
      const enhancedPrompt = `detailed 3D character: ${description}, full body, T-pose, game-ready, clean topology`
      modelTaskId = await this.textTo3D(
        {
          prompt: enhancedPrompt,
          artStyle: 'realistic',
          negativePrompt: 'low quality, blurry, incomplete, missing limbs, deformed',
          topology: 'quad',
        },
        metadata
      )
    }

    // Note: Rigging will be added after model completion
    return { modelTaskId, metadata }
  }

  /**
   * Generate building or structure
   */
  async createBuilding(description: string): Promise<{ taskId: string; metadata: CreationMetadata }> {
    console.log(`🏗️ Creating building: "${description}"`)

    const enhancedPrompt = `detailed 3D building: ${description}, architectural, clean geometry, game-ready asset`

    const metadata: CreationMetadata = {
      itemType: 'building',
      scale: { x: 1, y: 1, z: 1 },
    }

    const taskId = await this.textTo3D(
      {
        prompt: enhancedPrompt,
        artStyle: 'realistic',
        negativePrompt: 'low quality, blurry, incomplete, broken architecture',
        topology: 'quad',
      },
      metadata
    )

    return { taskId, metadata }
  }

  /**
   * Enhance prompt based on item type
   */
  private enhancePromptForItem(
    prompt: string,
    itemType: CreationMetadata['itemType'],
    weaponType?: CreationMetadata['weaponType']
  ): string {
    const baseEnhancements = {
      weapon: 'detailed medieval weapon, clean geometry, game-ready asset, realistic materials',
      armor: 'detailed armor piece, clean geometry, game-ready asset, realistic materials',
      consumable: 'detailed consumable item, clean geometry, game-ready asset',
      tool: 'detailed tool, clean geometry, game-ready asset, functional design',
      decoration: 'detailed decorative item, clean geometry, game-ready asset',
      character: 'detailed 3D character, full body, T-pose, game-ready',
      building: 'detailed 3D building, architectural, clean geometry, game-ready asset',
    }

    const weaponEnhancements = {
      sword: 'sharp blade, detailed hilt, medieval sword design',
      axe: 'heavy blade, wooden handle, medieval axe design',
      bow: 'curved bow, string details, archer weapon',
      staff: 'magical staff, ornate design, wizard weapon',
      shield: 'protective shield, heraldic design, defensive equipment',
      dagger: 'sharp dagger, detailed handle, stealth weapon',
      mace: 'heavy mace, spiked head, blunt weapon',
      spear: 'long spear, sharp tip, polearm weapon',
    }

    let enhanced = `${prompt}, ${baseEnhancements[itemType]}`

    if (weaponType && weaponEnhancements[weaponType]) {
      enhanced += `, ${weaponEnhancements[weaponType]}`
    }

    return enhanced
  }

  /**
   * Get default scale for item type
   */
  private getDefaultScale(itemType: CreationMetadata['itemType']): { x: number; y: number; z: number } {
    const scales = {
      weapon: { x: 1, y: 1, z: 1 },
      armor: { x: 1, y: 1, z: 1 },
      consumable: { x: 0.5, y: 0.5, z: 0.5 },
      tool: { x: 0.8, y: 0.8, z: 0.8 },
      decoration: { x: 1, y: 1, z: 1 },
      character: { x: 1, y: 1, z: 1 },
      building: { x: 2, y: 2, z: 2 },
    }

    return scales[itemType]
  }

  /**
   * Batch create multiple items
   */
  async batchCreate(
    requests: Array<{
      prompt: string
      itemType: CreationMetadata['itemType']
      weaponType?: CreationMetadata['weaponType']
    }>
  ): Promise<Array<{ taskId: string; metadata: CreationMetadata; prompt: string }>> {
    console.log(`🔄 Batch creating ${requests.length} items`)

    const results: Array<{ taskId: string; metadata: CreationMetadata; prompt: string }> = []

    for (const request of requests) {
      try {
        const result = await this.createItem(request.prompt, request.itemType, request.weaponType)
        results.push({
          taskId: result.taskId,
          metadata: result.metadata,
          prompt: request.prompt,
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`❌ Failed to create item "${request.prompt}":`, error)
        throw error
      }
    }

    return results
  }

  /**
   * Get service health and API status
   */
  async getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; apiKey: boolean; connectivity: boolean }> {
    try {
      // Test connectivity with a simple API call
      const response = await fetch(`${this.baseUrl}/v2/text-to-3d/tasks`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      })

      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        apiKey: !!this.config.apiKey,
        connectivity: response.ok,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        apiKey: !!this.config.apiKey,
        connectivity: false,
      }
    }
  }
}
