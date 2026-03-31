import React, { useMemo, useState } from 'react';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Tables } from '@/integrations/supabase/types';

type NewsArticle = Tables<'articles'>;

function deriveHindiExplanation(article: NewsArticle) {
  const text = `${article.title} ${article.description || ''} ${article.content || ''}`.toLowerCase();

  const isEconomy = /(economy|inflation|market|budget|tax|gdp|rupee|stock|व्यापार|अर्थव्यवस्था)/.test(text);
  const isTech = /(technology|ai|startup|digital|cyber|5g|डेटा|तकनीक|प्रौद्योगिकी)/.test(text);
  const isPolicy = /(policy|government|bill|minister|election|court|सरकार|नीति|चुनाव)/.test(text);

  const cause = isPolicy
    ? 'यह खबर अक्सर सरकारी नीति, प्रशासनिक फैसलों या कानूनी बदलावों से जुड़ी होती है।'
    : isEconomy
      ? 'इस खबर का मुख्य कारण आर्थिक दबाव, बाज़ार की चाल और वित्तीय नीतियों में बदलाव हो सकता है।'
      : isTech
        ? 'यह अपडेट तकनीकी बदलाव, नए प्रोडक्ट लॉन्च या डिजिटल अपनाने की रफ्तार से जुड़ा है।'
        : 'यह घटना कई सामाजिक, आर्थिक और प्रशासनिक कारणों के संयोजन से बनी लगती है।';

  const advantages = isTech
    ? 'नवाचार, नई नौकरियाँ और बेहतर उत्पादकता बढ़ने की संभावना।'
    : isEconomy
      ? 'दीर्घकाल में निवेश, रोजगार और व्यापार गतिविधियों को गति मिल सकती है।'
      : 'जागरूकता बढ़ती है, नीतिगत सुधार का रास्ता खुलता है और जनता की भागीदारी बढ़ती है।';

  const disadvantages = isEconomy
    ? 'कमज़ोर वर्ग पर कीमतों या अनिश्चितता का दबाव बढ़ सकता है।'
    : isPolicy
      ? 'नीति लागू होने तक भ्रम, विरोध या क्षेत्रीय असमानता की चुनौती रह सकती है।'
      : 'गलत जानकारी फैलने, सामाजिक तनाव और अल्पकालिक अस्थिरता का जोखिम रहता है।';

  return {
    summary: `${article.title}। यह अपडेट ${article.source} से है और हाल की बड़ी घटना को दर्शाता है।`,
    cause,
    advantages,
    disadvantages,
  };
}

const NewsExplainer: React.FC<{ article: NewsArticle }> = ({ article }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const explanation = useMemo(() => deriveHindiExplanation(article), [article]);

  const speechText = `समाचार सारांश। ${explanation.summary} कारण: ${explanation.cause} फायदे: ${explanation.advantages} नुकसान: ${explanation.disadvantages}`;

  const speakInHindi = () => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <Card className="news-explainer-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI हिंदी सारांश
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p><strong>सारांश:</strong> {explanation.summary}</p>
        <Separator />
        <p><strong>कारण:</strong> {explanation.cause}</p>
        <p><strong>फायदे:</strong> {explanation.advantages}</p>
        <p><strong>नुकसान:</strong> {explanation.disadvantages}</p>
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={speakInHindi} disabled={isSpeaking}>
            <Volume2 className="mr-1 h-4 w-4" /> हिंदी में सुनें
          </Button>
          <Button size="sm" variant="outline" onClick={stopSpeaking} disabled={!isSpeaking}>
            <VolumeX className="mr-1 h-4 w-4" /> रोकें
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewsExplainer;
