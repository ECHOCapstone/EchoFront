// 운영자가 한 화면에서 인스턴스 상태(모델 서버, LLM, DB, 영구 저장본)를 진단하는 섹션.
// 호출은 단일 엔드포인트 (GET /api/admin/system/status) 이며, 한 부분이 죽어도 다른 부분은 보여준다.

import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { adminApi, type SystemStatus } from '../../api';
import { useApiResource } from '../../hooks/useApiResource';

export default function SystemStatusSection() {
  const { data, loading, error, reload } = useApiResource(
    () => adminApi.getSystemStatus(),
    [],
    { errorFallback: '시스템 상태를 불러오지 못했습니다.' }
  );

  const handleRefresh = () => {
    if (loading) return;
    reload();
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">시스템 상태</h2>
          <p className="text-sm text-gray-500">모델 서버 / LLM / 데이터베이스 / 영구 저장본을 한눈에 점검합니다.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 h-9 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex-shrink-0 whitespace-nowrap"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>새로고침</span>
        </button>
      </div>

      {loading && <p className="text-gray-500">불러오는 중...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {data && <StatusBody status={data} />}
    </section>
  );
}

function StatusBody({ status }: { status: SystemStatus }) {
  return (
    <div className="space-y-4">
      <Row title="모델 서버">
        <StatusBadge ok={status.modelServer.reachable} />
        {status.modelServer.activeModel && (
          <span className="text-xs text-gray-500">활성 모델: {status.modelServer.activeModel}</span>
        )}
      </Row>

      <Row title="LLM (Gemini)">
        <StatusBadge ok={status.llm.geminiAvailable} />
        <span className="text-xs text-gray-500">
          {status.llm.geminiAvailable ? 'API 키 설정 OK' : 'API 키 미설정 — gemini provider 선택 불가'}
        </span>
      </Row>

      <Row title="데이터베이스 (Flyway)">
        <StatusBadge ok={status.database.latestMigration != null} />
        <span className="text-xs text-gray-500">
          {status.database.latestMigration
            ? `버전 ${status.database.latestMigration} · ${status.database.totalMigrations}건 적용 · ${formatTime(status.database.appliedAt)}`
            : '적용된 마이그레이션 없음'}
        </span>
      </Row>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">시드 영구 저장본</h3>
        <div className="space-y-1.5">
          {status.seedFiles.map((entry) => (
            <SeedRow key={entry.domain} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm font-medium text-gray-700">{title}</span>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
        <CheckCircle2 size={14} /> 정상
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
      <XCircle size={14} /> 점검 필요
    </span>
  );
}

function SeedRow({ entry }: { entry: SystemStatus['seedFiles'][number] }) {
  const { domain, supportsExplicitPersist, status } = entry;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 font-mono text-gray-600">{domain}</span>
      {status.exists ? (
        <span className="text-emerald-700">영구 저장본 있음 · {formatTime(status.lastModified)}</span>
      ) : (
        <span className="text-gray-500">
          공장 기본값 사용 중{supportsExplicitPersist ? ' · 영구 저장 가능' : ''}
        </span>
      )}
      <span className="text-gray-400 font-mono">{status.path}</span>
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
}
