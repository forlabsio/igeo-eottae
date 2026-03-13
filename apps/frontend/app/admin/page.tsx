import AdminSidebar from '@/components/AdminSidebar';

export default function AdminPage() {
  return (
    <div className="flex">
      <AdminSidebar />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">대시보드</h1>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: '총 회원수', value: '-' },
            { label: '등록 서비스', value: '-' },
            { label: '총 좋아요', value: '-' },
            { label: '차단 회원', value: '-' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-border rounded-lg p-6">
              <p className="text-xs text-text-secondary">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-text-secondary">관리자 전용 페이지입니다. 사이드바에서 메뉴를 선택하세요.</p>
      </div>
    </div>
  );
}
