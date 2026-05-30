// 콘텐츠 탭의 진입점. 트랙 목록 ↔ 선택한 트랙의 스크립트 관리 화면을 전환한다.

import { useState } from 'react';
import type { TrackSummary } from '../../api';
import TrackManager from './TrackManager';
import ScriptManager from './ScriptManager';

export default function ContentSection() {
  const [selectedTrack, setSelectedTrack] = useState<TrackSummary | null>(null);

  if (selectedTrack) {
    return <ScriptManager track={selectedTrack} onBack={() => setSelectedTrack(null)} />;
  }
  return <TrackManager onManageScripts={setSelectedTrack} />;
}
