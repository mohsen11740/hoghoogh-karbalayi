const VALID_TYPES = ["مشاوره حقوقی", "دادخواست", "شکواییه", "لایحه", "اظهارنامه", "نامه یا درخواست اداری"];

export async function onRequestPost({ request, env }) {
  try {
    let body;
    try { body = await request.json(); } catch { return json({ error: "اطلاعات ارسالی قابل خواندن نیست." }, 400); }
    const { documentType, description, extra } = body || {};
    if (typeof documentType !== "string" || !VALID_TYPES.includes(documentType)) return json({ error: "نوع درخواست معتبر نیست." }, 400);
    if (typeof description !== "string" || description.trim().length < 10) return json({ error: "لطفاً موضوع را حداقل در چند جمله توضیح بده." }, 400);
    if (description.length > 10000 || (typeof extra === "string" && extra.length > 4000)) return json({ error: "متن ورودی بیش از حد طولانی است." }, 400);
    const apiKey = env.AI_API_KEY;
    if (!apiKey) return json({ error: "اتصال دستیار هوشمند هنوز کامل نشده است. مدیر برنامه باید کلید API را در تنظیمات محرمانه وارد کند." }, 503);
    const baseUrl = (env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
    const model = env.AI_MODEL || "openai/gpt-oss-20b";
    const isAdvice = documentType === "مشاوره حقوقی";
    const system = `شما دستیار فارسی‌زبان حقوقی برنامه «حقوق کربلایی» هستید. موضوع را بر اساس قوانین ایران بررسی کن مگر کاربر کشور دیگری بگوید. پاسخ را روشن، کاربردی، منظم و با فارسی روان بنویس. هیچ واقعیت، تاریخ، مدرک، ماده قانونی، شماره رأی یا نقل‌قولی را جعل نکن. اگر از صحت یا جاری بودن مقرره مطمئن نیستی، صریح بگو و از ساختن استناد خودداری کن. بین گفته کاربر و واقعیت اثبات‌شده تفاوت بگذار. اگر اطلاعات ضروری کم است، سؤال‌های کوتاه و مشخص بپرس یا موارد نامعلوم را با [جای خالی] نشان بده. از درخواست اطلاعات حساس غیرضروری خودداری کن. ${isAdvice ? "برای مشاوره از این ساختار استفاده کن: خلاصه مسئله، نکات حقوقی، راهکارهای احتمالی، مدارک لازم، اقدام بعدی و ابهام‌ها." : "برای سند، عنوان، مرجع در صورت معلوم بودن، شرح ماجرا، دلایل و مستندات، خواسته یا درخواست نهایی و فهرست موارد ناقص را بیاور."} اگر موضوع به مهلت قانونی، ابلاغ، اجرای حکم یا خطر فوری مربوط است، ضرورت بررسی سریع را روشن بیان کن. از عنوان‌های روشن و متن قابل استفاده و حرفه‌ای بهره ببر.`;
    const userText = `نوع درخواست: ${documentType}\nشرح موضوع:\n${description.trim()}${typeof extra === "string" && extra.trim() ? `\n\nاطلاعات تکمیلی:\n${extra.trim()}` : ""}`;
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: system }, { role: "user", content: userText }], temperature: 0.25, max_tokens: 8192 })
    });
    if (!response.ok) {
      const details = await response.text();
      console.error("Groq API error", response.status, details.slice(0, 500));
      if (response.status === 429) return json({ error: "سرویس هوش مصنوعی فعلاً به سقف مصرف یا محدودیت موقت رسیده است. کمی بعد دوباره تلاش کن." }, 429);
      if (response.status === 401 || response.status === 403) return json({ error: "کلید API یا دسترسی مدل پذیرفته نشد. تنظیمات را بررسی کن." }, 502);
      return json({ error: "سرویس هوش مصنوعی موقتاً پاسخ نداد. لطفاً چند دقیقه دیگر دوباره تلاش کن." }, 502);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const result = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.map(p => p.text || "").join("\n").trim() : "";
    if (!result) return json({ error: "پاسخ قابل استفاده دریافت نشد. دوباره تلاش کن." }, 502);
    return json({ success: true, result });
  } catch (error) {
    console.error("Request error", error?.message || error);
    return json({ error: "در حال حاضر امکان برقراری ارتباط با دستیار هوشمند فراهم نیست. لطفاً چند دقیقه دیگر دوباره تلاش کنید." }, 502);
  }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
