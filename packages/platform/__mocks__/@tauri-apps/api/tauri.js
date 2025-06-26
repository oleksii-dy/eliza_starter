export const invoke = jest.fn().mockRejectedValue(new Error('Tauri not available in test environment'));

export default {
  invoke
};