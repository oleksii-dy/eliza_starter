'use strict';
const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
  return new (P || (P = Promise))((resolve, reject) => {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
const __generator = (this && this.__generator) || function (thisArg, body) {
  let _ = { label: 0, sent() { if (t[0] & 1) {throw t[1];} return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
  return g.next = verb(0), g['throw'] = verb(1), g['return'] = verb(2), typeof Symbol === 'function' && (g[Symbol.iterator] = function () { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
    if (f) {throw new TypeError('Generator is already executing.');}
    while (g && (g = 0, op[0] && (_ = 0)), _) {try {
      if (f = 1, y && (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) {return t;}
      if (y = 0, t) {op = [op[0] & 2, t.value];}
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
          if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
          if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
          if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
          if (t[2]) {_.ops.pop();}
          _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }}
    if (op[0] & 5) {throw op[1];} return { value: op[0] ? op[1] : void 0, done: true };
  }
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.updateRoleAction = void 0;
const core_1 = require('@elizaos/core');
// Helper function to check if a role can modify another role
const canModifyRole = function (currentRole, targetRole, newRole) {
  // Owners can do anything
  if (currentRole === core_1.Role.OWNER) {
    return true;
  }
  // Admins can modify members and add new members/admins
  if (currentRole === core_1.Role.ADMIN) {
    if (!targetRole) {
      return newRole !== core_1.Role.OWNER;
    }
    // Admin can only modify if target is not an owner
    return targetRole !== core_1.Role.OWNER;
  }
  // Members can't modify roles
  return false;
};
const updateRoleTemplate = '\nYou are managing role assignments. Extract the user identification and new role from the request.\n\nCurrent request: {{userMessage}}\n\nExtract:\n1. The target user (by name, username, or ID)  \n2. The new role to assign (owner, admin, or member)\n\nReturn an XML object with these fields:\n<response>\n  <targetUser>username or name</targetUser>\n  <targetUserId>user ID if provided</targetUserId>\n  <newRole>owner, admin, or member</newRole>\n</response>\n\n## Example Output Format\n<response>\n  <targetUser>john_doe</targetUser>\n  <targetUserId>uuid-123-456</targetUserId>\n  <newRole>admin</newRole>\n</response>\n';
exports.updateRoleAction = {
  name: 'UPDATE_ROLE',
  description: "Update a user's role in the world with proper permission validation. Supports action chaining by providing role change data for audit trails, notification workflows, or access control updates.",
  validate(runtime, message, state) { return __awaiter(void 0, void 0, void 0, function () {
    let world, senderRole;
    let _a;
    return __generator(this, (_b) => {
      world = state === null || state === void 0 ? void 0 : state.world;
      if (!world) {
        return [2 /*return*/, false];
      }
      senderRole = (_a = world.roles) === null || _a === void 0 ? void 0 : _a[message.entityId];
      return [2 /*return*/, senderRole === core_1.Role.OWNER || senderRole === core_1.Role.ADMIN];
    });
  }); },
  handler(runtime, message, state, options, callback) { return __awaiter(void 0, void 0, void 0, function () {
    let world, senderRole, prompt_1, response, roleData, newRole, targetUserId, currentTargetRole, error_1, errorMessage;
    let _a, _b;
    return __generator(this, (_c) => {
      switch (_c.label) {
        case 0:
          _c.trys.push([0, 2, , 3]);
          world = state === null || state === void 0 ? void 0 : state.world;
          if (!world) {
            callback === null || callback === void 0 ? void 0 : callback({
              text: 'World context not available',
              error: true,
            });
            return [2 /*return*/, {
              text: 'World context not available',
              values: { success: false, error: 'no_world_context' },
              data: { action: 'UPDATE_ROLE' },
            }];
          }
          senderRole = (_a = world.roles) === null || _a === void 0 ? void 0 : _a[message.entityId];
          if (!senderRole || (senderRole !== core_1.Role.OWNER && senderRole !== core_1.Role.ADMIN)) {
            callback === null || callback === void 0 ? void 0 : callback({
              text: "You don't have permission to update roles",
              error: true,
            });
            return [2 /*return*/, {
              text: "You don't have permission to update roles",
              values: { success: false, error: 'insufficient_permissions' },
              data: { action: 'UPDATE_ROLE' },
            }];
          }
          prompt_1 = updateRoleTemplate.replace('{{userMessage}}', message.content.text || '');
          return [4 /*yield*/, runtime.useModel('TEXT_SMALL', {
            prompt: prompt_1,
            stopSequences: [],
          })];
        case 1:
          response = _c.sent();
          roleData = (0, core_1.parseKeyValueXml)(response);
          if (!roleData || !roleData.newRole) {
            callback === null || callback === void 0 ? void 0 : callback({
              text: 'Could not parse role update request',
              error: true,
            });
            return [2 /*return*/, {
              text: 'Could not parse role update request',
              values: { success: false, error: 'parse_error' },
              data: { action: 'UPDATE_ROLE' },
            }];
          }
          newRole = roleData.newRole.toUpperCase();
          if (!core_1.Role[newRole]) {
            callback === null || callback === void 0 ? void 0 : callback({
              text: 'Invalid role: '.concat(roleData.newRole, '. Must be owner, admin, or member'),
              error: true,
            });
            return [2 /*return*/, {
              text: 'Invalid role: '.concat(roleData.newRole, '. Must be owner, admin, or member'),
              values: { success: false, error: 'invalid_role' },
              data: { action: 'UPDATE_ROLE' },
            }];
          }
          targetUserId = roleData.targetUserId;
          if (!targetUserId && roleData.targetUser) {
            // TODO: Resolve user name to ID using entity resolution
            callback === null || callback === void 0 ? void 0 : callback({
              text: 'User name resolution not yet implemented. Please provide user ID',
              error: true,
            });
            return [2 /*return*/, {
              text: 'User name resolution not yet implemented. Please provide user ID',
              values: { success: false, error: 'name_resolution_unavailable' },
              data: { action: 'UPDATE_ROLE' },
            }];
          }
          if (!targetUserId) {
            callback === null || callback === void 0 ? void 0 : callback({
              text: 'No target user specified',
              error: true,
            });
            return [2 /*return*/, {
              text: 'No target user specified',
              values: { success: false, error: 'no_target_user' },
              data: { action: 'UPDATE_ROLE' },
            }];
          }
          currentTargetRole = ((_b = world.roles) === null || _b === void 0 ? void 0 : _b[targetUserId]) || null;
          // Validate permission to make this change
          if (!canModifyRole(senderRole, currentTargetRole, core_1.Role[newRole])) {
            callback === null || callback === void 0 ? void 0 : callback({
              text: "You don't have permission to make this role change",
              error: true,
            });
            return [2 /*return*/, {
              text: "You don't have permission to make this role change",
              values: { success: false, error: 'role_change_forbidden' },
              data: { action: 'UPDATE_ROLE' },
            }];
          }
          // Update the role in the world
          if (!world.roles) {
            world.roles = {};
          }
          world.roles[targetUserId] = core_1.Role[newRole];
          // Persist the change
          // TODO: Call world persistence service
          core_1.logger.info('Role updated: '.concat(targetUserId, ' is now ').concat(newRole));
          callback === null || callback === void 0 ? void 0 : callback({
            text: 'Role updated: '.concat(targetUserId, ' is now ').concat(newRole.toLowerCase()),
          });
          return [2 /*return*/, {
            text: 'Role updated: '.concat(targetUserId, ' is now ').concat(newRole.toLowerCase()),
            values: {
              success: true,
              targetUserId,
              oldRole: currentTargetRole,
              newRole: core_1.Role[newRole],
              updatedBy: message.entityId,
            },
            data: {
              action: 'UPDATE_ROLE',
              roleChangeData: {
                targetUserId,
                oldRole: currentTargetRole,
                newRole: core_1.Role[newRole],
                updatedBy: message.entityId,
                timestamp: new Date().toISOString(),
              },
            },
          }];
        case 2:
          error_1 = _c.sent();
          core_1.logger.error('Error updating role:', error_1);
          errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
          callback === null || callback === void 0 ? void 0 : callback({
            text: errorMessage,
            error: true,
          });
          return [2 /*return*/, {
            text: errorMessage,
            values: {
              success: false,
              error: errorMessage,
            },
            data: {
              action: 'UPDATE_ROLE',
              errorType: 'role_update_error',
              errorDetails: error_1 instanceof Error ? error_1.stack : undefined,
            },
          }];
        case 3: return [2];
      }
    });
  }); },
  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Make Bob an admin',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Bob has been promoted to admin role',
          actions: ['UPDATE_ROLE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Promote Alice to admin and then notify all members about the change',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll promote Alice to admin and then notify all members about the role change.",
          thought: "User wants me to update Alice's role and then broadcast the change - I should handle the role update first, then notify members.",
          actions: ['UPDATE_ROLE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Alice has been promoted to admin! Now notifying all members about this change...',
          thought: "Role update completed successfully. I can now send notifications to all members about Alice's promotion.",
          actions: ['NOTIFY_MEMBERS'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Demote user-123 to member and log this action for audit purposes',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll update user-123's role to member and create an audit log entry.",
          thought: 'User wants role demotion followed by audit logging - I should process the role change first, then create the audit record.',
          actions: ['UPDATE_ROLE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'user-123 role has been updated to member. Now creating audit log entry...',
          thought: 'Role change completed. I can now log this action with the role change details for audit purposes.',
          actions: ['CREATE_AUDIT_LOG'],
        },
      },
    ],
  ],
};
