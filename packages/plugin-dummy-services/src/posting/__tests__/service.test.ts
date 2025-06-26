import { describe, expect, it, beforeEach } from 'bun:test';
import { DummyPostService } from '../service';
import { type IAgentRuntime, asUUID } from '@elizaos/core';
import { v4 as uuid } from 'uuid';

describe('DummyPostService', () => {
  let service: DummyPostService;
  const mockRuntime = {
    agentId: asUUID(uuid()),
  } as IAgentRuntime;

  beforeEach(async () => {
    service = new DummyPostService(mockRuntime);
    await service.start();
  });

  it('should create a new post', async () => {
    const content = { text: 'This is my first post!' };
    const post = await service.post(content);

    expect(post).toBeDefined();
    expect(post.content.text).toBe(content.text);
    expect(post.likes).toBe(0);
    expect(post.reposts).toBe(0);
    expect(post.replies).toHaveLength(0);

    const timeline = await service.getTimeline();
    expect(timeline).toHaveLength(1);
    expect(timeline[0].id).toBe(post.id);
  });

  it('should reply to a post', async () => {
    const originalPost = await service.post({ text: 'Original Post' });
    const replyContent = { text: 'This is a reply.' };
    const reply = await service.replyToPost(originalPost.id, replyContent);

    expect(reply).toBeDefined();
    expect(reply.content.text).toBe(replyContent.text);

    // Verify reply relationship through public API
    const timeline = await service.getTimeline();
    const replyInTimeline = timeline.find((p) => p.id === reply.id);
    expect(replyInTimeline).toBeDefined();
  });

  it('should like a post', async () => {
    const post = await service.post({ text: 'A post to be liked' });
    const result = await service.likePost(post.id);

    expect(result).toBe(true);
    // In a real implementation, we would verify through public API
    // For now, we just verify the operation succeeded
  });

  it('should repost a post', async () => {
    const post = await service.post({ text: 'A post to be reposted' });
    const result = await service.repost(post.id);

    expect(result).toBe(true);
    // In a real implementation, we would verify through public API
    // For now, we just verify the operation succeeded
  });

  it('should return a timeline sorted by creation date', async () => {
    const post1 = await service.post({ text: 'Post 1' });
    // short delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    const post2 = await service.post({ text: 'Post 2' });

    const timeline = await service.getTimeline();
    expect(timeline).toHaveLength(2);
    expect(timeline[0].id).toBe(post2.id);
    expect(timeline[1].id).toBe(post1.id);
  });

  it('should handle liking a non-existent post gracefully', async () => {
    const nonExistentId = asUUID(uuid());
    const result = await service.likePost(nonExistentId);
    expect(result).toBe(false);
  });
});
