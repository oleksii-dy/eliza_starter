import { NearBindgen, call, view, near, initialize } from 'near-sdk-js';

@NearBindgen({})
class MessagingContract {
  constructor() {
    this.owner = '';
    this.rooms = {};
    this.roomMessages = {};
    this.userRooms = {};
    this.userInbox = {};
    this.nextRoomId = 0;
    this.nextMessageId = 0;
    this.totalMessages = 0;
    this.blockedUsers = {};
  }

  @initialize({})
  init({ owner }) {
    this.owner = owner;
    near.log(`Messaging contract initialized with owner: ${owner}`);
  }

  @view({})
  get_owner() {
    return this.owner;
  }

  @call({})
  create_room({ name, description, participants, is_public = false, encrypted = false }) {
    const creator = near.predecessorAccountId();
    const roomId = `room-${this.nextRoomId++}`;
    
    // Ensure creator is in participants
    if (!participants.includes(creator)) {
      participants.push(creator);
    }

    const room = {
      id: roomId,
      name,
      description,
      participants,
      admins: [creator],
      created_by: creator,
      created_at: near.blockTimestamp(),
      is_public,
      encrypted,
      message_count: 0
    };

    this.rooms[roomId] = room;
    this.roomMessages[roomId] = [];

    // Add room to each participant's room list
    for (const participant of participants) {
      if (!this.userRooms[participant]) {
        this.userRooms[participant] = [];
      }
      this.userRooms[participant].push(roomId);
    }

    near.log(`Room ${roomId} created by ${creator}`);
    return roomId;
  }

  @call({})
  send_message({ room_id, content, content_type = 'text', metadata = null, in_reply_to = null }) {
    const sender = near.predecessorAccountId();
    const room = this.rooms[room_id];
    
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if sender is participant
    if (!room.participants.includes(sender)) {
      throw new Error('Sender is not a participant in this room');
    }

    const messageId = `msg-${this.nextMessageId++}`;
    const message = {
      id: messageId,
      room_id,
      sender,
      content,
      content_type,
      metadata,
      in_reply_to,
      timestamp: near.blockTimestamp(),
      edited: false,
      deleted: false
    };

    if (!this.roomMessages[room_id]) {
      this.roomMessages[room_id] = [];
    }
    this.roomMessages[room_id].push(message);
    
    room.message_count++;
    this.rooms[room_id] = room;
    this.totalMessages++;

    near.log(`Message ${messageId} sent to room ${room_id} by ${sender}`);
    return messageId;
  }

  @call({})
  send_direct_message({ recipient, content, content_type = 'text', metadata = null }) {
    const sender = near.predecessorAccountId();
    
    // Check if recipient has blocked sender
    if (this.blockedUsers[recipient] && this.blockedUsers[recipient].includes(sender)) {
      throw new Error('Recipient has blocked sender');
    }

    const messageId = `dm-${this.nextMessageId++}`;
    const message = {
      id: messageId,
      sender,
      recipient,
      content,
      content_type,
      metadata,
      timestamp: near.blockTimestamp(),
      edited: false,
      deleted: false,
      read: false
    };

    if (!this.userInbox[recipient]) {
      this.userInbox[recipient] = [];
    }
    this.userInbox[recipient].push(message);
    this.totalMessages++;

    near.log(`Direct message ${messageId} sent from ${sender} to ${recipient}`);
    return messageId;
  }

  @view({})
  get_room_messages({ room_id, from_index = 0, limit = 50 }) {
    const messages = this.roomMessages[room_id] || [];
    const start = parseInt(from_index);
    const end = Math.min(start + parseInt(limit), messages.length);
    
    return messages.slice(start, end).filter(msg => !msg.deleted);
  }

  @view({})
  get_inbox({ from_index = 0, limit = 50 }) {
    const caller = near.currentAccountId();
    const messages = this.userInbox[caller] || [];
    const start = parseInt(from_index);
    const end = Math.min(start + parseInt(limit), messages.length);
    
    return messages.slice(start, end).filter(msg => !msg.deleted);
  }

  @call({})
  edit_message({ room_id, message_id, new_content }) {
    const sender = near.predecessorAccountId();
    const messages = this.roomMessages[room_id] || [];
    
    const messageIndex = messages.findIndex(msg => msg.id === message_id);
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    const message = messages[messageIndex];
    if (message.sender !== sender) {
      throw new Error('Only sender can edit message');
    }

    if (message.deleted) {
      throw new Error('Cannot edit deleted message');
    }

    message.content = new_content;
    message.edited = true;
    messages[messageIndex] = message;
    this.roomMessages[room_id] = messages;

    near.log(`Message ${message_id} edited in room ${room_id}`);
  }

  @call({})
  delete_message({ room_id, message_id }) {
    const sender = near.predecessorAccountId();
    const messages = this.roomMessages[room_id] || [];
    
    const messageIndex = messages.findIndex(msg => msg.id === message_id);
    if (messageIndex === -1) {
      throw new Error('Message not found');
    }

    const message = messages[messageIndex];
    const room = this.rooms[room_id];
    
    // Only sender or room admin can delete
    if (message.sender !== sender && !room.admins.includes(sender)) {
      throw new Error('Not authorized to delete message');
    }

    message.deleted = true;
    messages[messageIndex] = message;
    this.roomMessages[room_id] = messages;

    near.log(`Message ${message_id} deleted in room ${room_id}`);
  }

  @call({})
  join_room({ room_id }) {
    const user = near.predecessorAccountId();
    const room = this.rooms[room_id];
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.is_public) {
      throw new Error('Cannot join private room without invitation');
    }

    if (!room.participants.includes(user)) {
      room.participants.push(user);
      this.rooms[room_id] = room;
      
      if (!this.userRooms[user]) {
        this.userRooms[user] = [];
      }
      this.userRooms[user].push(room_id);
    }

    near.log(`${user} joined room ${room_id}`);
  }

  @call({})
  leave_room({ room_id }) {
    const user = near.predecessorAccountId();
    const room = this.rooms[room_id];
    
    if (!room) {
      throw new Error('Room not found');
    }

    const index = room.participants.indexOf(user);
    if (index !== -1) {
      room.participants.splice(index, 1);
      this.rooms[room_id] = room;
      
      const userRoomIndex = this.userRooms[user].indexOf(room_id);
      if (userRoomIndex !== -1) {
        this.userRooms[user].splice(userRoomIndex, 1);
      }
    }

    near.log(`${user} left room ${room_id}`);
  }

  @call({})
  block_user({ user_to_block }) {
    const blocker = near.predecessorAccountId();
    
    if (!this.blockedUsers[blocker]) {
      this.blockedUsers[blocker] = [];
    }
    
    if (!this.blockedUsers[blocker].includes(user_to_block)) {
      this.blockedUsers[blocker].push(user_to_block);
    }

    near.log(`${blocker} blocked ${user_to_block}`);
  }

  @call({})
  unblock_user({ user_to_unblock }) {
    const unblocker = near.predecessorAccountId();
    
    if (this.blockedUsers[unblocker]) {
      const index = this.blockedUsers[unblocker].indexOf(user_to_unblock);
      if (index !== -1) {
        this.blockedUsers[unblocker].splice(index, 1);
      }
    }

    near.log(`${unblocker} unblocked ${user_to_unblock}`);
  }

  @view({})
  get_user_rooms({ account_id }) {
    const roomIds = this.userRooms[account_id] || [];
    return roomIds.map(id => this.rooms[id]).filter(room => room !== null);
  }

  @view({})
  search_messages({ room_id, query, from_index = 0, limit = 50 }) {
    const messages = this.roomMessages[room_id] || [];
    const queryLower = query.toLowerCase();
    
    const filtered = messages.filter(msg => 
      !msg.deleted && msg.content.toLowerCase().includes(queryLower)
    );
    
    const start = parseInt(from_index);
    const end = Math.min(start + parseInt(limit), filtered.length);
    
    return filtered.slice(start, end);
  }

  @view({})
  get_room({ room_id }) {
    return this.rooms[room_id] || null;
  }

  @call({})
  update_room({ room_id, name = null, description = null, is_public = null }) {
    const caller = near.predecessorAccountId();
    const room = this.rooms[room_id];
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.admins.includes(caller)) {
      throw new Error('Only admins can update room');
    }

    if (name !== null) room.name = name;
    if (description !== null) room.description = description;
    if (is_public !== null) room.is_public = is_public;
    
    this.rooms[room_id] = room;
    near.log(`Room ${room_id} updated by ${caller}`);
  }

  @call({})
  add_admin({ room_id, new_admin }) {
    const caller = near.predecessorAccountId();
    const room = this.rooms[room_id];
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (!room.admins.includes(caller)) {
      throw new Error('Only admins can add new admins');
    }

    if (!room.admins.includes(new_admin)) {
      room.admins.push(new_admin);
      this.rooms[room_id] = room;
    }

    near.log(`${new_admin} added as admin to room ${room_id}`);
  }

  @view({})
  get_stats() {
    return {
      total_messages: this.totalMessages,
      total_rooms: Object.keys(this.rooms).length,
      total_users: Object.keys(this.userRooms).length
    };
  }
} 