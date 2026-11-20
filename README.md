# 메이드키 타건샵 (madekey meta)

3D 매장을 걸어 다니며 키보드를 직접 타건해 보는 온라인 타건샵입니다.
여러 사람이 같은 매장에 동시에 접속해 서로를 볼 수 있습니다.

## 지금 되는 것

- 닉네임·모자 색을 고르고 마스코트 '키룡이'로 입장
- 매장 구성: 왼쪽 **커스텀 키보드**(진열 4대 + 작업대), 가운데 카운터와 둥근 테이블, 오른쪽 **완제품 키보드**(브랜드별 3줄 × 3대)
- 매장 걷기: WASD·방향키, 바닥 클릭 이동, 드래그로 둘러보기, 휠로 확대/축소, `Space` 점프, `H` 인사, 위쪽 버튼으로 구역 바로 가기
- 제품 정보: 키보드 가까이 가면 사진·브랜드·제품명·가격·사양(배열, 스위치, 연결, 핫스왑, 재고 / 커스텀은 하우징·보강판·체결·키캡)이 뜸
- 타건 체험: 키보드 앞에서 `E` → 실제 키보드를 누르면 화면의 키캡이 눌리고 소리가 남 (휴대폰은 화면의 키캡을 직접 누름)
- 멀티플레이: 서버(방) 5개 × 정원 100명, 다른 사람의 이동·타건·점프·인사가 실시간으로 보임

## 아직 임시인 것

브랜드·제품·가격·사진·타건음은 전부 **예시 데이터**입니다. 자료가 모이면 아래만 바꾸면 됩니다.

| 자료 | 넣는 곳 | 방법 |
|---|---|---|
| 브랜드 목록 | `src/catalog.js`의 `BRANDS` | 이름·색·한 줄 설명 교체 (매장에 순서대로 3줄) |
| 제품 목록(이름·가격·사양) | `src/catalog.js`의 `CATALOG` | 항목 교체 후 `IS_SAMPLE`을 `false`로 |
| 제품 사진 | `public/assets/img/products/` | 파일을 넣고 제품의 `image`에 경로 지정. 없으면 색으로 그린 그림이 나옴 |
| 구매 링크 | 제품의 `url` | 넣으면 정보 창에 '구매하러 가기'가 생김 |
| 타건 녹음 | `public/assets/snd/` | 파일을 넣고 제품의 `sound`에 경로 지정. 형식은 `src/audio.js` 위쪽 설명 참고 |
| 3D 모델 | `public/assets/models/` | 아직 불러오는 코드가 없음. `src/keyboard.js`를 모델 로더로 교체해야 함 |
| 매장 색 | `src/world.js`의 `THEME`, `src/style.css`의 `:root` | 값 교체 |

## 구조

```
index.html        화면 틀 (입장 화면, 매장 위에 뜨는 버튼들)
src/main.js       전체 흐름: 입력, 이동, 타건, 카메라, 다른 접속자 표시
src/world.js      매장 짓기 (바닥·벽·간판·진열 테이블), 충돌
src/keyboard.js   키보드 모델 (키캡이 하나씩 움직임)
src/avatar.js     캐릭터 '키룡이'
src/thumb.js      제품 사진 (없으면 그려서 대신함)
src/audio.js      타건음 (녹음 재생 또는 합성)
src/net.js        실시간 연결
src/catalog.js    브랜드·키보드 목록
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
