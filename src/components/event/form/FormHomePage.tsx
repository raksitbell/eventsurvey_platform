import { useTranslations } from "next-intl";
import { FORM_TYPES } from "@/types/event/form";
import { PageIcon } from "@/icons";
import Link from "next/link";

export default function FormHomePage() {
  const t = useTranslations("form");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white/90">
          {t("title")}
        </h1>
      </div>

      {/* card  */}
      <div className="rounded border border-1 px-2 py-4">
        <div className="flex flex-col gap-4">
          {FORM_TYPES.map((type, key)=> {
            return <div  key={key} className="flex justify-between border px-2 py-4 w-full rounded-xl">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 text-blue-300 rounded-lg">
                        <PageIcon className="w-6 h-6"/>
                    </div>
                    
                    <h3>{t(type)}</h3>

                </div>
                <div>
                    <div className="flex item-center gap-2">
                        <span>status</span>
                        <Link href={`/form/${type}`} className="p-2 rounded-lg border hover:bg-blue-100">
                            {t("open")}
                        </Link>
                    </div>
                </div>
            </div>
          })}
        </div>
      </div>
    </div>
  );
}
