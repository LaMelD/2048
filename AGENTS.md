# 2048 (React Native → Google Play)

4x4 2048 게임. Expo로 만들어 Google Play에 출시한다. 광고·과금·네트워크가 없다.

## 과거 작업을 찾는 법

과거 결정이나 작업 이력에 대한 질문이 오면 **추측하지 말고 이 순서로 찾는다.**

1. `docs/worklog/` — 진행 중인 작업의 실측·결정. 완료분은 `docs/worklog/done/`
2. `docs/linear-archive/` — Linear 이슈 로컬 미러 (코멘트 원문 포함, 기각된 이슈도 있음)
3. frontmatter 검색 — 예: `rg 'components: \[[^]]*\bgame\b' docs/`
4. `git log` — 위에서 안 나오면

태그는 `docs/history-vocab.txt`의 어휘만 쓴다. 자유 태그를 만들지 않는다.

## 작업 규율

- **작업 시작 = `docs/worklog/` 에 파일 생성.** 예외 없다.
- worklog에 쓰는 것: 왜 하는지, 실행한 명령 원문, 실측된 사실, 결정 사항
- worklog에 쓰지 않는 것: AI와의 문답, 중간 논의, 추측 — 컨텍스트를 오염시킨다
- 완료 시: Linear Done 전환 + `docs/worklog/done/` 이관 + 같은 커밋에 `python3 tools/linear-export.py` 실행 결과 포함

## 반드시 지킬 제약

이것을 어기면 빌드가 깨지거나 되돌릴 수 없다.

- **추가 런타임 의존성은 `@react-native-async-storage/async-storage` 하나뿐이다.** 애니메이션은 RN 내장 `Animated`, 제스처는 내장 `PanResponder`를 쓴다. `react-native-reanimated`, `react-native-gesture-handler`를 설치하지 않는다.
- **import 확장자 규칙이 두 갈래다.**
  - `*.test.ts` → 확장자를 **붙인다** (`from './board.ts'`). Node ESM이 요구한다.
  - 앱 코드 → 확장자를 **붙이지 않는다** (`from './game/board'`). Metro 관례다.
  - 따라서 테스트가 import하는 모듈(`board.ts`, `storage-parse.ts`)은 RN 의존성을 가지면 안 된다.
- **패키지명 `io.github.lameld.game2048`은 고정이다.** Play 업로드 후 영구 변경 불가.
- **키스토어(`.jks`)와 비밀번호를 저장소에 넣지 않는다.** `.jks`는 `~/keystores/`, 비밀번호는 `~/.gradle/gradle.properties`에 둔다.
- **`android/`는 커밋한다.** 릴리즈 서명 설정이 그 안에 있다. gitignore하면 prebuild 재실행 때 사라진다.
- 테스트 프레임워크를 설치하지 않는다. `node --test src/`로 돌린다.

## 명령

```bash
node --test src/                              # 테스트
npx tsc --noEmit                              # 타입 검사
npx expo run:android --device                 # 디버그 빌드 설치
cd android && ./gradlew :app:bundleRelease    # 출시용 AAB
python3 tools/linear-export.py --team <팀키>   # Linear 미러 갱신
```

## 문서

| 경로 | 내용 |
| --- | --- |
| `docs/superpowers/specs/2026-09-22-2048-design.md` | 설계 — 무엇을 왜 만드는가 |
| `docs/superpowers/plans/2026-09-22-2048.md` | 구현 계획 — 태스크별 코드와 검증 |
| `docs/history-vocab.txt` | 통제 어휘 정본 |
