// 잰말놀이 라우트는 PronunciationPractice 의 동적 컴포넌트로 위임된다.
// 추천 학습 진입은 RecommendedLearning → /pronunciation-practice?scriptId=N 으로 흐른다.
import PronunciationPractice from './PronunciationPractice';

export default function TongueTwister() {
  return <PronunciationPractice />;
}
