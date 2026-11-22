// 기본 가게 데이터 — 메이드키만 들어 있습니다.
// 나머지 가게는 고객이 골목을 걸으며 앱에서 직접 등록합니다(📍 가게 등록 버튼).
export const CATS = {
  cafe: { label: '카페', color: '#c98b5e', emoji: '☕' },
  craft: { label: '공방', color: '#8f7be0', emoji: '🎨' },
  food: { label: '음식', color: '#ff8f6b', emoji: '🍽️' },
  goods: { label: '소품', color: '#f08fb4', emoji: '🎁' },
  exp: { label: '체험', color: '#5fb8a0', emoji: '🎮' },
  book: { label: '책방', color: '#6f9bd8', emoji: '📚' },
  life: { label: '생활', color: '#9aa7b5', emoji: '🛍️' },
};

export const SHOPS = [
  {
    id: 'maidkey', name: '메이드키', cat: 'craft', emoji: '🎀', special: 'cardmaker',
    lat: 37.4308875, lng: 127.131921875,
    tagline: '내 사진으로 나만의 조각 카드를 만드는 곳',
    menu: [],
    events: [{ title: '조각 카드 만들기', desc: '메이드키에 방문해 원하는 사진을 올리면 정사각형 카드로 만들어 드려요.', until: '상시' }],
  },
];
