# PR Analyzer

GitHub PR을 자동으로 분석해주는 도구예요.

## 기능

- PR 기본 정보 (제목, 작성자, 브랜치)
- 변경 파일 목록 + 줄 수
- diff 코드 뷰어 (줄 번호, 추가/삭제 하이라이트)
- 리뷰 포인트 자동 추출 (테스트 없음, 대용량 변경 등)
- PR 요약 텍스트 자동 생성

## 기술 스택

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **API**: GitHub REST API

## 실행 방법

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
npm run dev
```

## 환경변수

`.env` 파일에 GitHub Personal Access Token 입력:
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```