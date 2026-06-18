import axios, { InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios'

const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || '请求失败'
    return Promise.reject(new Error(message))
  }
)

interface ApiClient {
  get<T = any>(url: string, config?: InternalAxiosRequestConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<T>
  put<T = any>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<T>
  delete<T = any>(url: string, config?: InternalAxiosRequestConfig): Promise<T>
  defaults: typeof axiosInstance.defaults
  interceptors: typeof axiosInstance.interceptors
}

const api = axiosInstance as unknown as ApiClient

export default api
