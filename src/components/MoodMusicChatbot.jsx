"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Waves } from "lucide-react"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_GEN_AI_KEY)

// Enhanced emotion mappings with more nuanced music suggestions
const emotionConfig = {
  Happy: {
    genres: ["upbeat pop", "dance", "happy indie", "summer hits", "feel-good", "celebration", "energetic"],
    musicPrompt: "I can sense your positive energy! Let me find some uplifting music to amplify your happiness.",
    synonyms: ["joyful", "excited", "cheerful", "elated", "content", "euphoric", "delighted", "thrilled"],
    intensity: {
      low: ["chill pop", "acoustic happy", "light indie"],
      medium: ["upbeat pop", "feel-good hits", "positive vibes"],
      high: ["dance", "party", "celebration", "high energy"],
    },
  },
  Sad: {
    genres: ["melancholy", "emotional ballads", "indie sad", "healing music", "contemplative", "soft acoustic"],
    musicPrompt:
      "I understand you're going through a tough time. Music can be healing - let me find something that resonates with your feelings.",
    synonyms: ["depressed", "gloomy", "heartbroken", "tearful", "blue", "melancholic", "sorrowful", "down"],
    intensity: {
      low: ["soft acoustic", "gentle ballads", "healing music"],
      medium: ["melancholy indie", "emotional", "contemplative"],
      high: ["deep sadness", "heartbreak", "cathartic"],
    },
  },
  Angry: {
    genres: ["rock", "alternative rock", "punk", "metal", "aggressive", "intense", "powerful"],
    musicPrompt: "I can feel your frustration. Sometimes powerful music helps channel those intense emotions.",
    synonyms: ["furious", "irritated", "enraged", "mad", "annoyed", "frustrated", "livid", "outraged"],
    intensity: {
      low: ["alternative rock", "indie rock", "edgy pop"],
      medium: ["rock", "punk", "aggressive"],
      high: ["metal", "hardcore", "intense"],
    },
  },
  Anxious: {
    genres: ["ambient", "calming", "meditation", "peaceful", "relaxing", "soothing", "nature sounds"],
    musicPrompt: "I notice you seem anxious. Let me find some calming music to help ease your mind.",
    synonyms: ["worried", "nervous", "stressed", "tense", "uneasy", "restless", "overwhelmed", "panicked"],
    intensity: {
      low: ["soft ambient", "gentle instrumental", "peaceful"],
      medium: ["meditation", "calming", "relaxing"],
      high: ["deep relaxation", "anxiety relief", "therapeutic"],
    },
  },
  Excited: {
    genres: ["energetic", "electronic", "upbeat", "dance-pop", "motivational", "pump-up"],
    musicPrompt: "Your excitement is contagious! Let me find some high-energy tracks to match your vibe.",
    synonyms: ["thrilled", "pumped", "energized", "hyped", "enthusiastic", "exhilarated", "animated"],
    intensity: {
      low: ["upbeat pop", "energetic indie", "positive"],
      medium: ["dance-pop", "electronic", "motivational"],
      high: ["high energy", "pump-up", "intense electronic"],
    },
  },
  Romantic: {
    genres: ["romantic", "love songs", "smooth", "sensual", "intimate", "soft rock"],
    musicPrompt: "I sense romance in the air! Let me find some beautiful love songs for you.",
    synonyms: ["loving", "affectionate", "passionate", "tender", "intimate", "sentimental"],
    intensity: {
      low: ["soft romantic", "gentle love songs", "tender"],
      medium: ["romantic hits", "love ballads", "smooth"],
      high: ["passionate", "intense love", "sensual"],
    },
  },
  Nostalgic: {
    genres: ["nostalgic", "retro", "classic hits", "throwback", "vintage", "memories"],
    musicPrompt: "I can tell you're feeling nostalgic. Let me find some music that captures those precious memories.",
    synonyms: ["reminiscent", "wistful", "sentimental", "longing", "reflective"],
    intensity: {
      low: ["soft nostalgic", "gentle memories", "reflective"],
      medium: ["classic hits", "retro", "throwback"],
      high: ["deep nostalgia", "emotional memories", "vintage"],
    },
  },
  Motivated: {
    genres: ["motivational", "workout", "pump-up", "inspiring", "powerful", "energizing"],
    musicPrompt: "I can feel your determination! Let me find some motivational tracks to fuel your drive.",
    synonyms: ["determined", "driven", "focused", "ambitious", "inspired", "pumped up"],
    intensity: {
      low: ["inspiring", "uplifting", "positive motivation"],
      medium: ["motivational", "energizing", "pump-up"],
      high: ["intense motivation", "workout", "powerful"],
    },
  },
  Peaceful: {
    genres: ["peaceful", "serene", "tranquil", "zen", "nature", "meditation"],
    musicPrompt: "You seem to be in a peaceful state. Let me find some serene music to complement your tranquility.",
    synonyms: ["calm", "serene", "tranquil", "zen", "relaxed", "centered"],
    intensity: {
      low: ["gentle peaceful", "soft tranquil", "light ambient"],
      medium: ["peaceful", "serene", "zen"],
      high: ["deep meditation", "profound peace", "spiritual"],
    },
  },
  Neutral: {
    genres: ["chill", "lo-fi", "easy listening", "background", "ambient pop", "indie chill"],
    musicPrompt: "You seem balanced right now. Let me find some pleasant music to accompany your mood.",
    synonyms: ["balanced", "indifferent", "unaffected", "composed", "steady"],
    intensity: {
      low: ["soft background", "gentle ambient", "light"],
      medium: ["chill", "lo-fi", "easy listening"],
      high: ["deep chill", "atmospheric", "immersive"],
    },
  },
}

// Music genre keywords for direct requests
const musicGenreKeywords = {
  rock: ["rock", "metal", "punk", "hardcore", "alternative rock"],
  pop: ["pop", "mainstream", "chart", "radio hits"],
  jazz: ["jazz", "blues", "swing", "bebop"],
  classical: ["classical", "orchestra", "symphony", "piano"],
  electronic: ["electronic", "edm", "techno", "house", "dubstep"],
  hiphop: ["hip hop", "rap", "trap", "r&b"],
  country: ["country", "folk", "bluegrass", "americana"],
  indie: ["indie", "independent", "alternative", "underground"],
  reggae: ["reggae", "ska", "dub"],
  latin: ["latin", "salsa", "bachata", "reggaeton"],
  ambient: ["ambient", "atmospheric", "soundscape", "drone"],
  workout: ["workout", "gym", "fitness", "exercise", "training"],
  study: ["study", "focus", "concentration", "lo-fi"],
  sleep: ["sleep", "bedtime", "lullaby", "peaceful night"],
  party: ["party", "dance", "club", "celebration"],
  chill: ["chill", "relaxing", "calm", "mellow"],
}

// Enhanced context scenarios
const contextualScenarios = {
  breakup: {
    keywords: ["breakup", "broke up", "ex", "dumped", "heartbreak", "relationship ended", "split up"],
    emotion: "Sad",
    intensity: "high",
    response: "Going through a breakup is never easy. Music can help you process these emotions and heal.",
    genres: ["breakup songs", "healing", "emotional recovery", "moving on", "heartbreak ballads"],
  },
  work_stress: {
    keywords: ["work", "job", "boss", "deadline", "meeting", "project", "office", "stressed at work"],
    emotion: "Anxious",
    intensity: "medium",
    response: "Work stress can be overwhelming. Let me find some music to help you decompress.",
    genres: ["stress relief", "calming", "focus music", "relaxing"],
  },
  celebration: {
    keywords: ["celebration", "celebrate", "party", "achievement", "success", "graduated", "promotion", "birthday"],
    emotion: "Happy",
    intensity: "high",
    response: "Congratulations! This calls for some celebratory music!",
    genres: ["celebration", "party", "victory", "achievement", "upbeat"],
  },
  workout: {
    keywords: ["workout", "exercise", "gym", "running", "training", "fitness"],
    emotion: "Motivated",
    intensity: "high",
    response: "Time to get pumped! Let me find some high-energy workout music.",
    genres: ["workout", "fitness", "pump-up", "high energy", "motivation"],
  },
  late_night: {
    keywords: ["late night", "midnight", "can't sleep", "insomnia", "night time"],
    emotion: "Peaceful",
    intensity: "low",
    response: "Late night vibes call for something special. Let me find some perfect nighttime music.",
    genres: ["late night", "midnight", "chill night", "peaceful night"],
  },
  morning: {
    keywords: ["morning", "wake up", "start day", "coffee", "sunrise"],
    emotion: "Motivated",
    intensity: "medium",
    response: "Starting your day right! Let me find some energizing morning music.",
    genres: ["morning", "wake up", "energizing", "start day", "positive morning"],
  },
}

const MoodConfirmationChatbot = ({ emotion: initialEmotion }) => {
  const [messages, setMessages] = useState([])
  const [initialized, setInitialized] = useState(false)
  const [input, setInput] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [currentEmotion, setCurrentEmotion] = useState(null)
  const [emotionIntensity, setEmotionIntensity] = useState("medium")
  const [showPlayer, setShowPlayer] = useState(false)
  const [currentSong, setCurrentSong] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioData, setAudioData] = useState(Array(15).fill(10))
  const [moodConfirmed, setMoodConfirmed] = useState(false)
  const [conversationStage, setConversationStage] = useState("initial") // initial, confirming, confirmed
  const chatContainerRef = useRef(null)
  const audioRef = useRef(null)

  // Initialize with welcome message and initial mood detection
  useEffect(() => {
    if (!initialized) {
      const welcomeMessages = [
        {
          sender: "bot",
          text: "Hi! I'm NEURA, your AI music companion. I can sense emotions and suggest perfect music for any mood.",
          id: Date.now(),
        },
      ]

      if (initialEmotion && emotionConfig[initialEmotion]) {
        welcomeMessages.push({
          sender: "bot",
          text: `I'm picking up that you might be feeling ${initialEmotion.toLowerCase()} right now. Tell me a bit about what's going on with you - I'd love to understand your mood better and find the perfect music to match.`,
          id: Date.now() + 1,
        })
        setConversationStage("confirming")
      } else {
        welcomeMessages.push({
          sender: "bot",
          text: "Just tell me what's on your mind or how you're feeling, and I'll find the perfect music to match your mood.",
          id: Date.now() + 1,
        })
      }

      setMessages(welcomeMessages)
      setInitialized(true)
    }
  }, [initialized, initialEmotion])

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Audio visualization effect
  useEffect(() => {
    let interval
    if (showPlayer && currentSong && isPlaying) {
      interval = setInterval(() => {
        setAudioData((prev) => prev.map(() => Math.floor(Math.random() * 50) + 10))
      }, 100)
    }
    return () => clearInterval(interval)
  }, [showPlayer, currentSong, isPlaying])

  const addMessage = useCallback((sender, text) => {
    setMessages((prev) => [...prev, { sender, text, id: Date.now() + Math.random() }])
  }, [])

  // Enhanced mood analysis using Gemini with conversation context
  const analyzeMoodWithGemini = useCallback(async (userMessage, stage = "initial", suggestedEmotion = null) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

      let prompt = ""

      if (stage === "confirming" && suggestedEmotion) {
        prompt = `
          You are an expert emotion analyst. I initially detected the user might be feeling "${suggestedEmotion}".
          Now analyze their response: "${userMessage}"
          
          Determine:
          1. Do they confirm, deny, or provide more context about the suggested emotion?
          2. What is their actual emotional state based on their words, tone, and context?
          3. How intense is this emotion?
          4. What empathetic response would be appropriate?
          
          Available emotions: Happy, Sad, Angry, Anxious, Excited, Romantic, Nostalgic, Motivated, Peaceful, Neutral
          
          Respond in this exact JSON format:
          {
            "confirms_suggestion": true/false,
            "actual_emotion": "detected_emotion",
            "intensity": "low/medium/high",
            "confidence": 0.0-1.0,
            "reasoning": "brief explanation of emotional analysis",
            "context": "situational context if any",
            "empathetic_response": "warm, understanding response (max 60 words)",
            "music_suggestion_reason": "why this music would help (max 40 words)",
            "ready_for_music": true/false
          }
        `
      } else {
        prompt = `
          You are an expert emotion and mood analyst. Analyze this user message for emotional tone, context, and intensity:
          
          Message: "${userMessage}"
          
          Consider:
          1. Explicit emotional words and phrases
          2. Implicit emotional tone and context
          3. Intensity level (low, medium, high)
          4. Situational context that might affect mood
          5. Subtle linguistic cues like punctuation, capitalization, word choice
          6. Whether they're requesting specific music genres
          
          Available emotions: Happy, Sad, Angry, Anxious, Excited, Romantic, Nostalgic, Motivated, Peaceful, Neutral
          
          Respond in this exact JSON format:
          {
            "emotion": "detected_emotion",
            "intensity": "low/medium/high",
            "confidence": 0.0-1.0,
            "reasoning": "brief explanation of why you detected this emotion",
            "context": "any situational context detected",
            "empathetic_response": "a warm, understanding response (max 60 words)",
            "music_suggestion_reason": "why this type of music would help (max 40 words)",
            "genre_request": "specific genre if mentioned, otherwise null",
            "ready_for_music": true/false
          }
        `
      }

      const result = await model.generateContent(prompt)
      const response = await result.response
      const responseText = response.text()

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }

      throw new Error("Could not parse AI response")
    } catch (error) {
      console.error("Error analyzing mood with Gemini:", error)
      return {
        emotion: "Neutral",
        intensity: "medium",
        confidence: 0.5,
        reasoning: "Unable to analyze mood accurately",
        context: "",
        empathetic_response: "I'd love to help you find some music. Could you tell me more about how you're feeling?",
        music_suggestion_reason: "Music can always brighten your day",
        ready_for_music: false,
      }
    }
  }, [])

  // Check for direct genre requests
  const checkForGenreRequest = useCallback((userMessage) => {
    const lowerMessage = userMessage.toLowerCase()

    for (const [genre, keywords] of Object.entries(musicGenreKeywords)) {
      if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
        return genre
      }
    }

    // Check for play/music keywords
    const playKeywords = ["play", "put on", "listen to", "music", "songs", "tracks"]
    if (playKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      // Extract potential genre after play keywords
      const words = lowerMessage.split(" ")
      for (let i = 0; i < words.length; i++) {
        if (playKeywords.includes(words[i]) && i + 1 < words.length) {
          const nextWord = words[i + 1]
          for (const [genre, keywords] of Object.entries(musicGenreKeywords)) {
            if (keywords.includes(nextWord)) {
              return genre
            }
          }
        }
      }
    }

    return null
  }, [])

  const processSongData = useCallback((song) => {
    return {
      id: song.id || Math.random().toString(36).substring(7),
      name: song.name || "Unknown Track",
      artists: song.primaryArtists || song.artists?.primary || [{ name: "Unknown Artist" }],
      image: song.image || [{ url: "https://via.placeholder.com/100" }],
      mp3_url: song.downloadUrl?.[4]?.url || song.downloadUrl?.[0]?.url || "#",
      duration: song.duration || 0,
    }
  }, [])

  const searchMusic = useCallback(
    async (query, emotion = "Neutral", intensity = "medium") => {
      setIsLoading(true)
      addMessage("bot", `Finding the perfect ${query} music for you...`)

      try {
        const response = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`)
        const data = await response.json()

        if (data.data?.results) {
          const processedSongs = data.data.results
            .map(processSongData)
            .filter((song) => song.mp3_url && song.mp3_url !== "#")
            .slice(0, 8)

          setSearchResults(processedSongs)

          if (processedSongs.length > 0) {
            addMessage("bot", `Perfect! I found some great ${query} tracks that should match your vibe perfectly.`)
          } else {
            addMessage("bot", "I'm having trouble finding that specific music. Let me try something similar...")
            // Fallback search
            const fallbackQuery = emotion === "Neutral" ? "popular music" : emotionConfig[emotion]?.genres[0]
            const fallbackResponse = await fetch(
              `https://saavn.dev/api/search/songs?query=${encodeURIComponent(fallbackQuery)}`,
            )
            const fallbackData = await fallbackResponse.json()

            if (fallbackData.data?.results) {
              const fallbackSongs = fallbackData.data.results
                .map(processSongData)
                .filter((song) => song.mp3_url && song.mp3_url !== "#")
                .slice(0, 6)

              setSearchResults(fallbackSongs)
              addMessage("bot", `Here are some ${fallbackQuery} tracks that might work for you.`)
            }
          }
        }
      } catch (error) {
        console.error("Error searching songs:", error)
        addMessage("bot", "I encountered an issue while searching for music. Could you try a different request?")
      } finally {
        setIsLoading(false)
      }
    },
    [addMessage, processSongData],
  )

  const playSong = useCallback(
    (song) => {
      setCurrentSong(song)
      setShowPlayer(true)

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = song.mp3_url
          const playPromise = audioRef.current.play()

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true)
              })
              .catch((err) => {
                console.error("Error playing audio:", err)
                if (err.name === "NotAllowedError") {
                  addMessage("bot", "Please click the play button to start the music (browser autoplay restriction).")
                } else {
                  addMessage("bot", "Couldn't play that song. Let me try another one.")
                  playNextSong()
                }
              })
          }
        }
      }, 100)
    },
    [addMessage],
  )

  const playNextSong = useCallback(() => {
    if (searchResults.length > 0) {
      const currentIndex = searchResults.findIndex((song) => song.id === currentSong?.id)
      const nextIndex = (currentIndex + 1) % searchResults.length
      playSong(searchResults[nextIndex])
    }
  }, [searchResults, currentSong, playSong])

  const playPreviousSong = useCallback(() => {
    if (searchResults.length > 0) {
      const currentIndex = searchResults.findIndex((song) => song.id === currentSong?.id)
      const prevIndex = (currentIndex - 1 + searchResults.length) % searchResults.length
      playSong(searchResults[prevIndex])
    }
  }, [searchResults, currentSong, playSong])

  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.error("Error playing audio:", err))
      } else {
        audioRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (!input.trim() || isLoading) return

      const userMessage = input.trim()
      addMessage("user", userMessage)
      setInput("")
      setIsLoading(true)

      try {
        // Check for direct genre requests first
        const requestedGenre = checkForGenreRequest(userMessage)
        if (requestedGenre) {
          addMessage("bot", `Great choice! Let me find some ${requestedGenre} music for you.`)
          await searchMusic(requestedGenre)
          setIsLoading(false)
          return
        }

        // Check for contextual scenarios
        let contextFound = false
        for (const [scenario, data] of Object.entries(contextualScenarios)) {
          if (data.keywords.some((keyword) => userMessage.toLowerCase().includes(keyword))) {
            setCurrentEmotion(data.emotion)
            setEmotionIntensity(data.intensity)
            setMoodConfirmed(true)
            setConversationStage("confirmed")
            addMessage("bot", data.response)

            const genre = data.genres[Math.floor(Math.random() * data.genres.length)]
            await searchMusic(genre, data.emotion, data.intensity)
            contextFound = true
            break
          }
        }

        if (!contextFound) {
          if (conversationStage === "confirming" && initialEmotion) {
            // We're in confirmation stage with initial emotion
            const analysis = await analyzeMoodWithGemini(userMessage, "confirming", initialEmotion)

            setCurrentEmotion(analysis.actual_emotion)
            setEmotionIntensity(analysis.intensity)
            addMessage("bot", analysis.empathetic_response)

            if (analysis.ready_for_music) {
              setMoodConfirmed(true)
              setConversationStage("confirmed")

              if (analysis.music_suggestion_reason) {
                addMessage("bot", analysis.music_suggestion_reason)
              }

              // Select appropriate genre
              const emotionData = emotionConfig[analysis.actual_emotion] || emotionConfig.Neutral
              const intensityGenres = emotionData.intensity?.[analysis.intensity] || emotionData.genres
              const selectedGenre = intensityGenres[Math.floor(Math.random() * intensityGenres.length)]

              await searchMusic(selectedGenre, analysis.actual_emotion, analysis.intensity)
            } else {
              // Need more conversation to understand mood
              addMessage(
                "bot",
                "Tell me more about what's happening - I want to find music that really fits your situation.",
              )
            }
          } else {
            // Regular mood analysis
            const analysis = await analyzeMoodWithGemini(userMessage)

            setCurrentEmotion(analysis.emotion)
            setEmotionIntensity(analysis.intensity)
            addMessage("bot", analysis.empathetic_response)

            if (analysis.ready_for_music) {
              setMoodConfirmed(true)
              setConversationStage("confirmed")

              if (analysis.music_suggestion_reason) {
                addMessage("bot", analysis.music_suggestion_reason)
              }

              if (analysis.genre_request) {
                await searchMusic(analysis.genre_request, analysis.emotion, analysis.intensity)
              } else {
                const emotionData = emotionConfig[analysis.emotion] || emotionConfig.Neutral
                const intensityGenres = emotionData.intensity?.[analysis.intensity] || emotionData.genres
                const selectedGenre = intensityGenres[Math.floor(Math.random() * intensityGenres.length)]

                await searchMusic(selectedGenre, analysis.emotion, analysis.intensity)
              }
            } else {
              setConversationStage("confirming")
              addMessage("bot", "I'd love to understand your mood better. What's been on your mind lately?")
            }
          }
        }
      } catch (error) {
        console.error("Error processing message:", error)
        addMessage(
          "bot",
          "I want to help you find the perfect music. Could you tell me more about how you're feeling or what kind of music you're in the mood for?",
        )
      } finally {
        setIsLoading(false)
      }
    },
    [
      input,
      isLoading,
      addMessage,
      checkForGenreRequest,
      searchMusic,
      conversationStage,
      initialEmotion,
      analyzeMoodWithGemini,
    ],
  )

  const formatTime = useCallback((seconds) => {
    if (isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }, [])

  return (
    <div className="flex flex-col h-screen bg-black text-gray-100">
      {/* Background */}
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
            <motion.div className="flex items-center" initial={{ x: -20 }} animate={{ x: 0 }}>
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-lg mr-3"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
              >
                <Waves size={24} className="text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                  NEURA
                </h1>
                <p className="text-xs text-gray-300">AI Mood & Music Intelligence</p>
              </div>
            </motion.div>

            {currentEmotion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-purple-900 to-indigo-900 px-3 py-1 rounded-full text-sm"
              >
                <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
                  {currentEmotion} ({emotionIntensity})
                </span>
                {moodConfirmed && <span className="ml-2 text-green-400 text-xs">✓ Confirmed</span>}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-900 bg-opacity-50 backdrop-blur-md">
          {/* Chat container */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`mb-4 flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <div
                    className={`max-w-3/4 p-3 rounded-xl backdrop-blur-lg ${
                      message.sender === "user"
                        ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
                        : "bg-gray-800 bg-opacity-80 text-gray-100 border border-gray-700"
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
                      animate={{ y: [0, -10, 0] }}
                      transition={{
                        duration: 0.5,
                        repeat: Number.POSITIVE_INFINITY,
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
                  Curated for Your Mood
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
                        transition: { delay: index * 0.1 },
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
                              src={song.image?.[0]?.url || "https://via.placeholder.com/100"}
                              alt={song.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = "https://via.placeholder.com/100"
                              }}
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
                          <p className="font-medium text-gray-100 group-hover:text-white transition-colors duration-300 truncate">
                            {song.name}
                          </p>
                          <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300 truncate">
                            {song.artists?.[0]?.name || "Unknown Artist"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{formatTime(song.duration)}</p>
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
                        src={currentSong.image?.[0]?.url || "https://via.placeholder.com/100"}
                        alt={currentSong.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/100"
                        }}
                      />
                    </motion.div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-100 truncate max-w-[180px]">{currentSong.name}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">
                        {currentSong.artists?.[0]?.name || "Unknown Artist"}
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <motion.button
                      className="p-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={playPreviousSong}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </motion.button>

                    <motion.button
                      className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-indigo-500/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={togglePlayPause}
                    >
                      {isPlaying ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                    </motion.button>

                    <motion.button
                      className="p-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/20"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={playNextSong}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.button>

                    <motion.button
                      className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-pink-500/30"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.pause()
                          setIsPlaying(false)
                        }
                        setShowPlayer(false)
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  </div>
                </div>

                {/* Audio visualization and controls */}
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      {audioRef.current ? formatTime(audioRef.current.currentTime) : "0:00"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {currentSong?.duration ? formatTime(currentSong.duration) : "0:00"}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div
                    className="relative w-full h-2 mt-1 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
                    onClick={(e) => {
                      const progressBar = e.currentTarget
                      const rect = progressBar.getBoundingClientRect()
                      const progressPercent = (e.clientX - rect.left) / rect.width

                      if (audioRef.current) {
                        audioRef.current.currentTime = progressPercent * (currentSong?.duration || 0)
                      }
                    }}
                  >
                    <motion.div
                      className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                      style={{
                        width:
                          audioRef.current && currentSong?.duration
                            ? `${(audioRef.current.currentTime / currentSong.duration) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>

                  {/* Volume control */}
                  <div className="flex items-center mt-3 space-x-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 015.855 2.538M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
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
                          audioRef.current.volume = Number.parseFloat(e.target.value)
                        }
                      }}
                    />
                  </div>

                  {/* Audio visualization bars */}
                  {isPlaying && (
                    <div className="flex justify-between mt-3 h-12">
                      {audioData.map((value, index) => (
                        <motion.div
                          key={index}
                          className="w-1.5 bg-gradient-to-t from-blue-500 to-indigo-500 rounded-full"
                          style={{ height: value }}
                          animate={{ height: value }}
                          transition={{
                            type: "spring",
                            stiffness: 180,
                            damping: 15,
                            mass: 0.3,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <audio
                  ref={audioRef}
                  src={currentSong?.mp3_url}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={playNextSong}
                  onError={() => {
                    addMessage("bot", "Couldn't play that song. Trying another one...")
                    playNextSong()
                  }}
                  onTimeUpdate={() => {
                    // Force re-render to update progress bar
                    setAudioData((prev) => [...prev])
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-gray-800 bg-gray-900 bg-opacity-50 backdrop-blur-md"
          >
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 bg-opacity-70 rounded-xl pr-14 border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-30 focus:outline-none transition-all duration-300 text-gray-200 placeholder-gray-400"
                placeholder={
                  conversationStage === "confirming"
                    ? "Tell me more about how you're feeling..."
                    : "Share what's on your mind or request a music genre..."
                }
                disabled={isLoading}
              />

              <div className="absolute right-0 mr-2 flex space-x-1">
                <motion.button
                  type="submit"
                  className={`p-2 text-purple-400 hover:text-purple-300 transition-colors duration-300 ${isLoading || input.trim() === "" ? "opacity-50 cursor-not-allowed" : ""}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading || input.trim() === ""}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </motion.button>
              </div>
            </div>

            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>
                {conversationStage === "confirming"
                  ? "I'm understanding your mood - keep sharing!"
                  : "Express yourself naturally or request specific genres (e.g., 'play some jazz')"}
              </span>
              {input.length > 0 && <span>{input.length} characters</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default MoodConfirmationChatbot
