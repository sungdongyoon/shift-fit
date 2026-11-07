## 스타일 작성 규칙

- 레이아웃, 간격, 글꼴, 색상, 반응형 동작, 상호작용 상태는 JSX 안에서 Tailwind CSS 유틸리티로 작성하는 것을 우선합니다.
- `bg-canvas`, `text-content`, `border-line` 등 DDS의 의미 기반 토큰을 재사용합니다.
- 반복되는 UI는 컴포넌트로 분리합니다. 페이지 전용 CSS 클래스나 `@apply`로 스타일을 묶는 방식은 피합니다.
- 별도 CSS는 공통 기본 스타일, 디자인 토큰 또는 Tailwind 사용이 비효율적인 경우에만 사용합니다.
- 사용자가 정하는 색상은 인라인 CSS 사용자 정의 속성과 정적으로 작성한 Tailwind 클래스를 조합합니다. 유틸리티 클래스 이름을 동적으로 조합하지 않습니다.

## 원본 파일 수정 및 가독성

- 프로젝트 원본 파일을 해당 위치에서 직접 수정합니다. 다른 경로에 소스 트리를 임시로 만든 뒤 `cp`, `rsync`, `shutil.copy2`, `copytree`로 덮어쓰지 않습니다. 임시 사본의 파일 메타데이터도 원본에 복사하지 않습니다.
- 파일명에 번호가 붙은 소스 복사본을 만들거나 `page 2.tsx` 같은 파일을 수정하지 않습니다. 작업을 마치기 전에 `npm run check:duplicates`를 실행합니다.
- `"use client";` 아래, import 블록 뒤, JSX를 반환하는 return문 바로 위에는 빈 줄을 한 줄 둡니다. 서로 다른 역할의 훅, 함수, 타입, 상수 사이에도 빈 줄을 둡니다. 밀접하게 관련된 선언이나 동일한 훅의 연속 호출은 붙여 작성해도 됩니다.

## 유지보수하기 쉬운 구현

- 프로젝트 소유자가 코드를 이해하고 직접 수정하기 쉬운 것을 우선합니다. 역할과 업무 의미가 드러나는 이름을 사용하고, 알아보기 어려운 약어나 한 줄에 압축한 로직은 피합니다.
- 함수는 화살표 함수로 작성합니다. 각 함수와 컴포넌트는 하나의 역할에 집중합니다. 흐름을 이해하기 쉬워지는 경우 관련 UI나 업무 로직을 분리하되, 단순한 코드를 불필요하게 쪼개거나 추상화하지 않습니다.
- 중첩 삼항 연산자와 깊게 중첩된 JSX 조건을 피합니다. 복잡한 조건에는 의미 있는 이름을 붙이고, 조기 반환이나 명시적인 조건 분기를 사용합니다.
- JSX는 화면 표현에 집중합니다. 규모가 큰 필터링, 정렬, 검증, 데이터 변환은 필요한 경우 역할이 분명한 보조 함수나 훅으로 옮깁니다.
- 취약한 위치 지정이나 이유를 알기 어려운 픽셀 보정보다 명확한 레이아웃 구조와 일반적인 문서 흐름을 우선합니다. Tailwind 유틸리티는 읽기 쉽게 작성하고 DDS 토큰을 재사용합니다.
- 상태는 최소한으로 유지합니다. 기존 데이터로 계산할 수 있는 값은 중복 저장하지 않고 파생해서 사용합니다. 공유하는 근무표 상태는 Zustand로 관리하고, 일시적인 로컬 상태는 해당 컴포넌트에서 관리해도 됩니다.
- 비용이 큰 작업의 반복과 불필요하게 넓은 스토어 구독을 피합니다. 메모이제이션은 구체적인 이점이 있을 때만 적용하며, 추측에 기반한 최적화로 가독성을 떨어뜨리지 않습니다.
- 의미 있는 반복 값은 이름을 가진 상수로 정의합니다. 주석은 코드만으로 알기 어려운 제약과 선택 이유를 설명하고, 명백한 동작을 그대로 반복해서 설명하지 않습니다.
- 사용자의 기존 수정 사항, 코드 형식 규칙, 동작을 유지합니다. 특정 부분을 수정할 때는 그 범위 안에서 가독성을 함께 개선하고, 변경 내용에 맞는 검사를 실행합니다.

## 변경 사항과 Git 관리

- 현재는 `main` 브랜치에서만 작업합니다. 별도 작업 브랜치를 만들지 않습니다.
- 에이전트는 로컬 코드·문서 수정과 변경 범위에 맞는 검사까지 수행합니다. 별도의 명시적인 요청이 없으면 커밋이나 push를 실행하지 않습니다.
- 작업이 완료되면 프로젝트 소유자가 변경 내용을 확인하고 `main`에 직접 커밋·push합니다. PR 등록과 머지 단계는 사용하지 않습니다.
- 자동 PR 워크플로우, 로컬 파일의 주기적 감시, 시간 기반 PR 자동화는 사용하지 않습니다.
- 사용자가 특정 Git 작업을 명시적으로 요청한 경우에만 해당 범위에서 수행합니다.
- 사용자 수정 사항을 보존하고, 환경 변수·비밀키·생성물·불필요한 복사본은 커밋 대상에 포함하지 않습니다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
