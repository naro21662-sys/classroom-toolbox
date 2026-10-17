// Supabase 프로젝트 주소와 공개(publishable) 키. 공개되어도 되는 값이며, 서비스 키는 절대 넣지 않는다.
// 실제 접근 제어는 Supabase의 행 수준 보안(RLS)이 담당한다.
export const SUPABASE_URL = 'https://kztoijubmhmrowmyroni.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_R6_aZN0o5gAC-qKEh7zdjA_XfKkuvs1';

// 아이디를 Supabase 인증용 이메일 형식으로 바꿀 때 쓰는 도메인. student-signup 함수와 같아야 한다.
export const STUDENT_EMAIL_DOMAIN = 'student.invalid';
