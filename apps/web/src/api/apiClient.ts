import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// 统一的API响应结构
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  statusCode?: number;
}

// 创建Axios实例，并导出
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api', // 使用环境变量，如果没有则默认/api
  timeout: 10000, // 请求超时设置 (10秒)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken'); // 假设Token存储在localStorage中，键为'accessToken'
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    // 对请求错误做些事
    return Promise.reject(error);
  }
);

// 响应拦截器：统一处理错误和响应格式
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    // 成功响应，直接返回其data（如果后端总是包裹在ApiResponse中）
    // 如果后端直接返回原始数据，这里需要根据实际情况调整
    // 假设后端总是返回 ApiResponse 结构
    return response.data; 
  },
  (error: AxiosError<ApiResponse<any>>) => {
    let errorMessage = 'An unexpected error occurred.';
    let statusCode = 500;

    if (error.response) {
      // 服务器返回了错误状态码 (e.g., 400, 401, 403, 404, 500)
      statusCode = error.response.status;
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else {
        // 尝试从后端返回的通用错误结构中提取message
        errorMessage = error.response.data?.message || `Error ${statusCode}`;
      }
    } else if (error.request) {
      // 请求已发送但未收到响应，可能是网络问题
      errorMessage = 'Network Error: No response received from server.';
      statusCode = 504; // Gateway Timeout
    } else {
      // 设置响应时出错
      errorMessage = error.message;
    }
    
    // 在这里可以统一处理一些特定错误，例如 token 过期
    if (statusCode === 401) {
        // 可以触发登出逻辑，或重定向到登录页
        console.warn('Authentication failed. Token might be expired or invalid.');
        // Example: window.location.href = '/login'; 
    }

    // 抛出一个带有更详细信息的错误，以便上层组件可以捕获和处理
    // 如果后端总是返回 ApiResponse 结构，error.response.data 应该已经是 ApiResponse<any>
    // 否则，需要根据实际错误结构创建 ApiResponse 格式的错误抛出
    const formattedError: ApiResponse<any> = {
        success: false,
        message: errorMessage,
        statusCode: statusCode,
        data: error.response?.data?.data // 尝试获取后端返回的data（如果存在）
    };
    
    // 抛出格式化后的错误，方便上层调用者捕获
    return Promise.reject(formattedError); 
  }
);

export default apiClient;
