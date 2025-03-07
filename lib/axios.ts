// lib/axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
  withCredentials: true, // Çerezlerin isteklerle birlikte gönderilmesini sağlar
});

export default axiosInstance;
