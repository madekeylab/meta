# 메이드키 타건샵 (madekey meta)

3D 매장을 걸어 다니며 키보드를 직접 타건해 보는 온라인 타건샵입니다.
여러 사람이 같은 매장에 동시에 접속해 서로를 볼 수 있습니다.

## 지금 되는 것 (첫 버전)

- 닉네임·캐릭터 색을 고르고 입장
- 매장 걷기: WASD·방향키, 바닥 클릭 이동, 드래그로 둘러보기, 휠로 확대/축소
- 타건 체험: 키보드 앞에서 `E` → 실제 키보드를 누르면 화면의 키캡이 눌리고 소리가 남 (휴대폰은 화면의 키캡을 직접 누름)
- 멀티플레이: 서버(방) 5개 × 정원 100명, 다른 사람의 이동·타건이 실시간으로 보임, 가득 찬 방은 다음 방으로 자동 안내
- 가까이 있는 사람의 타건음이 작게 들림

## 아직 임시인 것

키보드 목록·모델·타건음은 전부 임시입니다. 자료가 모이면 아래만 바꾸면 됩니다.

| 자료 | 넣는 곳 | 방법 |
|---|---|---|
| 키보드 목록(이름·스위치·색) | `src/catalog.js` | 항목을 실제 제품으로 교체 |
| 타건 녹음 | `public/assets/snd/` | 파일을 넣고 `catalog.js`의 `sound`에 경로 지정. 형식은 `src/audio.js` 위쪽 설명 참고 |
| 3D 모델 | `public/assets/models/` | 아직 불러오는 코드가 없음. `src/keyboard.js`를 모델 로더로 교체해야 함 |
| 브랜드 색·문구 | `src/world.js`의 `BRAND`, `src/style.css`의 `:root` | 값 교체 |

## 구조

```
index.html        화면 틀 (입장 화면, 매장 위에 뜨는 버튼들)
src/main.js       전체 흐름: 입력, 이동, 타건, 카메라, 다른 접속자 표시
src/world.js      매장 짓기 (바닥·벽·간판·진열 테이블), 충돌
src/keyboard.js   키보드 모델 (키캡이 하나씩 움직임)
src/avatar.js     캐릭터
src/audio.js      타건음 (녹음 재생 또는 합성)
src/net.js        실시간 연결
src/catalog.js    키보드 목록
worker/index.js   서버: Cloudflare Worker + Durable Object (방 하나 = 객체 하나)
```

## 실행

```bash
npm install
```

개발할 때는 터미널 두 개에서 각각 실행합니다. 화면은 http://localhost:5173 에서 엽니다.

```bash
npm run dev:worker
```

```bash
npm run dev
```

배포한 것과 같은 형태로 한 번에 확인하려면 (http://localhost:8787):

```bash
npm run preview
```

## 배포

Cloudflare 계정이 필요합니다. 처음 한 번 `npx wrangler login` 후:

```bash
npm run deploy
```
