// Configuración de la API
const API_CONFIG = {
  BASE_URL: 'http://va-server.duckdns.org:3000',
  ENDPOINTS: {
    TICKETS: '/api/ticket',
    FERIAS: '/api/feria',
  }
};

export const getApiUrl = (endpoint: string) => `${API_CONFIG.BASE_URL}${endpoint}`;

export default API_CONFIG; 