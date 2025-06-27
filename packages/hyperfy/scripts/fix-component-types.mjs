#!/usr/bin/env bun

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'

const scenarioFiles = glob.sync('src/rpg/testing/scenarios/*.ts', { cwd: process.cwd() })

const fixes = [
  // Import statements
  {
    pattern: /import \{ (.*?) \} from '\.\.\/\.\.\/types\/index';/,
    replacement: (match, imports) => {
      const newImports = imports.includes('InventoryComponent')
        ? imports
        : `${imports}, InventoryComponent, StatsComponent, CombatComponent, MovementComponent, ResourceComponent, ItemComponent, NPCComponent, QuestComponent, ConstructionComponent, ConstructionSiteComponent, SkillsComponent`
      return `import { ${newImports} } from '../../types/index';`
    },
  },
  // Component getters
  { pattern: /\.getComponent\('inventory'\)/g, replacement: ".getComponent<InventoryComponent>('inventory')" },
  { pattern: /\.getComponent\('stats'\)/g, replacement: ".getComponent<StatsComponent>('stats')" },
  { pattern: /\.getComponent\('combat'\)/g, replacement: ".getComponent<CombatComponent>('combat')" },
  { pattern: /\.getComponent\('movement'\)/g, replacement: ".getComponent<MovementComponent>('movement')" },
  { pattern: /\.getComponent\('resource'\)/g, replacement: ".getComponent<ResourceComponent>('resource')" },
  { pattern: /\.getComponent\('item'\)/g, replacement: ".getComponent<ItemComponent>('item')" },
  { pattern: /\.getComponent\('npc'\)/g, replacement: ".getComponent<NPCComponent>('npc')" },
  { pattern: /\.getComponent\('quest'\)/g, replacement: ".getComponent<QuestComponent>('quest')" },
  { pattern: /\.getComponent\('construction'\)/g, replacement: ".getComponent<ConstructionComponent>('construction')" },
  {
    pattern: /\.getComponent\('construction_site'\)/g,
    replacement: ".getComponent<ConstructionSiteComponent>('construction_site')",
  },
  { pattern: /\.getComponent\('skills'\)/g, replacement: ".getComponent<SkillsComponent>('skills')" },

  // Fix SkillType enum usage
  { pattern: /SkillType\.WOODCUTTING/g, replacement: "'woodcutting'" },
  { pattern: /SkillType\.ATTACK/g, replacement: "'attack'" },
  { pattern: /SkillType\.STRENGTH/g, replacement: "'strength'" },
  { pattern: /SkillType\.DEFENSE/g, replacement: "'defense'" },
  { pattern: /SkillType\.CONSTRUCTION/g, replacement: "'construction'" },
]

console.log('🔧 Fixing component type casting in scenario files...')

for (const file of scenarioFiles) {
  console.log(`📝 Processing ${file}...`)

  let content = readFileSync(file, 'utf8')

  for (const fix of fixes) {
    if (typeof fix.replacement === 'function') {
      content = content.replace(fix.pattern, fix.replacement)
    } else {
      content = content.replace(fix.pattern, fix.replacement)
    }
  }

  writeFileSync(file, content)
  console.log(`✅ Fixed ${file}`)
}

console.log('🎉 All scenario files updated!')
