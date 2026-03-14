# PR Analyzer

GitHub PR을 자동으로 분석해주는 웹 서비스예요.

![PR Analyzer](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

## 기능

- **GitHub OAuth 로그인** — 본인 레포지토리 바로 접근
- **레포지토리 목록** — Public/Private 레포 목록 조회 및 클릭으로 바로 입력
- **PR 기본 정보** — 제목, 작성자, 브랜치, 변경 줄 수
- **PR 요약** — 추가/수정/삭제 파일 목록 자동 정리
- **리뷰 포인트 자동 추출** — 테스트 없음, 대용량 변경, 바이너리 파일 등 감지
- **diff 코드 뷰어** — 줄 번호, 추가/삭제 하이라이트, hunk 단위 접기/펼치기

## 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | FastAPI, PyGithub |
| Frontend | Next.js, TypeScript, Tailwind CSS |
| 인증 | NextAuth.js (GitHub OAuth) |
| API | GitHub REST API |

## 실행 방법

### 사전 준비
- GitHub OAuth App 생성 (Client ID, Client Secret)
- GitHub Personal Access Token 생성 (`repo` 권한)

### 백엔드
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn PyGithub python-dotenv
cp .env.example .env  # GITHUB_TOKEN 입력
uvicorn main:app --reload
```

### 프론트엔드
```bash
cd frontend
npm install
cp .env.local.example .env.local  # GitHub OAuth 정보 입력
npm run dev
```

## 환경변수

### backend/.env
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### frontend/.env.local
```
GITHUB_ID=your_client_id
GITHUB_SECRET=your_client_secret
NEXTAUTH_SECRET=random_string
NEXTAUTH_URL=http://localhost:3000
```