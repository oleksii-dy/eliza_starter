[@ai16z/eliza v0.1.6-alpha.4](../index.md) / GenerationOptions

# Interface: GenerationOptions

Configuration options for generating objects with a model.

## Properties

### runtime

> **runtime**: [`IAgentRuntime`](IAgentRuntime.md)

#### Defined in

[packages/core/src/generation.ts:1239](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1239)

***

### context

> **context**: `string`

#### Defined in

[packages/core/src/generation.ts:1240](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1240)

***

### modelClass

> **modelClass**: [`ModelClass`](../enumerations/ModelClass.md)

#### Defined in

[packages/core/src/generation.ts:1241](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1241)

***

### schema?

> `optional` **schema**: `ZodType`\<`any`, `ZodTypeDef`, `any`\>

#### Defined in

[packages/core/src/generation.ts:1242](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1242)

***

### schemaName?

> `optional` **schemaName**: `string`

#### Defined in

[packages/core/src/generation.ts:1243](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1243)

***

### schemaDescription?

> `optional` **schemaDescription**: `string`

#### Defined in

[packages/core/src/generation.ts:1244](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1244)

***

### stop?

> `optional` **stop**: `string`[]

#### Defined in

[packages/core/src/generation.ts:1245](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1245)

***

### mode?

> `optional` **mode**: `"auto"` \| `"json"` \| `"tool"`

#### Defined in

[packages/core/src/generation.ts:1246](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1246)

***

### experimental\_providerMetadata?

> `optional` **experimental\_providerMetadata**: `Record`\<`string`, `unknown`\>

#### Defined in

[packages/core/src/generation.ts:1247](https://github.com/HeySquib/eliza/blob/main/packages/core/src/generation.ts#L1247)
