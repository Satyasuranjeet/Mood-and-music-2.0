import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Waves } from "lucide-react"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_GEN_AI_KEY)

// Emotion mappings with more detailed genres and prompts
const emotionConfig = {
  Happy: {
    genres: ["upbeat pop", "dance", "happy indie", "summer hits", "feel-good"],
    initialPrompt: "I detected that you might be feeling happy. Is that right?",
    musicPrompt: "Would you like some uplifting music to match your happy mood?",
    synonyms: ["joyful", "excited", "cheerful", "elated", "content"],
  },
  Sad: {
    genres: ["sad songs", "ballads", "melancholy", "emotional", "heartbreak"],
    initialPrompt: "I noticed you might be feeling a bit down. Would you say that's accurate?",
    musicPrompt: "Would you like some comforting music that resonates with how you're feeling?",
    synonyms: ["depressed", "gloomy", "heartbroken", "tearful", "blue"],
  },
  Angry: {
    genres: ["rock", "metal", "aggressive", "punk", "hardcore"],
    initialPrompt: "You appear to be upset or frustrated. Is that how you're feeling?",
    musicPrompt: "Would some energetic music help release some tension?",
    synonyms: ["furious", "irritated", "enraged", "mad", "annoyed"],
  },
  Disgust: {
    genres: ["punk", "alternative", "indie", "experimental", "darkwave"],
    initialPrompt: "I'm sensing some displeasure in your expression. Does that sound right?",
    musicPrompt: "Would you like some alternative music to shift your perspective?",
    synonyms: ["repulsed", "displeased", "revolted", "sickened", "nauseated"],
  },
  Fear: {
    genres: ["ambient", "atmospheric", "soundscapes", "calm", "meditative"],
    initialPrompt: "You seem a bit anxious or worried. Is that how you're feeling?",
    musicPrompt: "Would some calming music help you relax?",
    synonyms: ["scared", "anxious", "nervous", "terrified", "worried"],
  },
  Surprise: {
    genres: ["upbeat", "energetic", "electronic", "happy electronic", "dance-pop"],
    initialPrompt: "You look surprised! Is that accurate?",
    musicPrompt: "How about some exciting tracks to match that energy?",
    synonyms: ["astonished", "amazed", "shocked", "startled", "stunned"],
  },
  Neutral: {
    genres: ["chill", "lo-fi", "easy listening", "background", "ambient pop"],
    initialPrompt: "Your expression seems quite balanced. Would you say you're feeling neutral right now?",
    musicPrompt: "Would you like some pleasant background music to accompany your balanced mood?",
    synonyms: ["calm", "balanced", "indifferent", "unaffected", "composed"],
  },
}

const complexScenarios = {
  breakup: {
    keywords: ["breakup", "broke up", "ex", "dumped", "heartbreak", "relationship ended"],
    response:
      "I understand you're going through a breakup. That can be really tough. Would you like to hear some songs that might help process those emotions?",
    genres: ["breakup songs", "healing", "emotional", "heartbreak recovery", "moving on"],
  },
  stressed: {
    keywords: ["stress", "stressed", "anxiety", "anxious", "overwhelmed", "pressure"],
    response:
      "It sounds like you're under a lot of stress right now. Music can be a great stress reliever. Would you like some calming tracks?",
    genres: ["relaxing", "meditation", "calming", "stress relief", "peaceful"],
  },
  celebration: {
    keywords: ["celebration", "celebrate", "party", "achievement", "success", "graduated", "promotion"],
    response: "Congratulations on your achievement! Would you like some celebratory music to mark the occasion?",
    genres: ["celebration", "party", "upbeat", "victory", "success"],
  },
  workout: {
    keywords: ["workout", "exercise", "gym", "running", "training"],
    response: "Getting active? Music can boost your workout performance. Would you like some energizing tracks?",
    genres: ["workout", "energy boost", "motivation", "fitness", "pump up"],
  },
  sleep: {
    keywords: ["sleep", "tired", "insomnia", "bedtime", "rest"],
    response:
      "Having trouble sleeping? Music can help you relax and fall asleep. Would you like some soothing sleep music?",
    genres: ["sleep", "relaxing sleep", "calm sleep", "white noise", "sleep meditation"],
  },
}

const MoodMusicChatbot = ({ emotion }) => {
  const [messages, setMessages] = useState([])
  const [initialized, setInitialized] = useState(false)

  // Add this useEffect to handle the welcome message only once
  useEffect(() => {
    if (!initialized) {
      setMessages([
        {
          sender: "bot",
          text: "Hi! I'm your mood music assistant NEURA.",
        },
      ])
      setInitialized(true)
    }
  }, [initialized])

  const [input, setInput] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [currentEmotion, setCurrentEmotion] = useState(null)
  const [showPlayer, setShowPlayer] = useState(false)
  const [currentSong, setCurrentSong] = useState(null)
  const [moodConfirmed, setMoodConfirmed] = useState(false)
  const [detectedEmotion, setDetectedEmotion] = useState(null)
  const [processingMessage, setProcessingMessage] = useState(false) // Flag to prevent double responses
  const chatContainerRef = useRef(null)
  const audioRef = useRef(null)
  const [audioData, setAudioData] = useState(Array(15).fill(10))
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lastQuery, setLastQuery] = useState("") // Track last search query to prevent duplicates

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Simulate audio visualization data
  useEffect(() => {
    let interval
    if (showPlayer && currentSong && isPlaying) {
      interval = setInterval(() => {
        setAudioData((prev) => prev.map(() => Math.floor(Math.random() * 50) + 10))
      }, 100)
    }

    return () => clearInterval(interval)
  }, [showPlayer, currentSong, isPlaying])

  const addMessage = useCallback(
    (sender, text) => {
      // Check if this exact message already exists in the last 3 messages to prevent duplicates
      const recentMessages = messages.slice(-3)
      if (!recentMessages.some((msg) => msg.sender === sender && msg.text === text)) {
        setMessages((prev) => [...prev, { sender, text }])
      }
    },
    [messages],
  )

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
    async (query) => {
      // Don't search if we're already searching for this query
      if (query === lastQuery && searchResults.length > 0) {
        return
      }

      setLastQuery(query)
      setIsLoading(true)
      addMessage("bot", `Searching for ${query} music...`)

      // Clear previous results when searching for new genre
      setSearchResults([])

      try {
        // Cache results to localStorage to reduce API calls
        const cacheKey = `music_search_${query}`
        const cachedResults = localStorage.getItem(cacheKey)

        if (cachedResults) {
          const data = JSON.parse(cachedResults)
          const processedSongs = data.results.map(processSongData).filter((song) => song.mp3_url)
          setSearchResults(processedSongs)

          if (processedSongs.length > 0) {
            addMessage("bot", `Here are some ${query} recommendations for you:`)
          } else {
            addMessage("bot", `I couldn't find any ${query} music in my cache. Trying fresh search...`)
            throw new Error("No cached results")
          }
          return
        }

        const response = await fetch(`https://saavn.dev/api/search/songs?query=${query}`)
        const data = await response.json()

        if (data.data?.results) {
          // Cache the results
          localStorage.setItem(cacheKey, JSON.stringify(data.data))

          const processedSongs = data.data.results.map(processSongData).filter((song) => song.mp3_url)

          setSearchResults(processedSongs)

          if (processedSongs.length > 0) {
            addMessage("bot", `I found some ${query} music you might enjoy:`)
          } else {
            addMessage("bot", `I couldn't find any ${query} music at the moment. Try a different genre?`)
          }
        } else {
          addMessage("bot", "I had trouble finding music. Would you like to try again?")
        }
      } catch (error) {
        console.error("Error searching songs:", error)
        addMessage("bot", "I had trouble finding music. Would you like to try again?")
      } finally {
        setIsLoading(false)
      }
    },
    [addMessage, processSongData, lastQuery, searchResults.length],
  )

  // Define playSong function first
  const playSong = useCallback(
    (song) => {
      setCurrentSong(song)
      setShowPlayer(true)

      // Small delay to ensure the audio element is properly updated
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = song.mp3_url

          // Try to play and handle autoplay restrictions
          const playPromise = audioRef.current.play()

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true)
                console.log("Audio playing successfully")
              })
              .catch((err) => {
                console.error("Error playing audio:", err)
                // If autoplay is prevented, we'll show a message to the user
                if (err.name === "NotAllowedError") {
                  addMessage("bot", "Browser prevented autoplay. Please use the play button to start the music.")
                  setIsPlaying(false)
                } else {
                  addMessage("bot", "I couldn't play that song. Let me try another one.")
                  playNextSong()
                }
              })
          }
        }
      }, 100)
    },
    [addMessage],
  )

  // Define playNextSong function
  const playNextSong = useCallback(() => {
    if (searchResults.length > 0) {
      const currentIndex = searchResults.findIndex((song) => song.id === currentSong?.id)
      const nextIndex = (currentIndex + 1) % searchResults.length
      playSong(searchResults[nextIndex])
    }
  }, [searchResults, currentSong, playSong])

  // Handle emotion detection from camera
  useEffect(() => {
    if (emotion && emotion !== detectedEmotion && !processingMessage) {
      setDetectedEmotion(emotion)
      setMoodConfirmed(false)

      if (!messages.some((msg) => msg.text === emotionConfig[emotion]?.initialPrompt)) {
        handleInitialEmotionDetection(emotion)
      }
    }
  }, [emotion, detectedEmotion, messages, processingMessage])

  const handleInitialEmotionDetection = useCallback(
    (emotion) => {
      const normalizedEmotion = emotionConfig[emotion] ? emotion : "Neutral"
      addMessage("bot", emotionConfig[normalizedEmotion].initialPrompt)
    },
    [addMessage],
  )

  const handleMoodConfirmation = useCallback(
    async (confirmed, emotion) => {
      const normalizedEmotion = emotionConfig[emotion] ? emotion : "Neutral"

      setCurrentEmotion(normalizedEmotion)
      setMoodConfirmed(true)

      if (confirmed) {
        addMessage("bot", emotionConfig[normalizedEmotion].musicPrompt)

        try {
          setProcessingMessage(true)
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
          const prompt = `The user is feeling ${normalizedEmotion.toLowerCase()}. Provide a short, empathetic response (under 50 words) about how music can help with this mood. Be conversational and friendly.`
          const result = await model.generateContent(prompt)
          const response = await result.response
          const responseText = response.text()

          addMessage("bot", responseText)

          // Search for music based on the emotion
          const genre =
            emotionConfig[normalizedEmotion].genres[
              Math.floor(Math.random() * emotionConfig[normalizedEmotion].genres.length)
            ]
          await searchMusic(genre)
        } catch (error) {
          console.error("Error generating AI response:", error)
          const fallbackResponses = [
            `Music can be a great companion when you're feeling ${normalizedEmotion.toLowerCase()}. Let me find some tracks for you.`,
            `I understand that ${normalizedEmotion.toLowerCase()} mood. The right music can really help.`,
            `When I feel ${normalizedEmotion.toLowerCase()}, music always helps me. Let me share some with you.`,
          ]
          addMessage("bot", fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)])
        } finally {
          setProcessingMessage(false)
        }
      } else {
        addMessage("bot", "I see! Could you tell me how you're actually feeling right now?")
        setProcessingMessage(false)
      }
    },
    [addMessage, searchMusic],
  )

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

      if (!input.trim() || isLoading || processingMessage) return

      const userMessage = input.trim()
      addMessage("user", userMessage)
      setInput("")

      // Set processing flag to prevent double responses
      setProcessingMessage(true)

      // Check if user is asking for a specific genre of music
      const musicGenreKeywords = [
        "play",
        "music",
        "songs",
        "tracks",
        "playlist",
        "rock",
        "pop",
        "jazz",
        "classical",
        "hip hop",
        "rap",
        "country",
        "electronic",
        "dance",
        "indie",
        "folk",
        "metal",
        "blues",
        "r&b",
        "reggae",
        "soul",
        "funk",
        "disco",
        "techno",
        "house",
        "ambient",
        "lofi",
        "lo-fi",
        "chill",
        "study",
        "focus",
        "sleep",
        "relax",
      ]

      const containsMusicGenre = musicGenreKeywords.some((keyword) => userMessage.toLowerCase().includes(keyword))

      if (containsMusicGenre) {
        // Extract potential genre from message
        const genreWords = userMessage
          .toLowerCase()
          .split(" ")
          .filter(
            (word) =>
              musicGenreKeywords.includes(word) && !["play", "music", "songs", "tracks", "playlist"].includes(word),
          )

        if (genreWords.length > 0) {
          await searchMusic(genreWords.join(" "))
          setProcessingMessage(false)
          return
        }
      }

      // Handle mood confirmation responses
      if (detectedEmotion && !moodConfirmed) {
        const positiveResponses = [
          "yes",
          "yeah",
          "yep",
          "correct",
          "right",
          "true",
          "okay",
          "ok",
          "yup",
          "sure",
          "indeed",
          "exactly",
        ]
        const negativeResponses = ["no", "nope", "not", "incorrect", "wrong", "false", "nah"]

        const isPositive = positiveResponses.some((word) => userMessage.toLowerCase().includes(word))
        const isNegative = negativeResponses.some((word) => userMessage.toLowerCase().includes(word))

        if (isPositive) {
          await handleMoodConfirmation(true, detectedEmotion)
          return
        } else if (isNegative) {
          await handleMoodConfirmation(false, detectedEmotion)
          return
        } else {
          addMessage("bot", `I'm not sure if that's a yes or no. Are you feeling ${detectedEmotion.toLowerCase()}?`)
          setProcessingMessage(false)
          return
        }
      }

      // Check for complex scenarios first
      for (const [scenario, data] of Object.entries(complexScenarios)) {
        if (data.keywords.some((keyword) => userMessage.toLowerCase().includes(keyword))) {
          addMessage("bot", data.response)

          try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
            const prompt = `The user mentioned they're dealing with ${scenario}. Provide a short, empathetic response (under 50 words) about how music can help. Be conversational and friendly.`
            const result = await model.generateContent(prompt)
            const response = await result.response
            const responseText = response.text()

            addMessage("bot", responseText)
          } catch (error) {
            console.error("Error generating AI response:", error)
            addMessage("bot", "Music can be really helpful in times like these. Let me find some tracks for you.")
          }

          await searchMusic(data.genres[Math.floor(Math.random() * data.genres.length)])
          setProcessingMessage(false)
          return
        }
      }

      // Check for simple emotion keywords
      for (const [emotion, config] of Object.entries(emotionConfig)) {
        if (config.synonyms.some((synonym) => userMessage.toLowerCase().includes(synonym.toLowerCase()))) {
          setDetectedEmotion(emotion)
          addMessage(
            "bot",
            `It sounds like you might be feeling ${emotion.toLowerCase()}. Would you like some music that matches this mood?`,
          )
          setProcessingMessage(false)
          return
        }
      }

      // Use Gemini for more complex analysis
      setIsLoading(true)

      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

        const prompt = `
        Analyze this user message about their mood: "${userMessage}"
        
        Respond in this exact format:
        Emotion: [Happy/Sad/Angry/Disgust/Fear/Surprise/Neutral]
        Response: [short empathetic response under 50 words]
        WantsMusic: [yes/no]
        MusicGenre: [specific genre if mentioned, otherwise "none"]
      `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const responseText = response.text()

        const emotionMatch = responseText.match(/Emotion: (.*)/)
        const replyMatch = responseText.match(/Response: (.*)/)
        const wantsMusicMatch = responseText.match(/WantsMusic: (.*)/)
        const genreMatch = responseText.match(/MusicGenre: (.*)/)

        const newEmotion = emotionMatch?.[1]?.trim() || "Neutral"
        const empathicResponse = replyMatch?.[1]?.trim() || "Would you like some music that matches your mood?"
        const wantsMusic = wantsMusicMatch?.[1]?.trim().toLowerCase() === "yes"
        const specificGenre = genreMatch?.[1]?.trim().toLowerCase()

        setDetectedEmotion(newEmotion)
        addMessage("bot", empathicResponse)

        if (wantsMusic) {
          if (specificGenre && specificGenre !== "none") {
            await searchMusic(specificGenre)
          } else {
            await searchMusic(emotionConfig[newEmotion]?.genres?.[0] || "pop")
          }
        }
      } catch (error) {
        console.error("Error analyzing message with AI:", error)
        addMessage("bot", "I'd love to help you find some music. Could you tell me more about how you're feeling?")
      } finally {
        setIsLoading(false)
        setProcessingMessage(false)
      }
    },
    [
      input,
      isLoading,
      detectedEmotion,
      moodConfirmed,
      addMessage,
      handleMoodConfirmation,
      searchMusic,
      processingMessage,
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
                <p className="text-xs text-gray-300">Emotion-Driven Music AI</p>
              </div>
            </motion.div>

            {currentEmotion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-purple-900 to-indigo-900 px-3 py-1 rounded-full text-sm"
              >
                Mood:{" "}
                <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
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
                  key={`${index}-${message.text.substring(0, 10)}`}
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

                {/* Audio visualization */}
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
                    addMessage("bot", "I couldn't play that song. Trying another one...")
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
                placeholder="Type how you're feeling..."
                disabled={isLoading || processingMessage}
              />

              <div className="absolute right-0 mr-2 flex space-x-1">
                <motion.button
                  type="submit"
                  className={`p-2 text-purple-400 hover:text-purple-300 transition-colors duration-300 ${isLoading || processingMessage || input.trim() === "" ? "opacity-50 cursor-not-allowed" : ""}`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={isLoading || processingMessage || input.trim() === ""}
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
              <span>Tell me how you're feeling or what music you'd like</span>
              {input.length > 0 && <span>{input.length} characters</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default MoodMusicChatbot
