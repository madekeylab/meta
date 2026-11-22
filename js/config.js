// 구글 지도 API 키 (Maps JavaScript API).
// 비워 두면 키 없이 쓰는 간단한 구글 지도(현재 위치만 표시)가 열립니다.
// 키를 넣으면 구글 지도 위에 내 위치와 발견한 가게 마커가 함께 표시됩니다.
export const GOOGLE_MAPS_KEY = '';

// 서버(madekey.kr) 연결.
//  ''  → 게임이 올라간 주소와 같은 서버의 /api 를 사용 (madekey.kr 에 올리면 그대로 동작)
//  madekey.kr 서버는 다른 주소에서 오는 요청(CORS)을 허용하지 않으므로, 다른 주소에 올리면
//  자동으로 "이 기기에만 저장" 방식으로 동작합니다.
export const API_BASE = '';
