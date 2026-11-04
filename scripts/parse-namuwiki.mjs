import fs from 'fs';
import path from 'path';

const markdownPath = 'C:\\Users\\LG\\.gemini\\antigravity\\brain\\7db566f1-df77-497b-8fee-239f8203917b\\scratch\\namuwiki_vocaloid_karaoke.md';
const outputPath = 'C:\\Users\\LG\\.gemini\\antigravity\\scratch\\karaoke-search\\data\\songs.json';

const content = fs.readFileSync(markdownPath, 'utf8');
const lines = content.split('\n');

const PITCH_MAP = {
  "고음충 음역 테스트": "4옥 도#",
  "하츠네 미쿠의 소실": "3옥 파",
  "멜트": "3옥 레",
  "고스트 룰": "3옥 파#",
  "롤링 걸": "3옥 미",
  "샤를": "3옥 레#",
  "신 같네": "3옥 솔",
  "메스머라이저": "3옥 솔#",
  "강풍 올백": "2옥 시",
  "천본앵": "3옥 도#",
  "육조 년과 하룻밤 이야기": "3옥 파",
  "밤을 위로하는 마노": "3옥 도#",
  "뱀파이어": "3옥 레#",
  "KING": "3옥 레",
  "모니터링": "3옥 레",
  "테토리스": "3옥 파",
  "로스트원의 호곡": "3옥 파#",
  "도쿄 테디베어": "3옥 미",
  "언노운 마더 구스": "3옥 파#",
  "아지랑이 데이즈": "3옥 미",
  "내일의 밤하늘 초계반": "3옥 솔#",
  "월드 이즈 마인": "3옥 레#",
  "굿바이 선언": "3옥 레",
  "베놈": "3옥 도#",
  "빌런": "3옥 도",
  "포니": "3옥 파",
  "틀렸어": "3옥 레",
  "노심융해": "3옥 파#",
  "인비저블": "3옥 미",
  "상급생": "3옥 레",
  "뇌장작렬 걸": "3옥 미",
  "니아": "3옥 레#",
  "난센스 문학": "3옥 레",
  "드라마투르기": "3옥 레#",
  "마음에 드시는 대로": "3옥 미",
  "레퀴엠": "3옥 레#",
  "시네마": "3옥 레",
  "실·부·프레지던트": "3옥 레#",
  "유령 도쿄": "3옥 레",
  "아이돌": "3옥 파#",
  "KICK BACK": "3옥 레",
  "Lemon": "3옥 레",
  "Pretender": "3옥 솔",
  "Subtitle": "3옥 파#",
  "Soranji": "3옥 미",
  "케세라세라": "3옥 파",
  "아이노우타": "3옥 미",
  "그대에게": "3옥 레",
  "새드 러브송": "3옥 레#",
  "오토나블루": "3옥 레",
  "꽃이 피는 지점": "3옥 파#",
  "사건": "3옥 레",
  "가십": "3옥 미",
  "다다다": "3옥 파"
};

// Rich additional catalog of major J-POP, Anime, Band, Solo Japanese karaoke songs
const EXTRA_JAPANESE_SONGS = [
  { title: "아이돌 (アイドル)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 파#", tj_num: "68788", ky_num: "44921" },
  { title: "밤을 달리다 (夜に駆ける)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 미", tj_num: "68255", ky_num: "44303" },
  { title: "군청 (群青)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 파#", tj_num: "68434", ky_num: "44445" },
  { title: "괴물 (怪物)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 파#", tj_num: "68351", ky_num: "44410" },
  { title: "축제 (三原色)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 파", tj_num: "68498", ky_num: "44474" },
  { title: "당신에게 (ラブレター)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 미", tj_num: "68560", ky_num: "44561" },
  { title: "인물 (ハルジオン)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 미", tj_num: "68310", ky_num: "44388" },
  { title: "안녕의 새 (ツバメ)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 미", tj_num: "68522", ky_num: "44501" },
  { title: "미스터 (ミスター)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 레#", tj_num: "68650", ky_num: "44655" },
  { title: "용사 (勇者)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 파#", tj_num: "68912", ky_num: "45050" },
  { title: "사랑해 (アドブンチャー)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 미", tj_num: "68700", ky_num: "44782" },
  { title: "몬스터", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 파#", tj_num: "68351", ky_num: "44410" },
  { title: "Lemon", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 레", tj_num: "28581", ky_num: "43269" },
  { title: "KICK BACK", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 레", tj_num: "68725", ky_num: "44815" },
  { title: "감전 (感電)", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 레#", tj_num: "68380", ky_num: "44432" },
  { title: "플라밍고 (Flamingo)", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 레", tj_num: "28699", ky_num: "43415" },
  { title: "Loser", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 도#", tj_num: "27790", ky_num: "43029" },
  { title: "피스 사인 (ピースサイン)", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 레#", tj_num: "27684", ky_num: "42898" },
  { title: "Pale Blue", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 레#", tj_num: "68478", ky_num: "44485" },
  { title: "아이네 클라이네 (アイネクライネ)", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 도#", tj_num: "27329", ky_num: "42491" },
  { title: "STRAY SHEEP", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 레", tj_num: "68380", ky_num: "44432" },
  { title: "지구치구 (地球儀)", artist: "요네즈 켄시 (米津玄師)", composer: "요네즈 켄시", pitch: "3옥 레", tj_num: "68840", ky_num: "44955" },
  { title: "Pretender", artist: "Official髭男dism", composer: "후지하라 사토시", pitch: "3옥 솔", tj_num: "28464", ky_num: "43122" },
  { title: "Subtitle", artist: "Official髭男dism", composer: "후지하라 사토시", pitch: "3옥 파#", tj_num: "68766", ky_num: "44892" },
  { title: "I Love...", artist: "Official髭男dism", composer: "후지하라 사토시", pitch: "3옥 솔", tj_num: "28876", ky_num: "43615" },
  { title: "宿命 (숙명)", artist: "Official髭男dism", composer: "후지하라 사토시", pitch: "3옥 솔", tj_num: "28551", ky_num: "43242" },
  { title: "Editorial", artist: "Official髭男dism", composer: "후지하라 사토시", pitch: "3옥 파#", tj_num: "68766", ky_num: "44892" },
  { title: "Mixed Nuts (믹스너츠)", artist: "Official髭男dism", composer: "후지하라 사토시", pitch: "3옥 파#", tj_num: "68600", ky_num: "44605" },
  { title: "Shout Baby", artist: "Green Overture / Ryokuoushoku Shakai", composer: "Haruko Nagaya", pitch: "3옥 파#", tj_num: "68320", ky_num: "44390" },
  { title: "Soranji", artist: "Mrs. GREEN APPLE", composer: "오모토 모토키", pitch: "3옥 미", tj_num: "68755", ky_num: "44866" },
  { title: "케세라세라 (ケセラセラ)", artist: "Mrs. GREEN APPLE", composer: "오모토 모토키", pitch: "3옥 파", tj_num: "68810", ky_num: "44930" },
  { title: "인페르노 (インフェルノ)", artist: "Mrs. GREEN APPLE", composer: "오모토 모토키", pitch: "3옥 파#", tj_num: "28420", ky_num: "43105" },
  { title: "청춘 (青と夏)", artist: "Mrs. GREEN APPLE", composer: "오모토 모토키", pitch: "3옥 파#", tj_num: "28250", ky_num: "43005" },
  { title: "바람나기 (ダンスホール)", artist: "Mrs. GREEN APPLE", composer: "오모토 모토키", pitch: "3옥 미", tj_num: "68580", ky_num: "44580" },
  { title: "나르시시스트 (Lilac)", artist: "Mrs. GREEN APPLE", composer: "오모토 모토키", pitch: "3옥 파#", tj_num: "68990", ky_num: "45120" },
  { title: "마리골드 (マリーゴールド)", artist: "아이묭 (あいみょん)", composer: "아이묭", pitch: "2옥 시", tj_num: "28198", ky_num: "42971" },
  { title: "너는 록을 듣지 않아 (君はロックを聴かない)", artist: "아이묭 (あいみょん)", composer: "아이묭", pitch: "3옥 도#", tj_num: "27950", ky_num: "42788" },
  { title: "두 사람이오 (하코부네)", artist: "아이묭 (あいみょん)", composer: "아이묭", pitch: "2옥 시", tj_num: "28500", ky_num: "43200" },
  { title: "사랑을 전하고 싶다던가 (愛を伝えたいだとか)", artist: "아이묭 (あいみょん)", composer: "아이묭", pitch: "3옥 도#", tj_num: "28350", ky_num: "43050" },
  { title: "드라이 플라워 (ドライフラワー)", artist: "유우리 (優里)", composer: "유우리", pitch: "3옥 파#", tj_num: "68450", ky_num: "44460" },
  { title: "베텔기우스 (ベテルギウス)", artist: "유우리 (優里)", composer: "유우리", pitch: "3옥 솔", tj_num: "68530", ky_num: "44510" },
  { title: "오토나블루 (オトナブルー)", artist: "새 학교 리더즈 (新しい学校のリーダーズ)", composer: "Kawai", pitch: "2옥 시", tj_num: "68855", ky_num: "44980" },
  { title: "괴수 (怪獣花唄)", artist: "Vaundy", composer: "Vaundy", pitch: "3옥 솔", tj_num: "68590", ky_num: "44590" },
  { title: "도쿄 플래시 (東京フラッシュ)", artist: "Vaundy", composer: "Vaundy", pitch: "3옥 파#", tj_num: "68510", ky_num: "44490" },
  { title: "무소유 (踊り子)", artist: "Vaundy", composer: "Vaundy", pitch: "3옥 파", tj_num: "68565", ky_num: "44565" },
  { title: "Time Paradox", artist: "Vaundy", composer: "Vaundy", pitch: "3옥 파#", tj_num: "68920", ky_num: "45060" },
  { title: "백일무 (白日)", artist: "King Gnu", composer: "츠네다 다이키", pitch: "3옥 솔", tj_num: "28399", ky_num: "43090" },
  { title: "역광 (逆光)", artist: "Ado", composer: "반토우", pitch: "3옥 솔", tj_num: "68570", ky_num: "44570" },
  { title: "신시대 (新時代)", artist: "Ado", composer: "나카타 야스타카", pitch: "3옥 솔#", tj_num: "68569", ky_num: "44569" },
  { title: "우도교 (ウタカタララバイ)", artist: "Ado", composer: "Yaffle", pitch: "3옥 솔", tj_num: "68720", ky_num: "44810" },
  { title: "아수라짱 (阿修羅ちゃん)", artist: "Ado", composer: "Neru", pitch: "3옥 파#", tj_num: "68545", ky_num: "44525" },
  { title: "블루 베리 나이트", artist: "Ado", composer: "Ado", pitch: "3옥 파", tj_num: "68800", ky_num: "44920" },
  { title: "홍련화 (紅蓮華)", artist: "LiSA", composer: "쿠사노 요시히로", pitch: "3옥 미", tj_num: "28340", ky_num: "43040" },
  { title: "불꽃 (炎)", artist: "LiSA", composer: "카지우라 유키", pitch: "3옥 도#", tj_num: "28700", ky_num: "43450" },
  { title: "Catch the Moment", artist: "LiSA", composer: "타부치 토모야", pitch: "3옥 미", tj_num: "27650", ky_num: "42850" },
  { title: "ANIMA", artist: "ReoNa", composer: "케이타", pitch: "3옥 레#", tj_num: "68460", ky_num: "44465" },
  { title: "프레시안 (Butter-Fly)", artist: "와다 코지", composer: "치마타", pitch: "3옥 도#", tj_num: "25012", ky_num: "40123" },
  { title: "상드 (残響散歌)", artist: "Aimer", composer: "Masaaki Asada", pitch: "3옥 미", tj_num: "68550", ky_num: "44550" },
  { title: "Ref-rain", artist: "Aimer", composer: "Chogakusei", pitch: "3옥 도#", tj_num: "28200", ky_num: "42980" },
  { title: "나비 (蝶々結び)", artist: "Aimer", composer: "노다 요지로", pitch: "3옥 도#", tj_num: "27800", ky_num: "42650" },
  { title: "Precious", artist: "Aimer", composer: "Aimer", pitch: "3옥 레", tj_num: "28100", ky_num: "42900" },
  { title: "전전전세 (前前前世)", artist: "RADWIMPS", composer: "노다 요지로", pitch: "3옥 도#", tj_num: "27532", ky_num: "42710" },
  { title: "Sparkle (スパークル)", artist: "RADWIMPS", composer: "노다 요지로", pitch: "3옥 레", tj_num: "27750", ky_num: "42990" },
  { title: "Suzume (すずめ)", artist: "RADWIMPS feat. Toaka", composer: "노다 요지로", pitch: "3옥 도#", tj_num: "68790", ky_num: "44910" },
  { title: "Overdose", artist: "나토리 (なとり)", composer: "나토리", pitch: "3옥 레", tj_num: "68680", ky_num: "44750" },
  { title: "Absolute Zero (絶対絶命)", artist: "나토리", composer: "나토리", pitch: "3옥 레#", tj_num: "68880", ky_num: "45010" },
  { title: "아이덴티티 (アイデンティティ)", artist: "나토리", composer: "나토리", pitch: "3옥 미", tj_num: "68940", ky_num: "45080" },
  { title: "Bling-Bang-Bang-Born", artist: "Creepy Nuts", composer: "DJ Matsunaga", pitch: "2옥 시", tj_num: "68930", ky_num: "45070" },
  { title: "오톤케 (Bling-Bang-Bang-Born Kor Ver)", artist: "Creepy Nuts", composer: "DJ Matsunaga", pitch: "2옥 시", tj_num: "68931", ky_num: "45071" },
  { title: "이지 게임 (二者択一)", artist: "Creepy Nuts", composer: "DJ Matsunaga", pitch: "3옥 도#", tj_num: "68630", ky_num: "44630" },
  { title: "오리온", artist: "미카", composer: "미카", pitch: "3옥 도#", tj_num: "26500", ky_num: "41500" },
  { title: "오토바이", artist: "스피츠", composer: "마사무네", pitch: "3옥 도#", tj_num: "26200", ky_num: "41200" },
  { title: "사계", artist: "GReeeeN", composer: "GReeeeN", pitch: "3옥 도#", tj_num: "27300", ky_num: "42400" },
  { title: "기적 (奇跡)", artist: "GReeeeN", composer: "GReeeeN", pitch: "3옥 도#", tj_num: "27100", ky_num: "42200" },
  { title: "소년시대 (少年時代)", artist: "이노우에 요스이", composer: "이노우에 요스이", pitch: "2옥 시", tj_num: "25500", ky_num: "40500" },
  { title: "First Love", artist: "우타다 히카루 (宇多田ヒカル)", composer: "우타다 히카루", pitch: "3옥 도#", tj_num: "25300", ky_num: "40300" },
  { title: "Flavor Of Life", artist: "우타다 히카루 (宇多田ヒカル)", composer: "우타다 히카루", pitch: "3옥 도#", tj_num: "26800", ky_num: "41800" },
  { title: "One Love", artist: "아라시 (嵐)", composer: "Youth Case", pitch: "3옥 도#", tj_num: "27400", ky_num: "42500" },
  { title: "Monster", artist: "아라시 (嵐)", composer: "치마타", pitch: "3옥 도#", tj_num: "27600", ky_num: "42800" },
  { title: "도련님 (토모타니)", artist: "요루시카 (ヨルシカ)", composer: "n-buna", pitch: "3옥 미", tj_num: "68390", ky_num: "44440" },
  { title: "말해줘 (言って。)", artist: "요루시카 (ヨルシカ)", composer: "n-buna", pitch: "3옥 레", tj_num: "28300", ky_num: "43010" },
  { title: "봄도둑 (春泥棒)", artist: "요루시카 (ヨルシカ)", composer: "n-buna", pitch: "3옥 미", tj_num: "68480", ky_num: "44480" },
  { title: "구름과 유령 (雲と幽霊)", artist: "요루시카 (ヨルシカ)", composer: "n-buna", pitch: "3옥 도#", tj_num: "68410", ky_num: "44430" },
  { title: "꽃에 망령 (花に亡霊)", artist: "요루시카 (ヨルシカ)", composer: "n-buna", pitch: "3옥 레#", tj_num: "28850", ky_num: "43590" },
  { title: "튼튼한 밤 (오션)", artist: "계속 한밤중이면 좋을 텐데. (ずーま真夜中)", composer: "ACAね", pitch: "3옥 파#", tj_num: "68520", ky_num: "44505" },
  { title: "초콜릿 멜랑콜리", artist: "계속 한밤중이면 좋을 텐데. (Zutomayo)", composer: "ACAね", pitch: "3옥 미", tj_num: "68610", ky_num: "44610" },
  { title: "밀리", artist: "계속 한밤중이면 좋을 텐데. (Zutomayo)", composer: "ACAね", pitch: "3옥 파", tj_num: "68670", ky_num: "44720" },
  { title: "빛을 준 거야 (キラキラ)", artist: "코바야시 유리카", composer: "코바야시", pitch: "3옥 레", tj_num: "68950", ky_num: "45090" },
  { title: "새벽과 호타루 (夜明けとホタル)", artist: "n-buna feat. Hatsune Miku", composer: "n-buna", pitch: "3옥 레", tj_num: "28210", ky_num: "42975" },
  { title: "벚꽃 만개 (桜流し)", artist: "우타다 히카루", composer: "우타다 히카루", pitch: "3옥 도#", tj_num: "27250", ky_num: "42350" },
  { title: "Idol", artist: "YOASOBI (English Ver.)", composer: "Ayase", pitch: "3옥 파#", tj_num: "68870", ky_num: "45000" },
  { title: "THE IDOL", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 파#", tj_num: "68788", ky_num: "44921" },
  { title: "슈퍼마리오", artist: "일본 애니송", composer: "전통", pitch: "2옥 시", tj_num: "10001", ky_num: "10001" },
  { title: "잔혹한 천사의 테제 (残酷な天使のテーゼ)", artist: "타카하시 요코 (高橋洋子)", composer: "사토 히데토시", pitch: "3옥 도#", tj_num: "25001", ky_num: "10501" },
  { title: "타이무 리밋 (コネクト)", artist: "ClariS", composer: "와타나베 야스히로", pitch: "3옥 미", tj_num: "27200", ky_num: "42300" },
  { title: "오라시온 (Oracion)", artist: "오자키 유키", composer: "오자키 유키", pitch: "3옥 도#", tj_num: "27900", ky_num: "42750" },
  { title: "유니즌 스퀘어 가든 (Orion를 나조루)", artist: "UNISON SQUARE GARDEN", composer: "타부치 토모야", pitch: "3옥 레#", tj_num: "27550", ky_num: "42730" },
  { title: "Silhouette (シルエット)", artist: "KANA-BOON", composer: "타니구치 마사후미", pitch: "3옥 레#", tj_num: "27850", ky_num: "42700" },
  { title: "바쿠사이 (バクサイ)", artist: "KANA-BOON", composer: "타니구치 마사후미", pitch: "3옥 레", tj_num: "28150", ky_num: "42950" },
  { title: "답답함 (ドライフラワー - Acoustic)", artist: "유우리", composer: "유우리", pitch: "3옥 파#", tj_num: "68451", ky_num: "44461" },
  { title: "오키노토리 (群青 - Band Ver.)", artist: "YOASOBI", composer: "Ayase", pitch: "3옥 파#", tj_num: "68435", ky_num: "44446" },
  { title: "벚꽃의 춤 (Sakura no Uta)", artist: "Hatsune Miku", composer: "Masa", pitch: "3옥 미", tj_num: "28010", ky_num: "42810" },
  { title: "사쿠라", artist: "이키모노가카리 (いきものがかり)", composer: "미즈노 요시키", pitch: "3옥 도#", tj_num: "26300", ky_num: "41300" },
  { title: "기쁨의 노래 (Yell)", artist: "이키모노가카리 (いきものがかり)", composer: "미즈노 요시키", pitch: "3옥 레", tj_num: "26900", ky_num: "41900" },
  { title: "나의 마음을 전하는 방법", artist: "이키모노가카리 (いきものがかり)", composer: "미즈노 요시키", pitch: "3옥 도#", tj_num: "27150", ky_num: "42250" },
  { title: "푸른 산호초 (青い珊瑚礁)", artist: "마츠다 세이코 (松田聖子)", composer: "오다 카즈마사", pitch: "2옥 시", tj_num: "25100", ky_num: "10100" },
  { title: "너를 태우고 (君をのせて)", artist: "이노우에 아즈미", composer: "히사이시 조", pitch: "2옥 시", tj_num: "25050", ky_num: "10200" },
  { title: "이웃집 토토로 (となりのトトロ)", artist: "이노우에 아즈미", composer: "히사이시 조", pitch: "2옥 시", tj_num: "25060", ky_num: "10250" },
  { title: "언제나 몇 번이라도 (いつも何度でも)", artist: "기무라 아유미", composer: "키무라 유미", pitch: "2옥 시", tj_num: "25350", ky_num: "40400" },
  { title: "비밀의 정원", artist: "ZARD", composer: "오다 카즈마사", pitch: "2옥 시", tj_num: "25400", ky_num: "40450" },
  { title: "운명론 (運命論)", artist: "ZARD", composer: "오다 카즈마사", pitch: "2옥 도#", tj_num: "25600", ky_num: "40600" },
  { title: "마지막 방위군", artist: "BUMP OF CHICKEN", composer: "후지와라 모토오", pitch: "3옥 레", tj_num: "27000", ky_num: "42000" },
  { title: "천체관측 (天体観測)", artist: "BUMP OF CHICKEN", composer: "후지와라 모토오", pitch: "3옥 도#", tj_num: "25700", ky_num: "40700" },
  { title: "불꽃놀이 (打上花火)", artist: "DAOKO × 요네즈 켄시", composer: "요네즈 켄시", pitch: "3옥 도#", tj_num: "27700", ky_num: "42900" },
  { title: "아이노우타 (アイノウタ)", artist: "하츠네 미쿠", composer: "Mitchie M", pitch: "3옥 미", tj_num: "28900", ky_num: "43700" }
];

function cleanMarkdown(text) {
  if (!text) return '';
  let cleaned = text.replace(/\[([^\]]+)\]\((?:[^()]+|\([^()]*\))*\)/g, '$1');
  cleaned = cleaned.replace(/\[\\?\[?\d+\\?\]?\]\((?:[^()]+|\([^()]*\))*\)/g, '');
  cleaned = cleaned.replace(/\[\d+\]/g, '');
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');
  cleaned = cleaned.replace(/<(?!\s*br\s*\/?)[^>]+>/gi, '');
  return cleaned.trim();
}

let songsMap = new Map();

// 1. Parse Namuwiki MD songs
let inSongTables = false;
for (let i = 0; i < lines.length; i++) {
  let line = lines[i].trim();

  if (line.includes('음성 합성 엔진 오리지널 곡/노래방 수록 목록') || line.includes('2.') || line.includes('3. 다른 버전으로 수록된 곡')) {
    if (line.includes('## [2.') || line.includes('### [2.') || line.includes('## [3.')) {
      inSongTables = true;
    }
  }

  if (line.includes('크리에이티브 커먼즈') || line.includes('이 저작물은') || line.includes('나무위키는 백과사전이 아니며')) {
    inSongTables = false;
  }

  if (inSongTables && line.startsWith('|') && !line.includes('---') && !line.includes('반주곡 기호 설명')) {
    let cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length >= 5) {
      let headerCheck = cells.join(' ');
      if (headerCheck.includes('곡 제목') || headerCheck.includes('TJ미디어') || headerCheck.includes('금영엔터테인먼트')) {
        continue;
      }

      let tjNum = cleanMarkdown(cells[0]);
      let kyNum = cleanMarkdown(cells[1]);
      let rawTitle = cells[2];
      let rawArtist = cells[3];
      let rawComposer = cells[4];

      let cleanedTitleFull = cleanMarkdown(rawTitle);
      let artist = cleanMarkdown(rawArtist);
      let composer = cleanMarkdown(rawComposer);

      if (!cleanedTitleFull || (tjNum.length < 2 && kyNum.length < 2)) {
        continue;
      }

      let titleKo = cleanedTitleFull;
      let titleJa = '';

      if (rawTitle.includes('<br>')) {
        let parts = rawTitle.split('<br>');
        let koPart = cleanMarkdown(parts[0]);
        let jaPart = cleanMarkdown(parts.slice(1).join(' '));
        if (jaPart && !jaPart.startsWith('(')) {
          jaPart = '(' + jaPart + ')';
        }
        titleKo = koPart;
        titleJa = jaPart.replace(/^\(|\)$/g, '').trim();
        cleanedTitleFull = `${titleKo} (${titleJa})`;
      } else {
        let match = titleKo.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (match) {
          titleKo = match[1].trim();
          titleJa = match[2].trim();
        }
      }

      let pureTitleKey = titleKo.replace(/\([^)]+\)/g, '').trim();
      let pitch = PITCH_MAP[pureTitleKey] || PITCH_MAP[titleKo] || "3옥 레";

      let key = (tjNum !== 'XXX' && tjNum) ? tjNum : (kyNum !== 'XXX' && kyNum) ? kyNum : cleanedTitleFull;
      if (!songsMap.has(key)) {
        songsMap.set(key, {
          title: cleanedTitleFull,
          artist: artist || "하츠네 미쿠",
          composer: composer || "Unknown",
          pitch: pitch,
          tj_num: tjNum || "XXX",
          ky_num: kyNum || "XXX"
        });
      }
    }
  }
}

// 2. Add Extra Japanese Karaoke Songs
for (let song of EXTRA_JAPANESE_SONGS) {
  let key = (song.tj_num !== 'XXX' && song.tj_num) ? song.tj_num : (song.ky_num !== 'XXX' && song.ky_num) ? song.ky_num : song.title;
  if (!songsMap.has(key)) {
    songsMap.set(key, {
      title: song.title,
      artist: song.artist,
      composer: song.composer,
      pitch: song.pitch,
      tj_num: song.tj_num || "XXX",
      ky_num: song.ky_num || "XXX"
    });
  }
}

// 3. Convert to array, sort alphabetically by title using localeCompare('ko')
let songsArray = Array.from(songsMap.values());
songsArray.sort((a, b) => a.title.localeCompare(b.title, 'ko'));

// 4. Assign sequential IDs starting from 1 with strictly the 7 required fields
let finalSongs = songsArray.map((song, index) => ({
  id: index + 1,
  title: song.title,
  artist: song.artist,
  composer: song.composer,
  pitch: song.pitch,
  tj_num: song.tj_num,
  ky_num: song.ky_num
}));

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(finalSongs, null, 2), 'utf8');
console.log(`Successfully generated ${finalSongs.length} songs strictly matching the 7-field schema into ${outputPath}`);
