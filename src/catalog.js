/* 매장에 진열할 키보드 목록.
   ⚠ 지금은 전부 예시(샘플) 데이터다. 실제 자료가 모이면 이 파일만 바꾸면 매장에 반영된다.
   실제 자료로 바꾼 뒤에는 IS_SAMPLE을 false로 바꾼다 (화면의 '예시' 표시가 사라진다).

   공통 항목
   - id     : 영문 고유 이름
   - kind   : 'prebuilt'(완제품) | 'custom'(커스텀)
   - name   : 제품 이름
   - price  : 판매가(원). null이면 '가격 문의'
   - layout : 배열 (예: '65%', '75%', 'TKL')
   - sw     : 스위치 성격 (linear | tactile | clicky | silent) — 녹음이 없을 때 합성음의 성격
   - swName : 스위치 제품 이름
   - image  : 제품 사진 경로 (예: '/assets/img/products/xxx.webp'). null이면 색으로 그린 그림
   - url    : 구매 페이지 주소. null이면 구매 버튼을 숨긴다
   - colors : 케이스 / 키캡 / 포인트 키캡 / 글자 색 (3D 모델과 그림에 쓴다)
   - sound  : 타건 녹음 경로. null이면 합성음 (형식은 src/audio.js 참고)
   - model  : 3D 모델 경로. 아직 쓰지 않는다

   완제품 전용: brand(브랜드 id), conn(연결 방식), hotswap(핫스왑 여부), stock(재고 문구)
   커스텀 전용: caseMat(하우징), plate(보강판), mount(체결 방식), keycap(키캡), builder(조립자) */

export const IS_SAMPLE = true;

export const SWITCHES = {
  linear: '리니어',
  tactile: '택타일',
  clicky: '클릭',
  silent: '저소음',
};

/* 완제품 브랜드. 매장에 이 순서대로 브랜드 구역이 생긴다 (구역 하나에 키보드 3대까지) */
export const BRANDS = [
  { id: 'brand-a', name: '브랜드 A', color: '#d99a8c', desc: '입문용 가성비 라인' },
  { id: 'brand-b', name: '브랜드 B', color: '#8fb0c9', desc: '사무·저소음 라인' },
  { id: 'brand-c', name: '브랜드 C', color: '#b3a2dc', desc: '프리미엄 알루미늄 라인' },
];

const C = (cs, cap, accent, legend) => ({ case: cs, cap, accent, legend });

export const CATALOG = [
  // ---- 완제품 · 브랜드 A ----
  { id: 'a-65', kind: 'prebuilt', brand: 'brand-a', name: '샘플 A65', price: 89000, layout: '65%', sw: 'linear', swName: '샘플 적축', conn: '유선 · 2.4G', hotswap: true, stock: '재고 있음', colors: C('#f1ebdf', '#fbf7ee', '#e9967a', '#5b4a3a'), image: null, url: null, sound: null, model: null },
  { id: 'a-75', kind: 'prebuilt', brand: 'brand-a', name: '샘플 A75', price: 109000, layout: '75%', sw: 'tactile', swName: '샘플 갈축', conn: '유선 · 블루투스 · 2.4G', hotswap: true, stock: '재고 있음', colors: C('#2f3338', '#3c4148', '#e9967a', '#f1ebdf'), image: null, url: null, sound: null, model: null },
  { id: 'a-tkl', kind: 'prebuilt', brand: 'brand-a', name: '샘플 A87', price: 119000, layout: 'TKL', sw: 'clicky', swName: '샘플 청축', conn: '유선', hotswap: false, stock: '재고 있음', colors: C('#f4c9b8', '#fff5ef', '#c9684c', '#8a4a37'), image: null, url: null, sound: null, model: null },
  // ---- 완제품 · 브랜드 B ----
  { id: 'b-65', kind: 'prebuilt', brand: 'brand-b', name: '샘플 B65 사일런트', price: 139000, layout: '65%', sw: 'silent', swName: '샘플 저소음 적축', conn: '블루투스 · 2.4G', hotswap: true, stock: '재고 있음', colors: C('#c8d6e8', '#f2f6fb', '#4f7ab3', '#3d5a80'), image: null, url: null, sound: null, model: null },
  { id: 'b-75', kind: 'prebuilt', brand: 'brand-b', name: '샘플 B75 오피스', price: 159000, layout: '75%', sw: 'silent', swName: '샘플 저소음 갈축', conn: '유선 · 블루투스 · 2.4G', hotswap: true, stock: '품절 임박', colors: C('#3d4a5c', '#e8edf3', '#6f9bd1', '#3d4a5c'), image: null, url: null, sound: null, model: null },
  { id: 'b-98', kind: 'prebuilt', brand: 'brand-b', name: '샘플 B98', price: 169000, layout: '98%', sw: 'linear', swName: '샘플 밀키축', conn: '유선 · 블루투스', hotswap: true, stock: '재고 있음', colors: C('#eceff3', '#ffffff', '#6f9bd1', '#56657a'), image: null, url: null, sound: null, model: null },
  // ---- 완제품 · 브랜드 C ----
  { id: 'c-65', kind: 'prebuilt', brand: 'brand-c', name: '샘플 C65 알루', price: 219000, layout: '65%', sw: 'linear', swName: '샘플 프리미엄 리니어', conn: '유선 · 블루투스 · 2.4G', hotswap: true, stock: '재고 있음', colors: C('#cfc4e6', '#f6f3fc', '#7d5fc0', '#56408f'), image: null, url: null, sound: null, model: null },
  { id: 'c-75', kind: 'prebuilt', brand: 'brand-c', name: '샘플 C75 알루', price: 259000, layout: '75%', sw: 'tactile', swName: '샘플 프리미엄 택타일', conn: '유선 · 블루투스 · 2.4G', hotswap: true, stock: '예약 판매', colors: C('#3a3248', '#4a4160', '#b08ad6', '#efe9fa'), image: null, url: null, sound: null, model: null },
  { id: 'c-tkl', kind: 'prebuilt', brand: 'brand-c', name: '샘플 C87 알루', price: 289000, layout: 'TKL', sw: 'linear', swName: '샘플 프리미엄 리니어', conn: '유선', hotswap: true, stock: '재고 있음', colors: C('#b9b3a6', '#f3efe4', '#7d5fc0', '#4d4a43'), image: null, url: null, sound: null, model: null },

  // ---- 커스텀 ----
  { id: 'cu-01', kind: 'custom', name: '샘플 커스텀 01 · 도각', price: 420000, layout: '65%', sw: 'linear', swName: '윤활 리니어', caseMat: '알루미늄', plate: 'FR4', mount: '가스켓', keycap: 'PBT 체리 프로파일', builder: '메이드키 빌드', colors: C('#4f6b62', '#efddaf', '#a9c47f', '#67542b'), image: null, url: null, sound: null, model: null },
  { id: 'cu-02', kind: 'custom', name: '샘플 커스텀 02 · 조약돌', price: 380000, layout: '75%', sw: 'tactile', swName: '윤활 택타일', caseMat: '폴리카보네이트', plate: 'PC', mount: '가스켓', keycap: 'PBT XDA 프로파일', builder: '메이드키 빌드', colors: C('#e8e2d4', '#fdfaf2', '#efb882', '#7a6a55'), image: null, url: null, sound: null, model: null },
  { id: 'cu-03', kind: 'custom', name: '샘플 커스텀 03 · 묵직', price: 560000, layout: 'TKL', sw: 'linear', swName: '윤활 롱폴 리니어', caseMat: '알루미늄 + 황동 무게추', plate: '알루미늄', mount: '탑 마운트', keycap: 'ABS 이중사출', builder: '메이드키 빌드', colors: C('#26292e', '#34383f', '#d4b46a', '#e8dfc8'), image: null, url: null, sound: null, model: null },
  { id: 'cu-04', kind: 'custom', name: '샘플 커스텀 04 · 사각', price: null, layout: '60%', sw: 'clicky', swName: '클릭 재즈', caseMat: '아크릴 적층', plate: '황동', mount: '트레이', keycap: 'PBT 염료승화', builder: '손님 주문 제작 예시', colors: C('#f3c4cf', '#fff6f8', '#d86a8c', '#9a4a63'), image: null, url: null, sound: null, model: null },
];

export const brandOf = (p) => BRANDS.find((b) => b.id === p.brand) || null;
export const priceText = (p) => (p.price == null ? '가격 문의' : p.price.toLocaleString('ko-KR') + '원');

/* 제품 정보 창에 보여 줄 [항목, 값] 목록 */
export function specsOf(p) {
  const rows = [['배열', p.layout], ['스위치', `${p.swName} (${SWITCHES[p.sw] || ''})`]];
  if (p.kind === 'prebuilt') {
    rows.push(['연결', p.conn], ['핫스왑', p.hotswap ? '지원' : '미지원'], ['재고', p.stock]);
  } else {
    rows.push(['하우징', p.caseMat], ['보강판', p.plate], ['체결', p.mount], ['키캡', p.keycap], ['조립', p.builder]);
  }
  return rows.filter((r) => r[1]);
}
