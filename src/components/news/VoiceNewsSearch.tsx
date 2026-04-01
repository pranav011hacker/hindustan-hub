import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Article = Tables<'articles'>;

const VoiceNewsSearch: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const recognitionRef = useRef<any>(null);

  const searchNews = useCallback(async (query: string) => {
    setIsSearching(true);
    const { data } = await supabase
      .from('articles')
      .select('*')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(5);
    setResults(data || []);
    setIsSearching(false);
    if (data && data.length > 0) {
      speakResults(data);
    } else {
      speak('No news found for your topic. Please try another keyword.');
    }
  }, []);

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setIsListening(false);
      searchNews(text);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setResults([]);
    setTranscript('');
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.9;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const speakResults = (articles: Article[]) => {
    const intro = `I found ${articles.length} news articles for you. `;
    const headlines = articles.map((a, i) => `Number ${i + 1}: ${a.title}. From ${a.source}.`).join(' ');
    speak(intro + headlines);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Voice News Search</h3>
            <p className="text-xs text-muted-foreground">Speak your topic, hear the news</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={isListening ? stopListening : startListening}
            className={`gap-2 ${isListening ? 'voice-active bg-destructive hover:bg-destructive/90' : 'bg-gradient-to-r from-primary to-accent hover:opacity-90'}`}
            size="lg"
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {isListening ? 'Stop Listening' : 'Ask for News'}
          </Button>

          {isSpeaking && (
            <Button variant="outline" size="sm" onClick={stopSpeaking} className="gap-1">
              <VolumeX className="h-4 w-4" /> Stop
            </Button>
          )}
        </div>

        {isListening && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            Listening... speak your topic now
          </div>
        )}

        {transcript && (
          <div className="mt-3">
            <Badge variant="secondary" className="text-sm">You said: "{transcript}"</Badge>
          </div>
        )}

        {isSearching && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Searching news...
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Voice Results</p>
            {results.map((article, i) => (
              <div
                key={article.id}
                className="flex items-start gap-3 rounded-lg border bg-card/50 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setCurrentIndex(i);
                  speak(`${article.title}. From ${article.source}. ${article.description || ''}`);
                }}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-2">{article.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{article.source}</p>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 ml-auto" onClick={(e) => {
                  e.stopPropagation();
                  speak(`${article.title}. ${article.description || ''}`);
                }}>
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceNewsSearch;
