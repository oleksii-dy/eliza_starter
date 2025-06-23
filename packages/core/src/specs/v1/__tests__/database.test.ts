import { describe, it, expect, mock } from 'bun:test';
import { DatabaseAdapter as V1DatabaseAdapter } from '../database';
import { DatabaseAdapter as V2DatabaseAdapter } from '../../v2/database';

class MockAdapter extends V1DatabaseAdapter {
  getConnection = mock(async () => 'conn');
  getEntityByIds = mock(async () => []);
  createEntities = mock(async () => true);
  updateMemory = mock(async () => true);
  getRoomsByIds = mock(async () => null);
  getRoomsByWorld = mock(async () => []);
  createRooms = mock(async () => []);
  addParticipantsRoom = mock(async () => true);
  getMemoriesByWorldId = mock(async () => []);
  deleteRoomsByWorldId = mock(async () => {});
  init = mock(async () => {});
  close = mock(async () => {});
  getEntitiesForRoom = mock(async () => []);
  updateEntity = mock(async () => {});
  getComponent = mock(async () => null);
  getComponents = mock(async () => []);
  createComponent = mock(async () => true);
  updateComponent = mock(async () => {});
  deleteComponent = mock(async () => {});
  getLogs = mock(async () => []);
  deleteLog = mock(async () => {});
  getWorld = mock(async () => null);
  getAllWorlds = mock(async () => []);
  createWorld = mock(async () => 'w' as any);
  updateWorld = mock(async () => {});
  removeWorld = mock(async () => {});
  getRooms = mock(async () => []);
  updateRoom = mock(async () => {});
  deleteRoom = mock(async () => {});
  getParticipantsForEntity = mock(async () => []);
  updateRelationship = mock(async () => {});
  getConnectionString?(): string { return ''; }
  getRelationship = mock(async () => null);
  createRelationship = mock(async () => true);
  getRelationships = mock(async () => []);
  getAgent = mock(async () => null);
  getAgents = mock(async () => []);
  createAgent = mock(async () => true);
  updateAgent = mock(async () => true);
  deleteAgent = mock(async () => true);
  ensureEmbeddingDimension = mock(async () => {});
  getMemories = mock(async () => []);
  getMemoriesByIds = mock(async () => []);
  getCachedEmbeddings = mock(async () => []);
  log = mock(async () => {});
  searchMemories = mock(async () => []);
  searchMemoriesByEmbedding = mock(async () => []);
  createMemory = mock(async () => undefined as any);
  deleteMemory = mock(async () => {});
  deleteManyMemories = mock(async () => {});
  deleteAllMemories = mock(async () => {});
  countMemories = mock(async () => 0);
  createTask = mock(async () => 't' as any);
  getTasks = mock(async () => []);
  getTask = mock(async () => null);
  getTasksByName = mock(async () => []);
  updateTask = mock(async () => {});
  deleteTask = mock(async () => {});
  getMemoriesByRoomIds = mock(async () => []);
  setParticipantUserState = mock(async () => {});
  getParticipantUserState = mock(async () => null);
  removeParticipant = mock(async () => true);
  getParticipantsForRoom = mock(async () => []);
  getRoomsForParticipant = mock(async () => []);
  getRoomsForParticipants = mock(async () => []);
}

describe('database adapter', () => {
  it('extends v2 adapter', async () => {
    const adapter = new MockAdapter({} as any);
    await adapter.init();
    expect(adapter.init).toHaveBeenCalled();
  });
});
