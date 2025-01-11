import axios from 'axios';

// Tạo một instance axios
const axiosInstance = axios.create({
  timeout: 50000, // Thời gian chờ request (ms)
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Hàm linh hoạt gọi API bằng axios
 * @param {string} method - Phương thức HTTP (GET, POST, PUT, DELETE, etc.)
 * @param {string} url - URL của endpoint
 * @param {object} [headers] - Header tuỳ chỉnh
 * @param {object} [body] - Dữ liệu body (chỉ dùng với POST, PUT, etc.)
 * @param {object} [params] - Tham số query string
 * @returns {Promise<object>} - Dữ liệu trả về từ API
 */
export const callApi = async ({ method, url, headers = {}, body = {}, params = {} }) => {
  try {
    const response = await axiosInstance.request({
      method,
      url,
      headers,
      data: body, // Dùng cho POST, PUT
      params, // Dùng cho query string (GET, etc.)
    });
    return response.data;
  } catch (error) {
    console.error(`Error in ${method.toUpperCase()} ${url}:`, error.response?.data || error.message);
    throw error;
  }
};
