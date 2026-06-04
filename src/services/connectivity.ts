import { apiRoutes, request } from '@/services/http';

type HealthPingResponse = {
  message?: string;
  status?: string;
  timestamp?: string;
};

export const connectivityService = {
  async ping() {
    const response = await request<HealthPingResponse>(apiRoutes.healthPing);
    return response.message?.toLowerCase() === 'pong';
  },
};
