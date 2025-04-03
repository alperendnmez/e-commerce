// lib/axios.ts
import axios from 'axios';

const axiosInstance = axios.create({
  withCredentials: true, // Çerezlerin isteklerle birlikte gönderilmesini sağlar
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF koruması için önemli
  }
});

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('Axios request:', {
      url: config.url,
      method: config.method,
      withCredentials: config.withCredentials,
      headers: config.headers
    });
    
    // POST, PUT, DELETE gibi değişiklik operasyonlarını debug et
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      console.log('Axios request data:', config.data);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('Axios response status:', response.status);
    
    // Sadece başarılı API yanıtlarının detaylarını logla
    if (response.status >= 200 && response.status < 300) {
      console.log('Axios response data:', response.data);
    }
    
    return response;
  },
  (error) => {
    console.error('Axios error:', error.message);
    
    // Response hatası detaylarını görelim
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
