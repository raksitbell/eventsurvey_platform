import Image from "next/image";

export default function AuthBrandPanel({
  headline,
  subtext,
}: {
  headline: string;
  subtext?: string;
}) {
  return (
    <div className="relative hidden min-h-dvh w-full overflow-hidden bg-[var(--color-event-sidebar)] lg:flex lg:w-1/2 lg:items-center lg:justify-center">
      <div className="relative z-10 mx-auto flex w-full flex-col items-center px-6 text-center xl:px-10">
        <Image
          src="/images/auth/login-hero.svg"
          alt=""
          width={656}
          height={400}
          className="h-auto w-[92%] max-w-none xl:w-[96%]"
        />
        <p className="mt-10 max-w-2xl text-lg leading-8 text-white/90 xl:text-xl">
          {headline}
        </p>
        {subtext ? (
          <p className="mt-4 max-w-xl text-base leading-7 text-white/70">
            {subtext}
          </p>
        ) : null}
      </div>
    </div>
  );
}
