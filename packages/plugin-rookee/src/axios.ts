import axios from 'axios';

// Tạo một instance axios
const axiosInstance = axios.create({
  timeout: 50000, // Thời gian chờ request (ms)
  headers: {
    'Content-Type': 'application/json',
  },
});

export const callApi = async ({ method, url, headers = {}, body = {}, params = {} }) => {
  try {
    const response = await axiosInstance.request({
      method,
      url,
      headers,
      data: body, // Dùng cho POST, PUT
      params, // Dùng cho query string (GET, etc.)
    });
    return response;
  } catch (error) {
    console.error( error.message);
    throw error;
  }
};
