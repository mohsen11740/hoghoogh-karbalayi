const VALID_TYPES = ["مشاوره حقوقی", "دادخواست", "شکواییه", "لایحه", "اظهارنامه", "نامه یا درخواست اداری"];

export async function onRequestPost({ request, env }) {
  try {
    let body;
    try { 
      body = await request.json(); 
    } catch { 
      return json({ error: "اطلاعات ارسالی قابل خواندن نیست." }, 400); 
    }

    const { documentType, description, extra } = body || {};

    if (typeof documentType !== "string" || !VALID_TYPES.includes(documentType)) {
      return json({ error: "نوع درخواست معتبر نیست." }, 400);
    }
    if (typeof description !== "string" || description.trim().length < 10) {
      return json({ error: "لطفاً موضوع را حداقل در چند جمله توضیح بده." }, 400);
    }
    if (description.length > 10000 || (typeof extra === "string" && extra.length > 4000)) {
      return json({ error: "متن ورودی بیش از حد طولانی است." }, 400);
    }

    const apiKey = env.GROQ_API_KEY || env.AI_API_KEY || env.OPENAI_API_KEY;
    if (!apiKey) {
      return json({ error: "اتصال دستیار هوشمند هنوز کامل نشده است. مدیر برنامه باید کلید API را در تنظیمات محرمانه وارد کند." }, 503);
    }

    const baseUrl = (env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
    const model = env.AI_MODEL || "openai/gpt-oss-20b";
    const isAdvice = documentType === "مشاوره حقوقی";

    const system = `شما دستیار هوشمند و وکیل مشاور حقوقی ارشد سامانه «حقوق کربلایی» و مسلط به تمام قوانین و مقررات جمهوری اسلامی ایران هستید.

وظیفه شما ارائه راهکارها و متون حقوقی عمیق، کارشناسی، مستند و گام‌به‌گام است.

قواعد حیاتی و الزامی پاسخ‌دهی:
۱. استناد صریح به مواد قانونی: در هر پاسخ و برای هر ادعا یا راهکار، حتماً «نام کامل قانون»، «شماره ماده قانونی» و «تبصره و بند مرتبط» را قید کنید (مانند: مستند به مواد ۲۱۹، ۲۲۰ و ۳۹۰ قانون مدنی، ماده ۱ قانون تشدید مجازات مرتکبین ارتشا و اختلاس و کلاهبرداری، مواد ۱۰ و ۵۱۵ قانون آیین دادرسی مدنی و غیره). به هیچ وجه به پاسخ‌های کلی، مبهم و بدون ذکر شماره ماده قانونی بسنده نکنید.
۲. صحت اطلاعات: هیچ قانون، رأی یا ماده‌ای را جعل نکنید. در صورتی که موضوع اختلافی است یا رأی وحدت رویه مرتبط، نظریه مشورتی قوه قضائیه، یا رویه قضایی غالب دادگاه‌ها وجود دارد، صراحتاً بیان نمایید.
۳. لحن پاسخ: کاملاً رسمی، وزین، تخصصی و حقوقدان‌پسند، در عین حال برای پیگیری عملیاتی توسط کاربر خوانا و ساختاریافته باشد.

${isAdvice ? `ساختار پاسخ مشاوره حقوقی باید دقیقاً به این ترتیب باشد:
■ ۱. تحلیل حقوقی و ماهیت موضوع (تطبیق رخداد با قوانین و بررسی ارکان تحقق حق یا جرم)
■ ۲. مواد قانونی استنادی (لیست صریح و تفکیک‌شده تمام مواد و قوانین حاکم بر پرونده)
■ ۳. مراحل گام‌به‌گام و نقشه راه اقدام (مرحله ۱: اقدامات فوری/تأمینی، مرحله ۲: ارسال اظهارنامه یا مذاکره در صورت لزوم، مرحله ۳: ثبت دادخواست/شکواییه از طریق دفاتر خدمات الکترونیک قضایی و مرجع صالح رسیدگی)
■ ۴. مدارک و ادله اثبات دعوا مورد نیاز (شهود، مستندات بانکی، قرارداد، کارشناسی و...)
■ ۵. مواعد قانونی و هشدارهای مهم (مهلت‌های اعتراض، تجدیدنظرخواهی، مرور زمان، یا سقوط حق)` : `ساختار نگارش سند قضایی (${documentType}) باید کاملاً منطبق بر استانداردهای قضایی سامانه عدل‌ایران و دفاتر خدمات الکترونیک قضایی باشد:
■ مشخصات خواهان/شاکی، خوانده/مشتکی‌عنه (با جای خالی [ ... ] جهت تکمیل توسط کاربر)
■ موضوع/خواسته دقیق (با عبارات دقیق حقوقی مانند صدور حکم بر محکومیت خوانده به... به انضمام خسارات دادرسی و تأخیر تأدیه)
■ دلایل و منضمات (شامل اسناد، شهادت شهود، جلب نظر کارشناس رسمی، استعلامات و...)
■ شرح دادخواست/شکواییه/لایحه (مقدمه، شرح وقایع با استناد جزء‌به‌جزء به مواد قانونی مرتبط و تقاضای نهایی از مقام محترم قضایی)`}`;

    const userText = `نوع درخواست: ${documentType}\nشرح موضوع:\n${description.trim()}${typeof extra === "string" && extra.trim() ? `\n\nاطلاعات تکمیلی:\n${extra.trim()}` : ""}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({ 
        model, 
        messages: [
          { role: "system", content: system }, 
          { role: "user", content: userText }
        ], 
        temperature: 0.2, 
        max_tokens: 8192 
      })
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Groq API error", response.status, details.slice(0, 500));
      if (response.status === 429) {
        return json({ error: "سرویس هوش مصنوعی فعلاً به سقف مصرف یا محدودیت موقت رسیده است. کمی بعد دوباره تلاش کن." }, 429);
      }
      if (response.status === 401 || response.status === 403) {
        return json({ error: "کلید API یا دسترسی مدل پذیرفته نشد. تنظیمات را بررسی کن." }, 502);
      }
      return json({ error: "سرویس هوش مصنوعی موقتاً پاسخ نداد. لطفاً چند دقیقه دیگر دوباره تلاش کن." }, 502);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    const result = typeof content === "string" 
      ? content.trim() 
      : Array.isArray(content) 
        ? content.map(p => p.text || "").join("\n").trim() 
        : "";

    if (!result) return json({ error: "پاسخ قابل استفاده دریافت نشد. دوباره تلاش کن." }, 502);

    return json({ success: true, result });
  } catch (error) {
    console.error("Request error", error?.message || error);
    return json({ error: "در حال حاضر امکان برقراری ارتباط با دستیار هوشمند فراهم نیست. لطفاً چند دقیقه دیگر دوباره تلاش کنید." }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { 
    status, 
    headers: { 
      "Content-Type": "application/json; charset=utf-8", 
      "Cache-Control": "no-store" 
    } 
  });
}
