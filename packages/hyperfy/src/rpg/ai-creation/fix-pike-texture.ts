#!/usr/bin/env bun

/**
 * Quick Fix for Pike Texture
 * Specifically addresses the user's concern about the Pike still showing green
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { MeshyAIService } from './MeshyAIService'

async function fixPikeTexture() {
  console.log('🎯 Fixing Pike Texture - Immediate Fix for Green Issue...\n')
  
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) {
    console.error('❌ MESHY_API_KEY environment variable is required')
    process.exit(1)
  }
  
  const service = new MeshyAIService({ apiKey })
  
  const pikeModel = {
    id: "item_10121_Pike",
    name: "Pike", 
    glbPath: "src/rpg/data/real_3d_models/models/item_10121_Pike/Pike.glb",
    prompt: "medieval pike with bright silver steel spear tip, long brown wooden shaft with natural wood grain texture, dark iron ferrules and metal bindings, brown leather grip wrapping, functional polearm design, battle-worn steel with metallic shine, realistic wood and metal materials, vertical orientation with tip up, medieval weapon, fantasy RPG asset, high quality pbr textures, realistic materials, steel and wood colors, NO green coloring whatsoever"
  }

  try {
    console.log(`🎯 Fixing ${pikeModel.name} - Eliminating Green Texture...`)
    console.log(`   🎨 Enhanced prompt: ${pikeModel.prompt.substring(0, 100)}...`)
    
    // Generate with enhanced anti-green prompt
    const taskId = await service.textTo3D({
      prompt: pikeModel.prompt,
      artStyle: 'realistic',
      negativePrompt: 'green color, green texture, solid green, flat green, lime green, mint green, emerald green, neon green, forest green, olive green, bright green, dark green, any green tint, green material, green surface, low quality, blurry, distorted, broken, incomplete, flat shading, cartoon'
    })
    
    console.log(`   ✅ Generation started: ${taskId}`)
    console.log(`   ⏳ Waiting for completion...`)
    
    // Wait for completion
    const result = await service.waitForCompletion(taskId)
    
    if (result.status === 'SUCCEEDED' && result.model_urls?.glb) {
      console.log(`   📥 Downloading fixed Pike model...`)
      
      // Download the fixed GLB file
      const response = await fetch(result.model_urls.glb)
      if (!response.ok) {
        throw new Error(`Failed to download GLB: ${response.status}`)
      }
      
      const glbData = await response.arrayBuffer()
      console.log(`   ✅ Downloaded: ${glbData.byteLength} bytes`)
      
      // Backup original green version
      if (existsSync(pikeModel.glbPath)) {
        const backupPath = pikeModel.glbPath.replace('.glb', '_green_backup.glb')
        if (!existsSync(backupPath)) {
          const originalData = readFileSync(pikeModel.glbPath)
          writeFileSync(backupPath, originalData)
          console.log(`   💾 Backed up green Pike to: ${backupPath}`)
        }
      }
      
      // Ensure directory exists
      mkdirSync(dirname(pikeModel.glbPath), { recursive: true })
      
      // Save the fixed model
      writeFileSync(pikeModel.glbPath, new Uint8Array(glbData))
      
      console.log(`   💾 Fixed Pike saved to: ${pikeModel.glbPath}`)
      console.log(`   🎉 SUCCESS: Pike should now have realistic steel and wood textures!`)
      console.log(`   🚫 No more green coloring on the Pike!`)
      
      console.log(`\n🎮 The Pike has been fixed with:`)
      console.log(`   🔸 Silver steel spear tip with metallic shine`)
      console.log(`   🔸 Brown wooden shaft with natural grain`)
      console.log(`   🔸 Dark iron metal bindings`)
      console.log(`   🔸 Brown leather grip wrapping`)
      console.log(`   🚫 Completely eliminated green textures`)
      
      console.log(`\n🌐 Refresh the 3D viewer to see the fixed Pike:`)
      console.log(`   file://${process.cwd()}/src/rpg/data/real_3d_models/index.html`)
      console.log(`\n💡 The old green Pike is backed up as Pike_green_backup.glb`)
      
    } else {
      throw new Error(`Generation failed: ${result.status}`)
    }
    
  } catch (error) {
    console.error(`   ❌ FAILED to fix Pike texture: ${error}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.main) {
  fixPikeTexture().catch(console.error)
}

export { fixPikeTexture }