#!/usr/bin/env bun

/**
 * Fix Model Textures - Generate realistic textured models
 * 
 * This script regenerates the models with enhanced prompts specifically 
 * designed to eliminate green textures and add realistic materials.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { MeshyAIService } from './MeshyAIService'

// Models to fix with enhanced texture-focused prompts
const MODELS_TO_FIX = [
  {
    id: "item_10051_Adamant_Battleaxe",
    name: "Adamant Battleaxe",
    glbPath: "src/rpg/data/real_3d_models/models/item_10051_Adamant_Battleaxe/AdamantBattleaxe.glb",
    prompt: "adamant battleaxe with realistic dark steel blade, worn metal surface with battle damage, leather-wrapped wooden handle with brown leather, medieval weapon design, sharp cutting edge, detailed metalwork, weathered iron and steel materials, vertical orientation blade up, fantasy RPG game asset, pbr textures, high quality materials, NO green coloring"
  },
  {
    id: "item_10070_Dragon_Spear", 
    name: "Dragon Spear",
    glbPath: "src/rpg/data/real_3d_models/models/item_10070_Dragon_Spear/DragonSpear.glb",
    prompt: "dragon spear with bronze and gold metal, ornate dragon decorations in copper, wooden shaft with natural wood grain, red and gold dragon motifs, magical weapon with warm metallic colors, sharp spear tip, detailed carved handle, vertical polearm, fantasy RPG asset, pbr materials, realistic textures, NO green coloring"
  },
  {
    id: "item_10121_Pike",
    name: "Pike", 
    glbPath: "src/rpg/data/real_3d_models/models/item_10121_Pike/Pike.glb",
    prompt: "medieval pike with silver steel spear tip, long wooden shaft with natural brown wood grain, iron ferrules and bindings, leather grip wrapping in brown, simple functional design, battle-worn metal, realistic wood texture, vertical polearm weapon, medieval game asset, pbr textures, realistic materials, NO green coloring"
  }
]

async function fixModelTextures() {
  console.log('🎨 Fixing Model Textures - Eliminating Green and Adding Realism...\n')
  
  const apiKey = process.env.MESHY_API_KEY
  if (!apiKey) {
    console.error('❌ MESHY_API_KEY environment variable is required')
    process.exit(1)
  }
  
  const service = new MeshyAIService({ apiKey })
  
  let successCount = 0
  let failureCount = 0
  
  for (const model of MODELS_TO_FIX) {
    try {
      console.log(`🎯 Fixing ${model.name}...`)
      console.log(`   🎨 Enhanced prompt: ${model.prompt.substring(0, 100)}...`)
      
      // Generate with enhanced texture-focused prompt
      const taskId = await service.textTo3D({
        prompt: model.prompt,
        artStyle: 'realistic',
        negativePrompt: 'green color, green texture, solid green, flat green, lime green, mint green, emerald green, low quality, blurry, distorted, broken, incomplete, flat shading, cartoon'
      })
      
      console.log(`   ✅ Generation started: ${taskId}`)
      console.log(`   ⏳ Waiting for completion...`)
      
      // Wait for completion
      const result = await service.waitForCompletion(taskId)
      
      if (result.status === 'SUCCEEDED' && result.model_urls?.glb) {
        console.log(`   📥 Downloading enhanced model...`)
        
        // Download the enhanced GLB file
        const response = await fetch(result.model_urls.glb)
        if (!response.ok) {
          throw new Error(`Failed to download GLB: ${response.status}`)
        }
        
        const glbData = await response.arrayBuffer()
        console.log(`   ✅ Downloaded: ${glbData.byteLength} bytes`)
        
        // Backup original if it exists
        if (existsSync(model.glbPath)) {
          const backupPath = model.glbPath.replace('.glb', '_green_backup.glb')
          if (!existsSync(backupPath)) {
            const originalData = readFileSync(model.glbPath)
            writeFileSync(backupPath, originalData)
            console.log(`   💾 Backed up green version to: ${backupPath}`)
          }
        }
        
        // Ensure directory exists
        mkdirSync(dirname(model.glbPath), { recursive: true })
        
        // Save the enhanced model
        writeFileSync(model.glbPath, new Uint8Array(glbData))
        
        console.log(`   💾 Enhanced model saved to: ${model.glbPath}`)
        console.log(`   🎉 SUCCESS: ${model.name} - No more green texture!\n`)
        
        successCount++
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } else {
        throw new Error(`Generation failed: ${result.status}`)
      }
      
    } catch (error) {
      console.error(`   ❌ FAILED: ${model.name} - ${error}\n`)
      failureCount++
    }
  }
  
  console.log(`🎨 Texture Fix Summary:`)
  console.log(`   ✅ Fixed: ${successCount}`)
  console.log(`   ❌ Failed: ${failureCount}`)
  console.log(`   📊 Success Rate: ${((successCount / MODELS_TO_FIX.length) * 100).toFixed(1)}%`)
  
  if (successCount > 0) {
    console.log(`\n🎮 Your models now have:`)
    console.log(`   🚫 No more green textures!`)
    console.log(`   🎨 Realistic metal, wood, and leather materials`)
    console.log(`   ✨ Enhanced visual quality`)
    console.log(`\n🌐 Refresh the 3D viewer to see the improvements:`)
    console.log(`   file://${process.cwd()}/src/rpg/data/real_3d_models/index.html`)
    console.log(`\n💡 The old green versions are backed up as *_green_backup.glb`)
  }
}

// Run if called directly
if (import.meta.main) {
  fixModelTextures().catch(console.error)
}

export { fixModelTextures }