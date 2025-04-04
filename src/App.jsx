// App.jsx
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import WebcamEmotionDetector from './components/WebcamEmotionDetector';
import MoodMusicChartbot from './components/MoodMusicChatbot';
function App() {
  const [detectedEmotion, setDetectedEmotion] = useState(null);

  const handleEmotionDetected = (emotion) => {
    setDetectedEmotion(emotion);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={<WebcamEmotionDetector onEmotionDetected={handleEmotionDetected} />} 
        />
        <Route 
          path="/result" 
          element={
            detectedEmotion ? 
              <MoodMusicChartbot emotion={detectedEmotion} /> : 
              <Navigate to="/" replace />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;