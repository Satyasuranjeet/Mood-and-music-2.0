import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Waves } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_GEN_AI_KEY);

// Map emotions to conversation prompts and music genres
const emotionToGenre = {
  'Happy': ['happy', 'pop', 'dance'],
  'Sad': ['sad songs', 'ballads', 'melancholy'],
  'Angry': ['rock', 'metal', 'aggressive'],
  'Disgust': ['punk', 'alternative', 'indie'],
  'Fear': ['ambient', 'atmospheric', 'soundscapes'],
  'Surprise': ['upbeat', 'energetic', 'electronic'],
  'Neutral': ['chill', 'lo-fi', 'easy listening']
};

const emotionToPrompt = {
  'Happy': "I detected that you might be feeling happy. Is that right?",
  'Sad': "I noticed you might be feeling a bit down. Would you say that's accurate?",
  'Angry': "You appear to be upset or frustrated. Is that how you're feeling?",
  'Disgust': "I'm sensing some displeasure in your expression. Does that sound right?",
  'Fear': "You seem a bit anxious or worried. Is that how you're feeling?",
  'Surprise': "You look surprised! Is that accurate?",
  'Neutral': "Your expression seems quite balanced. Would you say you're feeling neutral right now?"
};

const emotionToMusicPrompt = {
  'Happy': "Would you like some upbeat music to match your happy mood?",
  'Sad': "Would you like some comforting music that resonates with how you're feeling?",
  'Angry': "Would some energetic music help release some tension?",
  'Disgust': "Would you like some alternative music to shift your perspective?",
  'Fear': "Would some calming music help you relax?",
  'Surprise': "How about some exciting tracks to match that energy?",
  'Neutral': "Would you like some pleasant background music to accompany your balanced mood?"
};

const complexScenarios = {
  'breakup': {
    keywords: ['breakup', 'broke up', 'ex', 'dumped', 'heartbreak', 'relationship ended'],
    response: "I understand you're going through a breakup. That can be really tough. Would you like to hear some songs that might help process those emotions?",
    genres: ['breakup songs', 'healing', 'emotional']
  },
  'stressed': {
    keywords: ['stress', 'stressed', 'anxiety', 'anxious', 'overwhelmed', 'pressure'],
    response: "It sounds like you're under a lot of stress right now. Music can be a great stress reliever. Would you like some calming tracks?",
    genres: ['relaxing', 'meditation', 'calming']
  },
  'celebration': {
    keywords: ['celebration', 'celebrate', 'party', 'achievement', 'success', 'graduated', 'promotion'],
    response: "Congratulations on your achievement! Would you like some celebratory music to mark the occasion?",
    genres: ['celebration', 'party', 'upbeat']
  }
};

const MoodMusicChatbot = ({ emotion }) => {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hi! I'm your mood music assistant. I can recommend music based on how you're feeling. Would you like to use the camera so I can detect your mood, or would you prefer to just tell me how you're feeling?" }
  ]);
  
  const [input, setInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [moodConfirmed, setMoodConfirmed] = useState(false);
  const [detectedEmotion, setDetectedEmotion] = useState(null);
  const chatContainerRef = useRef(null);
  const audioRef = useRef(null);
  const [audioData, setAudioData] = useState([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [isLoading, setIsLoading] = useState(false);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Simulate audio visualization data
  useEffect(() => {
    if (showPlayer && currentSong) {
      const interval = setInterval(() => {
        setAudioData(prev => 
          prev.map(() => Math.floor(Math.random() * 50) + 10)
        );
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [showPlayer, currentSong]);

  // Trigger emotion detection flow when emotion prop changes
  useEffect(() => {
    if (emotion && emotion !== detectedEmotion) {
      setDetectedEmotion(emotion);
      setMoodConfirmed(false);
      
      if (!messages.some(msg => msg.text === emotionToPrompt[emotion])) {
        handleInitialEmotionDetection(emotion);
      }
    }
  }, [emotion]);

  const handleInitialEmotionDetection = (emotion) => {
    const validEmotions = Object.keys(emotionToGenre);
    const normalizedEmotion = validEmotions.includes(emotion) ? emotion : 'Neutral';
    
    addMessage('bot', emotionToPrompt[normalizedEmotion] || `I think you might be feeling ${normalizedEmotion.toLowerCase()}. Is that right?`);
  };

  const handleMoodConfirmation = async (confirmed, emotion) => {
    const validEmotions = Object.keys(emotionToGenre);
    const normalizedEmotion = validEmotions.includes(emotion) ? emotion : 'Neutral';
    
    setCurrentEmotion(normalizedEmotion);
    setMoodConfirmed(true);
    
    if (confirmed) {
      addMessage('bot', emotionToMusicPrompt[normalizedEmotion]);
      
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `The user is feeling ${normalizedEmotion}. Provide a short, empathetic response about how music can help with their ${normalizedEmotion.toLowerCase()} mood. Keep it conversational, friendly and under 100 words.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const responseText = response.text();
        
        addMessage('bot', responseText);
      } catch (error) {
        console.error('Error generating AI response:', error);
        const responseOptions = [
          `Music has an amazing way of amplifying ${normalizedEmotion.toLowerCase()} feelings. Let me find some tracks that match your current state.`,
          `When you're feeling ${normalizedEmotion.toLowerCase()}, the right music can be incredibly powerful. I've got some great suggestions for you.`,
          `I understand that ${normalizedEmotion.toLowerCase()} mood well. Let me enhance it with some carefully selected tracks.`
        ];
        
        addMessage('bot', responseOptions[Math.floor(Math.random() * responseOptions.length)]);
      }
    } else {
      addMessage('bot', "I see! Could you tell me how you're actually feeling right now?");
    }
  };

  const addMessage = (sender, text) => {
    if (!messages.some(msg => msg.sender === sender && msg.text === text)) {
      setMessages(prev => [...prev, { sender, text }]);
    }
  };
  
  const processSongData = (song) => {
    return {
      id: song.id || Math.random().toString(36).substring(7),
      name: song.name || "Unknown Track",
      artists: song.primaryArtists || song.artists?.primary || [{ name: "Unknown Artist" }],
      image: song.image || [{ url: "/api/placeholder/100/100" }],
      mp3_url: song.downloadUrl?.[4]?.url || song.downloadUrl?.[0]?.url || "#"
    };
  };
  
  const handleSearch = async (query) => {
    setIsLoading(true);
    addMessage('bot', `Searching for ${query} music...`);
    
    try {
      const response = await fetch(`https://saavn.dev/api/search/songs?query=${query}`);
      const data = await response.json();
      
      if (data.data && data.data.results) {
        const processedSongs = data.data.results
          .map(processSongData)
          .filter(song => song.mp3_url);
        
        setSearchResults(processedSongs);
        
        if (processedSongs.length > 0) {
          addMessage('bot', `I found some ${query} music you might enjoy. Here are a few recommendations:`);
        } else {
          addMessage('bot', `I couldn't find any ${query} music at the moment. Would you like to try a different genre?`);
        }
      } else {
        addMessage('bot', 'I had trouble finding music right now. Would you like to try again?');
      }
    } catch (error) {
      console.error('Error searching songs:', error);
      addMessage('bot', 'I had trouble finding music right now. Would you like to try again?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    addMessage('user', userMessage);
    setInput('');
    
    // First check if we're waiting for mood confirmation
    if (detectedEmotion && !moodConfirmed) {
      const positiveResponses = ['yes', 'yeah', 'yep', 'correct', 'right', 'true', 'okay', 'ok', 'yup', 'sure', 'indeed', 'exactly'];
      const negativeResponses = ['no', 'nope', 'not', 'incorrect', 'wrong', 'false', 'nah'];
      
      const isPositive = positiveResponses.some(word => userMessage.toLowerCase().includes(word));
      const isNegative = negativeResponses.some(word => userMessage.toLowerCase().includes(word));
      
      if (isPositive) {
        handleMoodConfirmation(true, detectedEmotion);
        return;
      } else if (isNegative) {
        handleMoodConfirmation(false, detectedEmotion);
        return;
      } else {
        addMessage('bot', `I'm not sure if that's a yes or no. Are you feeling ${detectedEmotion.toLowerCase()}?`);
        return;
      }
    }
    
    // If mood is confirmed, check if the message is about wanting music
    if (moodConfirmed && currentEmotion) {
      const musicKeywords = ['music', 'song', 'listen', 'play', 'yes', 'yeah', 'sure', 'ok', 'okay'];
      const wantsMusic = musicKeywords.some(word => userMessage.toLowerCase().includes(word));
      
      if (wantsMusic) {
        handleSearch(emotionToGenre[currentEmotion]?.[0] || 'pop');
        return;
      }
    }
    
    // Check for complex scenarios
    let scenarioDetected = false;
    for (const [scenario, data] of Object.entries(complexScenarios)) {
      if (data.keywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
        scenarioDetected = true;
        addMessage('bot', data.response);
        
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `The user mentioned they're dealing with a ${scenario} situation. Provide a short, empathetic response about how music can help with this specific situation. Keep it conversational, friendly and under 100 words.`;
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const responseText = response.text();
          
          addMessage('bot', responseText);
        } catch (error) {
          console.error('Error generating AI response:', error);
          addMessage('bot', "Music can be really helpful in times like these. Let me find some tracks that might resonate with you.");
        }
        
        handleSearch(data.genres[Math.floor(Math.random() * data.genres.length)]);
        break;
      }
    }
    
    if (scenarioDetected) return;
    
    // Check for simple emotion keywords before invoking Gemini
    const simpleEmotionKeywords = {
      'happy': ['happy', 'joy', 'excited', 'great', 'good'],
      'sad': ['sad', 'down', 'depressed', 'unhappy', 'upset'],
      'angry': ['angry', 'mad', 'frustrated', 'annoyed', 'pissed'],
      'fear': ['scared', 'afraid', 'anxious', 'nervous', 'worried'],
      'disgust': ['disgust', 'gross', 'yuck', 'hate'],
      'surprise': ['surprise', 'shocked', 'amazed', 'astonished'],
      'neutral': ['fine', 'okay', 'alright', 'meh', 'whatever']
    };
    
    let detectedSimpleEmotion = null;
    for (const [emotion, keywords] of Object.entries(simpleEmotionKeywords)) {
      if (keywords.some(keyword => userMessage.toLowerCase().includes(keyword))) {
        detectedSimpleEmotion = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        break;
      }
    }
    
    if (detectedSimpleEmotion) {
      setDetectedEmotion(detectedSimpleEmotion);
      addMessage('bot', `It sounds like you might be feeling ${detectedSimpleEmotion.toLowerCase()}. Would you like some music that matches this mood?`);
      return;
    }
    
    // Only use Gemini for complex cases we couldn't handle above
    setIsLoading(true);
    
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `
        Analyze this message from a user talking about their mood or feelings: "${userMessage}"
        
        1. What emotion is the user most likely expressing? Choose one from this list: Happy, Sad, Angry, Fear, Disgust, Surprise, Neutral
        2. Write a brief, empathetic response acknowledging their feeling (1-2 sentences)
        3. Does the user seem to want music recommendations? (yes/no)
        
        Format your response exactly like this:
        Emotion: [emotion]
        Response: [your empathetic response]
        WantsMusic: [yes/no]
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      // Parse the structured response
      const emotionMatch = responseText.match(/Emotion: (.*)/);
      const replyMatch = responseText.match(/Response: (.*)/);
      const wantsMusicMatch = responseText.match(/WantsMusic: (.*)/);
      
      const newEmotion = emotionMatch ? emotionMatch[1].trim() : "Neutral";
      const empathicResponse = replyMatch ? replyMatch[1].trim() : "Would you like some music that matches your mood?";
      const wantsMusic = wantsMusicMatch ? wantsMusicMatch[1].trim().toLowerCase() === 'yes' : false;
      
      setDetectedEmotion(newEmotion);
      addMessage('bot', empathicResponse);
      
      if (wantsMusic) {
        handleSearch(emotionToGenre[newEmotion]?.[0] || 'pop');
      }
    } catch (error) {
      console.error('Error analyzing message with AI:', error);
      addMessage('bot', "I'd love to help you find some music. Could you tell me more about how you're feeling?");
    } finally {
      setIsLoading(false);
    }
  };
  
  const playSong = (song) => {
    setCurrentSong(song);
    setShowPlayer(true);
    
    if (audioRef.current) {
      audioRef.current.src = song.mp3_url;
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-gray-100">
      {/* Background animated gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 to-blue-900 opacity-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
      </div>
      
      {/* App container */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-indigo-900 to-purple-900 p-4 shadow-xl backdrop-blur-lg bg-opacity-80"
        >
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center" 
              initial={{ x: -20 }}
              animate={{ x: 0 }}
            >
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg mr-3"
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  repeat: Infinity,
                  duration: 2 
                }}
              >
                <Waves size={24} className="text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">NEURA</h1>
                <p className="text-xs text-gray-300">Emotion-Driven Music AI By Satya</p>
              </div>
            </motion.div>
            
            {currentEmotion && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-purple-900 to-indigo-900 px-3 py-1 rounded-full text-sm"
              >
                Mood: <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
                  {currentEmotion}
                </span>
              </motion.div>
            )}
          </div>
        </motion.div>
        
        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-900 bg-opacity-50 backdrop-blur-md">
          {/* Chat container */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div 
                  key={index} 
                  className={`mb-4 flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div 
                    className={`max-w-3/4 p-3 rounded-xl backdrop-blur-lg ${
                      message.sender === 'user' 
                        ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20' 
                        : 'bg-gray-800 bg-opacity-80 text-gray-100 border border-gray-700'
                    }`}
                  >
                    {message.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div 
                className="flex justify-center py-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex space-x-2">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 rounded-full bg-blue-500"
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        repeatType: "loop",
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Music results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div 
                className="p-4 border-t border-gray-800 backdrop-blur-md bg-gray-900 bg-opacity-50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <h3 className="font-medium text-lg mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
                  Music Recommendations
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {searchResults.slice(0, 6).map((song, index) => (
                    <motion.div 
                      key={song.id}
                      className="relative overflow-hidden group backdrop-blur-md bg-gray-800 bg-opacity-50 border border-gray-700 rounded-xl cursor-pointer hover:border-purple-500 transition-all duration-300"
                      onClick={() => playSong(song)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        transition: { delay: index * 0.1 }
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="flex items-center p-3">
                        <div className="relative">
                          <motion.div 
                            className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 overflow-hidden shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300"
                            whileHover={{ scale: 1.05 }}
                          >
                            <img 
                              src={song.image?.[0]?.url || "/api/placeholder/100/100"} 
                              alt={song.name}
                              className="w-full h-full object-cover"
                            />
                          </motion.div>
                          <motion.div 
                            className="absolute inset-0 bg-black bg-opacity-20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            whileHover={{ scale: 1.1 }}
                          >
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </motion.div>
                        </div>
                        
                        <div className="ml-3 flex-1">
                          <p className="font-medium text-gray-100 group-hover:text-white transition-colors duration-300">
                            {song.name}
                          </p>
                          <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                            {song.artists?.[0]?.name}
                          </p>
                          <div className="mt-1 flex space-x-1">
                            {Array(5).fill(0).map((_, i) => (
                              <motion.div 
                                key={i}
                                className="h-1 w-3 rounded-full bg-purple-500 bg-opacity-50 group-hover:bg-opacity-100"
                                animate={{ 
                                  height: ["4px", `${6 + i * 1.5}px`, "4px"] 
                                }}
                                transition={{ 
                                  duration: 1.5,
                                  repeatType: "reverse",
                                  delay: i * 0.1,
                                  ease: "easeInOut"
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Music player */}
          <AnimatePresence>
            {showPlayer && currentSong && (
              <motion.div 
                className="relative p-4 bg-gradient-to-r from-gray-900 to-indigo-900 shadow-lg"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <motion.div 
                      className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 overflow-hidden shadow-lg shadow-purple-500/30"
                      whileHover={{ scale: 1.05 }}
                    >
                      <img 
                        src={currentSong.image?.[0]?.url || "/api/placeholder/100/100"} 
                        alt={currentSong.name}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-100">{currentSong.name}</p>
                      <p className="text-xs text-gray-400">{currentSong.artists?.[0]?.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {/* Previous song button */}
                    <motion.button 
                      className="p-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const currentIndex = searchResults.findIndex(song => song.id === currentSong.id);
                        if (currentIndex > 0) {
                          playSong(searchResults[currentIndex - 1]);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </motion.button>
                    
                    {/* Play/Pause button */}
                    <motion.button 
                      className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-indigo-500/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (audioRef.current) {
                          if (audioRef.current.paused) {
                            audioRef.current.play().catch(err => console.error('Error playing audio:', err));
                          } else {
                            audioRef.current.pause();
                          }
                        }
                      }}
                    >
                      {audioRef.current?.paused ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </motion.button>
                    
                    {/* Next song button */}
                    <motion.button 
                      className="p-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const currentIndex = searchResults.findIndex(song => song.id === currentSong.id);
                        if (currentIndex >= 0 && currentIndex < searchResults.length - 1) {
                          playSong(searchResults[currentIndex + 1]);
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>
                    
                    {/* Close button */}
                    <motion.button 
                      className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-pink-500/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.pause();
                        }
                        setShowPlayer(false);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>
                </div>
                
                {/* Audio visualization */}
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400" id="current-time">0:00</div>
                    <div className="text-xs text-gray-400" id="duration">
                      {audioRef.current?.duration ? 
                        `${Math.floor(audioRef.current.duration / 60)}:${Math.floor(audioRef.current.duration % 60).toString().padStart(2, '0')}` : 
                        "0:00"}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative w-full h-2 mt-1 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      const progressBar = e.currentTarget;
                      const rect = progressBar.getBoundingClientRect();
                      const progressPercent = (e.clientX - rect.left) / rect.width;
                      
                      if (audioRef.current && !isNaN(audioRef.current.duration)) {
                        audioRef.current.currentTime = progressPercent * audioRef.current.duration;
                      }
                    }}
                  >
                    <motion.div 
                      className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                      style={{ 
                        width: audioRef.current?.duration ? 
                          `${(audioRef.current.currentTime / audioRef.current.duration) * 100}%` : 
                          "0%" 
                      }}
                    />
                  </div>
                  
                  {/* Volume control */}
                  <div className="flex items-center mt-3 space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 015.855 2.538M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      defaultValue="0.7"
                      className="w-24 h-2 accent-indigo-500 bg-gray-700 rounded-full appearance-none cursor-pointer"
                      onChange={(e) => {
                        if (audioRef.current) {
                          audioRef.current.volume = parseFloat(e.target.value);
                        }
                      }} 
                    />
                  </div>
                  
                  {/* Audio visualization bars */}
                  <div className="flex justify-between mt-3 h-12">
                    {audioData.map((value, index) => (
                      <motion.div
                        key={index}
                        className="w-1.5 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-full"
                        style={{ height: value }}
                        transition={{ 
                          type: "spring",
                          stiffness: 180,
                          damping: 15,
                          mass: 0.3
                        }}
                      />
                    ))}
                  </div>
                </div>
                
                <audio 
                  ref={audioRef} 
                  src={currentSong?.mp3_url} 
                  autoPlay={true}
                  onTimeUpdate={(e) => {
                    const current = e.target;
                    if (current) {
                      const currentTime = document.getElementById('current-time');
                      if (currentTime) {
                        const minutes = Math.floor(current.currentTime / 60);
                        const seconds = Math.floor(current.currentTime % 60).toString().padStart(2, '0');
                        currentTime.textContent = `${minutes}:${seconds}`;
                      }
                      setAudioData(prev => [...prev]);
                    }
                  }}
                  onLoadedMetadata={(e) => {
                    const duration = document.getElementById('duration');
                    if (duration && e.target) {
                      const minutes = Math.floor(e.target.duration / 60);
                      const seconds = Math.floor(e.target.duration % 60).toString().padStart(2, '0');
                      duration.textContent = `${minutes}:${seconds}`;
                    }
                  }}
                  onEnded={() => {
                    const currentIndex = searchResults.findIndex(song => song.id === currentSong.id);
                    if (currentIndex >= 0 && currentIndex < searchResults.length - 1) {
                      playSong(searchResults[currentIndex + 1]);
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Chat input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 bg-gray-900 bg-opacity-50 backdrop-blur-md">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 bg-opacity-70 rounded-xl pr-14 border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-30 focus:outline-none transition-all duration-300 text-gray-200 placeholder-gray-400"
                placeholder="Type a message..."
                disabled={isLoading}
              />
              
              <div className="absolute right-0 mr-2 flex space-x-1">
                <motion.button
                  type="submit"
                  className={`p-2 text-purple-400 hover:text-purple-300 transition-colors duration-300 ${isLoading || input.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading || input.trim() === ''}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </motion.button>
              </div>
            </div>
            
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Type how you're feeling or use the camera</span>
              {input.length > 0 && (
                <span>{input.length} characters</span>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MoodMusicChatbot;