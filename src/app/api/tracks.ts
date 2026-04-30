import { apiClient } from './client';
import type { TrackDetail, TrackSummary } from './types';

export const tracksApi = {
  list: () => apiClient.get<TrackSummary[]>('/api/tracks'),
  detail: (trackId: number) => apiClient.get<TrackDetail>(`/api/tracks/${trackId}`),
};
