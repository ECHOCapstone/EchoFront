// 모든 인증 관련 화면(로그인/회원가입/프로필) 하단에 공통으로 노출되는 저작권 줄.
// 한 곳에 두어 문구나 스타일이 바뀔 때 화면별로 동기화하지 않아도 된다.
export default function Footer() {
  return (
    <p className="text-xs text-gray-500 text-center">© O(1)</p>
  );
}
