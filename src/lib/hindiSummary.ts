import type { Tables } from '@/integrations/supabase/types';

const CATEGORY_CONTEXT: Record<string, string> = {
  politics: 'यह राजनीतिक परिदृश्य और नीतिगत फैसलों से जुड़ी खबर है।',
  sports: 'यह खेल जगत से जुड़ी ताज़ा गतिविधि को दर्शाती है।',
  technology: 'यह टेक्नोलॉजी सेक्टर में हो रहे नए बदलावों पर केंद्रित है।',
  business: 'यह व्यापार, बाज़ार और आर्थिक प्रभावों से संबंधित अपडेट है।',
  entertainment: 'यह मनोरंजन जगत की ताज़ा हलचल को बताती है।',
  world: 'यह अंतरराष्ट्रीय घटनाओं और वैश्विक असर से जुड़ी खबर है।',
  general: 'यह एक महत्वपूर्ण सामान्य समाचार अपडेट है।',
};

export function buildHindiSummary(article: Tables<'articles'>): string {
  const fallbackContext = CATEGORY_CONTEXT.general;
  const categoryContext = CATEGORY_CONTEXT[article.category] || fallbackContext;
  const detail = article.description ? `संक्षेप में, ${article.description}` : 'विस्तृत जानकारी के लिए मूल स्रोत देखा जा सकता है।';

  return `${article.source} की ताज़ा रिपोर्ट के अनुसार, ${article.title}। ${categoryContext} ${detail}`;
}
