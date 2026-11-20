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

/* 완제품 브랜드. 매장에 이 순서대로 브랜드 줄이 생긴다 (한 줄에 키보드 4대까지) */
export const BRANDS = [
  { id: 'brand-a', name: '브랜드 A', color: '#d99a8c', desc: '입문용 가성비 라인' },
  { id: 'brand-b', name: '브랜드 B', color: '#8fb0c9', desc: '사무·저소음 라인' },
  { id: 'brand-c', name: '브랜드 C', color: '#b3a2dc', desc: '프리미엄 알루미늄 라인' },
  { id: 'brand-d', name: '브랜드 D', color: '#d9b96a', desc: '게이밍·래피드 라인' },
];

const C = (cs, cap, accent, legend) => ({ case: cs, cap, accent, legend });
const blank = { image: null, url: null, sound: null, model: null };
const pre = (id, brand, name, price, layout, sw, swName, conn, hotswap, stock, colors) => ({ id, kind: 'prebuilt', brand, name, price, layout, sw, swName, conn, hotswap, stock, colors, ...blank });
const cus = (id, name, price, layout, sw, swName, caseMat, plate, mount, keycap, builder, colors) => ({ id, kind: 'custom', name, price, layout, sw, swName, caseMat, plate, mount, keycap, builder, colors, ...blank });

export const CATALOG = [
  // ---- 완제품 · 브랜드 A ----
  pre('a-65', 'brand-a', '샘플 A65', 89000, '65%', 'linear', '샘플 적축', '유선 · 2.4G', true, '재고 있음', C('#f1ebdf', '#fbf7ee', '#d99a8c', '#5b4a3a')),
  pre('a-75', 'brand-a', '샘플 A75', 109000, '75%', 'tactile', '샘플 갈축', '유선 · 블루투스 · 2.4G', true, '재고 있음', C('#2f3338', '#3c4148', '#d99a8c', '#f1ebdf')),
  pre('a-87', 'brand-a', '샘플 A87', 119000, 'TKL', 'clicky', '샘플 청축', '유선', false, '재고 있음', C('#f4c9b8', '#fff5ef', '#c9684c', '#8a4a37')),
  pre('a-98', 'brand-a', '샘플 A98', 129000, '98%', 'linear', '샘플 황축', '유선 · 2.4G', true, '재고 있음', C('#e6d9c4', '#fbf3e3', '#b98a5e', '#6b5238')),
  // ---- 완제품 · 브랜드 B ----
  pre('b-65', 'brand-b', '샘플 B65 사일런트', 139000, '65%', 'silent', '샘플 저소음 적축', '블루투스 · 2.4G', true, '재고 있음', C('#c8d6e8', '#f2f6fb', '#4f7ab3', '#3d5a80')),
  pre('b-75', 'brand-b', '샘플 B75 오피스', 159000, '75%', 'silent', '샘플 저소음 갈축', '유선 · 블루투스 · 2.4G', true, '품절 임박', C('#3d4a5c', '#e8edf3', '#8fb0c9', '#3d4a5c')),
  pre('b-87', 'brand-b', '샘플 B87 오피스', 165000, 'TKL', 'tactile', '샘플 저소음 택타일', '유선 · 블루투스', true, '재고 있음', C('#dfe6ee', '#f8fafc', '#5c7ea3', '#44566b')),
  pre('b-98', 'brand-b', '샘플 B98', 169000, '98%', 'linear', '샘플 밀키축', '유선 · 블루투스', true, '재고 있음', C('#eceff3', '#ffffff', '#8fb0c9', '#56657a')),
  // ---- 완제품 · 브랜드 C ----
  pre('c-65', 'brand-c', '샘플 C65 알루', 219000, '65%', 'linear', '샘플 프리미엄 리니어', '유선 · 블루투스 · 2.4G', true, '재고 있음', C('#cfc4e6', '#f6f3fc', '#7d5fc0', '#56408f')),
  pre('c-75', 'brand-c', '샘플 C75 알루', 259000, '75%', 'tactile', '샘플 프리미엄 택타일', '유선 · 블루투스 · 2.4G', true, '예약 판매', C('#3a3248', '#4a4160', '#b3a2dc', '#efe9fa')),
  pre('c-87', 'brand-c', '샘플 C87 알루', 289000, 'TKL', 'linear', '샘플 프리미엄 리니어', '유선', true, '재고 있음', C('#b9b3a6', '#f3efe4', '#7d5fc0', '#4d4a43')),
  pre('c-60', 'brand-c', '샘플 C60 알루', 199000, '60%', 'clicky', '샘플 프리미엄 클릭', '유선', true, '재고 있음', C('#e9e2f5', '#ffffff', '#9a83d1', '#5b4a8a')),
  // ---- 완제품 · 브랜드 D ----
  pre('d-65', 'brand-d', '샘플 D65 래피드', 179000, '65%', 'linear', '샘플 자석축', '유선', false, '재고 있음', C('#26292e', '#34383f', '#d9b96a', '#f2e6c4')),
  pre('d-75', 'brand-d', '샘플 D75 래피드', 199000, '75%', 'linear', '샘플 자석축', '유선 · 2.4G', false, '재고 있음', C('#f2ead2', '#fffaf0', '#c79a3a', '#6b5524')),
  pre('d-87', 'brand-d', '샘플 D87 프로', 229000, 'TKL', 'tactile', '샘플 스피드 택타일', '유선 · 2.4G', true, '예약 판매', C('#3b3524', '#4c452f', '#e8c766', '#f6edd0')),
  pre('d-60', 'brand-d', '샘플 D60 미니', 149000, '60%', 'clicky', '샘플 스피드 클릭', '유선', true, '재고 있음', C('#e3d3a2', '#fbf4dc', '#a07a22', '#5f4a17')),

  // ---- 커스텀 ----
  cus('cu-01', '샘플 커스텀 01 · 도각', 420000, '65%', 'linear', '윤활 리니어', '알루미늄', 'FR4', '가스켓', 'PBT 체리 프로파일', '메이드키 빌드', C('#4f6b62', '#efddaf', '#a9c47f', '#67542b')),
  cus('cu-02', '샘플 커스텀 02 · 조약돌', 380000, '75%', 'tactile', '윤활 택타일', '폴리카보네이트', 'PC', '가스켓', 'PBT XDA 프로파일', '메이드키 빌드', C('#e8e2d4', '#fdfaf2', '#efb882', '#7a6a55')),
  cus('cu-03', '샘플 커스텀 03 · 묵직', 560000, 'TKL', 'linear', '윤활 롱폴 리니어', '알루미늄 + 황동 무게추', '알루미늄', '탑 마운트', 'ABS 이중사출', '메이드키 빌드', C('#26292e', '#34383f', '#d4b46a', '#e8dfc8')),
  cus('cu-04', '샘플 커스텀 04 · 사각', null, '60%', 'clicky', '클릭 재즈', '아크릴 적층', '황동', '트레이', 'PBT 염료승화', '손님 주문 제작 예시', C('#f3c4cf', '#fff6f8', '#d86a8c', '#9a4a63')),
  cus('cu-05', '샘플 커스텀 05 · 구름', 450000, '65%', 'silent', '윤활 저소음 리니어', '알루미늄', 'POM', '가스켓', 'PBT 체리 프로파일', '메이드키 빌드', C('#dfe6f2', '#ffffff', '#9ab0d6', '#5d6d8c')),
  cus('cu-06', '샘플 커스텀 06 · 말차', 400000, '75%', 'tactile', '윤활 택타일', '알루미늄', 'FR4', '리프 스프링', 'PBT MOA 프로파일', '메이드키 빌드', C('#8fa98b', '#f6efe0', '#5d7a5f', '#4a6650')),
  cus('cu-07', '샘플 커스텀 07 · 라벤더', 480000, 'TKL', 'linear', '윤활 리니어', '알루미늄', 'PC', '가스켓', 'PBT 염료승화', '메이드키 빌드', C('#c9bbe3', '#f8f5fd', '#8f78c9', '#5d4c8f')),
  cus('cu-08', '샘플 커스텀 08 · 레트로', null, 'Alice', 'tactile', '빈티지 택타일', '폴리카보네이트', '황동', '탑 마운트', 'ABS 이중사출 레트로', '손님 주문 제작 예시', C('#d9cfb8', '#efe8d6', '#b5523a', '#4a443a')),
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
