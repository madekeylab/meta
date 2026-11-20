/* 매장에 진열할 키보드 목록.
   지금은 전부 임시(샘플) 데이터다. 실제 제품 자료가 모이면 이 파일만 바꾸면 된다.

   - id     : 영문 고유 이름. 타건음·모델 파일 이름으로도 쓴다
   - name   : 매장에 보이는 제품 이름
   - sw     : 스위치 종류 (linear | tactile | clicky | silent) — 녹음이 없을 때 합성음의 성격을 정한다
   - colors : 케이스 / 키캡 / 포인트 키캡 / 글자 색
   - sound  : 실제 타건 녹음 파일 경로 (예: '/assets/snd/sample-01.wav'). null이면 합성음
   - model  : 실제 3D 모델 파일 경로 (예: '/assets/models/sample-01.glb'). 아직 쓰지 않으며 null이면 코드로 만든 모델 */

export const SWITCHES = {
  linear: '리니어',
  tactile: '택타일',
  clicky: '클릭',
  silent: '저소음',
};

export const CATALOG = [
  { id: 'sample-01', name: '샘플 키보드 01', sw: 'linear', colors: { case: '#e8e4dc', cap: '#f6f3ec', accent: '#2f6bff', legend: '#3a3d45' }, sound: null, model: null },
  { id: 'sample-02', name: '샘플 키보드 02', sw: 'tactile', colors: { case: '#22252b', cap: '#30343c', accent: '#f2c14e', legend: '#e9e6df' }, sound: null, model: null },
  { id: 'sample-03', name: '샘플 키보드 03', sw: 'clicky', colors: { case: '#b9c7d9', cap: '#eef2f7', accent: '#34507a', legend: '#34507a' }, sound: null, model: null },
  { id: 'sample-04', name: '샘플 키보드 04', sw: 'silent', colors: { case: '#d9c8b4', cap: '#f3e9da', accent: '#8a5a3c', legend: '#6b4a35' }, sound: null, model: null },
  { id: 'sample-05', name: '샘플 키보드 05', sw: 'linear', colors: { case: '#3f5d50', cap: '#e7ecdf', accent: '#3f5d50', legend: '#2f4239' }, sound: null, model: null },
  { id: 'sample-06', name: '샘플 키보드 06', sw: 'tactile', colors: { case: '#c9c3e6', cap: '#f4f2fb', accent: '#6c5fc7', legend: '#4b4391' }, sound: null, model: null },
];
