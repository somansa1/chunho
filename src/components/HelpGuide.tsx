import { useState, type ReactNode } from "react";
import {
  BookIcon,
  BowlIcon,
  CalendarIcon,
  ChartIcon,
  CheckIcon,
  DiceIcon,
  DownloadIcon,
  HandIcon,
  HelpIcon,
  LinkIcon,
  PhoneIcon,
  StarIcon,
  UploadIcon,
} from "./icons";

const FAQS = [
  {
    q: "프로그램을 어디선가 받아와야 하나요?",
    a: "아니요! 지금 보고 계신 이 화면이 이미 완성된 앱이에요. 인터넷 주소만 열면 바로 실행됩니다. 앱스토어나 다운로드 같은 건 필요 없어요.",
  },
  {
    q: "핸드폰에서는 어떻게 열어요?",
    a: "이 화면의 인터넷 주소를 복사해서 카카오톡 「나와의 채팅」으로 보내세요. 그리고 핸드폰에서 그 링크를 누르면 똑같이 열립니다. 자주 쓴다면 홈 화면에 추가(아래 설명 참고)해 두시면 편해요.",
  },
  {
    q: "제가 등록한 메뉴랑 기록은 어디에 저장되나요?",
    a: "지금 여신 브라우저(그 기기) 안에 저장돼요. 그래서 PC에서 남긴 기록은 PC에, 폰에서 남긴 기록은 폰에 남습니다. 기기를 옮길 때는 저녁 이력 탭의 「전체 백업」 파일 하나로 옮기면 돼요.",
  },
  {
    q: "데이터가 갑자기 사라지면 어떡하죠?",
    a: "브라우저 캐시 삭제나 시크릿 모드에서는 기록이 지워질 수 있어요. 일주일에 한 번쯤 저녁 이력 탭 → 「전체 백업」으로 파일 하나 받아두시면 언제든 「백업 불러오기」로 복원됩니다.",
  },
  {
    q: "이 주소를 앞으로도 계속 쓸 수 있나요?",
    a: "미리보기 주소는 환경에 따라 나중에 바뀔 수 있어요. 나만의 주소로 계속 쓰고 싶다면 무료 호스팅(예: Netlify Drop)에 올리시면 돼요. 주소가 바뀌어도 「전체 백업」 파일만 있으면 데이터를 그대로 이어갈 수 있어요.",
  },
  {
    q: "둘이서 동시에 쓸 수 있나요?",
    a: "한 기기에서 같이 쓰시는 걸 추천해요. 저녁 당번은 한 분이시니까요! 각자 폰에서 따로 기록하고 싶으시다면, 서로 「전체 백업 / 백업 불러오기」로 메뉴판을 공유하시면 됩니다.",
  },
];

const TAB_GUIDE = [
  {
    icon: <DiceIcon size={22} />,
    tone: "bg-tomato text-card border-tomato-deep",
    title: "랜덤 뽑기",
    desc: "냄비를 돌려 오늘 저녁을 뽑아요. 「최근에 먹은 메뉴 빼기」, 「찜한 메뉴 더 잘 나오게」로 조건을 바꿀 수 있고, 마음에 들면 「이걸로 확정!」을 누르세요.",
  },
  {
    icon: <BookIcon size={22} />,
    tone: "bg-ssam text-card border-ssam-deep",
    title: "우리 메뉴판",
    desc: "저녁 후보를 등록·수정·삭제하고 하트로 찜해요. 「오늘 이걸로」를 누르면 뽑기 없이도 바로 오늘 저녁으로 정해집니다.",
  },
  {
    icon: <CalendarIcon size={22} />,
    tone: "bg-egg text-ink border-egg-deep",
    title: "저녁 이력",
    desc: "먹은 저녁이 날짜별로 쌓여요. 별점과 한줄평을 남기고, 「이력 CSV」로 엑셀 정리, 「전체 백업」으로 데이터 보관·이동을 해요.",
  },
  {
    icon: <ChartIcon size={22} />,
    tone: "bg-ink text-paper border-ink",
    title: "통계",
    desc: "함께한 저녁 수, 평균 별점, 연속 저녁 기록, 최애 메뉴 랭킹까지 — 우리 둘의 식탁이 그래프로 보여요.",
  },
];

export default function HelpGuide() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ---------- 시작 배너 ---------- */}
      <section className="relative overflow-hidden rounded-[2rem] border-[3px] border-ink bg-card p-6 shadow-lift sm:p-8">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-egg/40 blur-2xl" aria-hidden />
        <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-tomato/15 blur-2xl" aria-hidden />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink/15 bg-mist/70 px-3 py-1 font-display text-xs text-ink-soft">
            <LinkIcon size={13} /> 사용 전 딱 1분만 읽어주세요
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-ink sm:text-4xl">
            뭘 깔아야 되냐고요? <span className="text-tomato">아무것도요!</span>
          </h2>
          <p className="mt-2.5 max-w-xl text-[15px] font-light leading-relaxed text-ink-soft">
            이 화면 자체가 완성된 앱이에요. 다운로드도, 설치도, 가입도 없이 <b className="font-semibold text-ink">인터넷 주소만 열면</b>{" "}
            바로 저녁 뽑기가 시작됩니다.
          </p>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", icon: <LinkIcon size={17} />, t: "주소 복사", d: "이 화면 위쪽의 인터넷 주소를 복사" },
              { n: "2", icon: <BowlIcon size={17} />, t: "브라우저에서 열기", d: "크롬·사파리 아무거나, PC든 폰이든" },
              { n: "3", icon: <CheckIcon size={17} />, t: "끝!", d: "냄비 돌리고 저녁 뽑으면 돼요" },
            ].map((s, i) => (
              <li key={s.n} className={`relative rounded-2xl border-2 px-4 py-3.5 ${i === 2 ? "border-ssam bg-ssam/8" : "border-dashed border-line bg-paper/60"}`}>
                <span className="absolute -left-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-egg font-display text-sm text-ink shadow-sm">
                  {s.n}
                </span>
                <p className={`flex items-center gap-1.5 font-display text-base ${i === 2 ? "text-ssam-deep" : "text-ink"}`}>
                  {s.icon} {s.t}
                </p>
                <p className="mt-1 text-xs font-light leading-relaxed text-ink-soft">{s.d}</p>
              </li>
            ))}
          </ol>

          <p className="mt-5 rounded-xl border-2 border-dashed border-egg-deep/50 bg-egg/15 px-4 py-3 text-sm font-light leading-relaxed text-ink">
            <b className="font-display text-[13px] text-egg-deep">TIP · 폰에서 열기</b>
            <br />
            복사한 주소를 <b className="font-semibold">카카오톡 「나와의 채팅」</b>에 붙여넣고, 핸드폰에서 그 링크를 누르면 똑같이 열려요.
          </p>
        </div>
      </section>

      {/* ---------- 하루 저녁 흐름 ---------- */}
      <section>
        <SectionTitle icon={<DiceIcon size={20} />} title="하루 저녁이 기록되는 순서" sub="이 순서대로만 하면 이력·통계가 알아서 쌓여요" />
        <ol className="relative mt-5 space-y-4 pl-10">
          <span className="absolute bottom-6 left-[13px] top-6 w-0 border-l-[3px] border-dashed border-line" aria-hidden />
          {[
            {
              icon: <PotIconWrap />,
              title: "냄비 돌리기",
              desc: "랜덤 뽑기 탭에서 「돌려돌려!」를 누르면 메뉴가 보글보글 뽑혀요. 마음에 안 들면 「다시 뽑기」.",
            },
            {
              icon: <CheckIcon size={18} />,
              title: "「이걸로 확정!」",
              desc: "오늘 저녁이 등록되고 머리글에 「오늘 저녁: ○○○」 배지가 떠요. 메뉴판에서 직접 골라도 돼요.",
            },
            {
              icon: <StarIcon size={18} filled />,
              title: "다 먹고 별점 남기기",
              desc: "저녁 이력 탭에서 별점(다시 누르면 취소)과 한줄평을 남기면 통계가 무럭무럭 자라요.",
            },
          ].map((s, i) => (
            <li key={s.title} className="relative">
              <span className="absolute -left-10 top-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-card bg-ink text-egg shadow-sm">
                {i === 2 ? s.icon : s.icon}
              </span>
              <div className="card-line rounded-2xl bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                <p className="font-display text-lg text-ink">
                  <span className="mr-2 text-sm text-ink-soft/60">STEP {i + 1}</span>
                  {s.title}
                </p>
                <p className="mt-1 text-sm font-light leading-relaxed text-ink-soft">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- 탭별 사용법 ---------- */}
      <section>
        <SectionTitle icon={<BookIcon size={20} />} title="탭별 사용법" sub="위쪽 탭 네 개가 이 앱의 전부예요" />
        <ul className="mt-5 space-y-3">
          {TAB_GUIDE.map((t, i) => (
            <li
              key={t.title}
              className="card-line flex gap-4 rounded-2xl bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift sm:items-center sm:p-5"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 shadow-sm ${t.tone}`}>{t.icon}</span>
              <div className="min-w-0">
                <p className="font-display text-lg text-ink">
                  <span className="mr-2 font-display text-sm text-line">{String(i + 1).padStart(2, "0")}</span>
                  {t.title}
                </p>
                <p className="mt-0.5 text-sm font-light leading-relaxed text-ink-soft">{t.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- 폰에 앱처럼 ---------- */}
      <section>
        <SectionTitle
          icon={<PhoneIcon size={20} />}
          title="핸드폰에 앱처럼 넣기 (선택)"
          sub="설치가 아니라 홈 화면 바로가기예요 — 30초면 돼요"
        />
        <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
          <div className="card-line rounded-2xl border-ink/60 bg-card p-5">
            <p className="flex items-center gap-2 font-display text-lg text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink font-display text-sm text-paper">아이폰</span>
              사파리로 열었을 때
            </p>
            <ol className="mt-3 space-y-2 text-sm font-light leading-relaxed text-ink-soft">
              <li className="flex gap-2"><MiniNum>1</MiniNum> 아래쪽 가운데 <b className="font-semibold text-ink">공유 버튼</b>(네모+화살표) 누르기</li>
              <li className="flex gap-2"><MiniNum>2</MiniNum> 「<b className="font-semibold text-ink">홈 화면에 추가</b>」 누르기</li>
              <li className="flex gap-2"><MiniNum>3</MiniNum> 추가 누르면 끝! 홈 화면에 냄비 아이콘이 생겨요</li>
            </ol>
          </div>
          <div className="card-line rounded-2xl border-ink/60 bg-card p-5">
            <p className="flex items-center gap-2 font-display text-lg text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ssam font-display text-sm text-card">갤럭시·안드로이드</span>
              크롬으로 열었을 때
            </p>
            <ol className="mt-3 space-y-2 text-sm font-light leading-relaxed text-ink-soft">
              <li className="flex gap-2"><MiniNum>1</MiniNum> 오른쪽 위 <b className="font-semibold text-ink">메뉴(⋮)</b> 누르기</li>
              <li className="flex gap-2"><MiniNum>2</MiniNum> 「<b className="font-semibold text-ink">앱 설치</b>」 또는 「홈 화면에 추가」 누르기</li>
              <li className="flex gap-2"><MiniNum>3</MiniNum> 설치 완료! 데이터 없이도(오프라인) 열려요</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- 데이터 ---------- */}
      <section>
        <SectionTitle
          icon={<DownloadIcon size={20} />}
          title="데이터는 어디에? 백업은요?"
          sub="기기마다 따로 저장돼요 — 옮길 땐 파일 하나로"
        />
        <div className="mt-5 grid gap-3.5 sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-ink bg-ink p-5 text-paper shadow-sm">
            <p className="font-display text-lg text-egg">기록 저장 위치</p>
            <p className="mt-1.5 text-sm font-light leading-relaxed text-mist">
              지금 여신 <b className="font-semibold text-paper">이 브라우저(기기)</b> 안에 자동 저장돼요. 새로고침해도 그대로!
            </p>
          </div>
          <div className="card-line rounded-2xl bg-card p-5">
            <p className="flex items-center gap-1.5 font-display text-lg text-ink">
              <DownloadIcon size={17} className="text-ssam-deep" /> 기기 A에서
            </p>
            <p className="mt-1.5 text-sm font-light leading-relaxed text-ink-soft">
              저녁 이력 탭 → <b className="font-semibold text-ink">「전체 백업」</b>을 누르면 JSON 파일이 저장돼요.
            </p>
          </div>
          <div className="card-line rounded-2xl bg-card p-5">
            <p className="flex items-center gap-1.5 font-display text-lg text-ink">
              <UploadIcon size={17} className="text-tomato" /> 기기 B에서
            </p>
            <p className="mt-1.5 text-sm font-light leading-relaxed text-ink-soft">
              저녁 이력 탭 → <b className="font-semibold text-ink">「백업 불러오기」</b>로 그 파일을 열면 메뉴·기록·설정이 다 옮겨져요.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section>
        <SectionTitle icon={<HelpIcon size={20} />} title="자주 묻는 질문" sub="궁금한 걸 눌러보세요" />
        <ul className="mt-5 space-y-2.5">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <li key={f.q} className={`card-line overflow-hidden rounded-2xl bg-card transition-shadow ${open ? "shadow-lift" : ""}`}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  aria-expanded={open}
                >
                  <span className={`font-display text-[15px] ${open ? "text-tomato-deep" : "text-ink"}`}>{f.q}</span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      open ? "rotate-45 border-tomato bg-tomato text-card" : "border-line text-ink-soft"
                    }`}
                  >
                    <span className="font-display text-base leading-none">+</span>
                  </span>
                </button>
                <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="border-t-2 border-dashed border-line px-5 py-4 text-sm font-light leading-relaxed text-ink-soft">{f.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------- 마무리 ---------- */}
      <div className="flex items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-ssam/50 bg-ssam/8 px-5 py-4 text-center">
        <HandIcon size={18} className="shrink-0 text-ssam-deep" />
        <p className="text-sm font-light text-ink-soft">
          이제 준비 끝! 위쪽 <b className="font-semibold text-ink">「랜덤 뽑기」</b> 탭에서 오늘 저녁부터 뽑아보세요.
          <span className="ml-1 font-display text-ssam-deep">맛있는 10월 되세요 🍚</span>
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="flex shrink-0 items-center gap-2 font-display text-2xl text-ink">
        <span className="text-tomato">{icon}</span>
        {title}
      </h2>
      <span className="hidden h-px flex-1 bg-line sm:block" />
      <p className="hidden text-xs font-light text-ink-soft sm:block">{sub}</p>
    </div>
  );
}

function MiniNum({ children }: { children: ReactNode }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mist font-display text-[11px] text-ink">
      {children}
    </span>
  );
}

function PotIconWrap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5h16" />
      <path d="M5 10.5V16a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-5.5" />
      <path d="M9 7.5q1.2-1.4 0-3M15 7.5q1.2-1.4 0-3" />
    </svg>
  );
}


