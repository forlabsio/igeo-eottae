# BuildBoard — Connect + Target Regions 구현 플랜

## 결정 사항
- 사업 문의 수락 시: 양방향 이메일 공개
- 알림 방식: 인앱 알림함 (이메일 전송 없음)
- 문의 양식: 제목 + 메시지
- 타겟 지역: 9개 (다중 선택)
- 지역 배지: 국기 이모지

---

## Feature 1: Business Connect

### Backend

**Entity: `inquiries`**
```
id, senderId, receiverId, serviceId
title, message
status: 'pending' | 'accepted' | 'rejected'
createdAt, updatedAt
```

**API**
- POST   /inquiries              — 문의 전송
- GET    /inquiries/received     — 받은 문의
- GET    /inquiries/sent         — 보낸 문의
- PATCH  /inquiries/:id/accept   — 수락 → 양방향 이메일 노출
- PATCH  /inquiries/:id/reject   — 거절
- GET    /admin/inquiries        — 관리자 목록
- DELETE /admin/inquiries/:id    — 관리자 삭제

### Frontend

**서비스 카드 / 서비스 상세**
- `[Connect 요청]` 버튼 (비회원 클릭 시 회원가입 유도)

**`/connect` 페이지** (Navbar에 아이콘 추가)
- 탭: 받은 문의 / 보낸 문의
- 상태 배지: 대기중 🟡 / 수락됨 🟢 / 거절됨 🔴
- 수락된 항목: 상대방 이메일 표시

**Admin `/admin/inquiries`**
- 전체 문의 목록 + 상태 + 삭제

---

## Feature 2: Target Regions

### 9개 지역
| slug | 표시 |
|------|------|
| kr | 🇰🇷 한국 |
| east-asia | 🌏 동아시아 |
| southeast-asia | 🌴 동남아시아 |
| europe | 🌍 유럽 |
| north-america | 🌎 북미 |
| south-america | 🌎 남미 |
| middle-east | 🌙 중동 |
| africa | 🌍 아프리카 |
| global | 🌐 글로벌 |

### Backend
- Service entity에 `targetRegions: text[]` 컬럼 추가 (nullable)
- CreateServiceDto / QueryServiceDto 수정

### Frontend
- 서비스 등록 폼: 지역 다중 선택 UI (토글 버튼)
- ServiceCard: 지역 배지 표시 (최대 2개 + 나머지 +N)
- 서비스 탐색: 지역 필터 추가

---

## 구현 순서
1. Backend: Inquiry entity + module + controller
2. Backend: Service entity targetRegions 컬럼 추가
3. Frontend: /connect 페이지
4. Frontend: ServiceCard Connect 버튼
5. Frontend: 서비스 등록 지역 선택
6. Frontend: ServiceCard 지역 배지
7. Admin: /admin/inquiries 페이지
8. Navbar Connect 아이콘 추가
