// components/WebcamEmotionDetector.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Waves } from 'lucide-react';
export default function WebcamEmotionDetector({ onEmotionDetected }) {
  const [permission, setPermission] = useState(false);
  const [stream, setStream] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showScanningEffect, setShowScanningEffect] = useState(false);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();
  
  // Request camera access on component mount
  useEffect(() => {
    requestCameraPermission();
    return () => {
      // Clean up by stopping all media tracks when component unmounts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 } 
        } 
      });
      
      setPermission(true);
      setStream(stream);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Camera access denied or not available. Please check your browser permissions.");
    }
  };
  
  const cleanupAfterCapture = () => {
    setTimeout(() => {
      setShowScanningEffect(false);
      setIsLoading(false);
      setIsAnalyzing(false);
    }, 1500);
  };
  
  const handleCaptureError = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
    setIsAnalyzing(false);
    setShowScanningEffect(false);
  };
  
  const handleDetectedEmotion = (emotion) => {
    // Pass the detected emotion up to the parent component
    onEmotionDetected(emotion);
    // Navigate to the result page
    navigate('/result');
  };
  
  const captureAndDetectEmotion = () => {
    try {
      // Double check video is ready before capturing
      if (!videoRef.current || !streamRef.current) {
        throw new Error('Video element or stream not available');
      }
      
      // Ensure video dimensions are available
      if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
        console.log("Video dimensions not available yet, retrying in 500ms");
        // Try again in 500ms if video dimensions aren't ready
        setTimeout(captureAndDetectEmotion, 500);
        return;
      }
      
      setShowScanningEffect(true);
      setIsAnalyzing(true);
      
      // Create canvas with video dimensions
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const context = canvas.getContext('2d');
      // Draw the current video frame to the canvas
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to blob for upload
      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleCaptureError("I had trouble processing your image. Please try again or check your lighting.");
          return;
        }
        
        setIsLoading(true);
        
        try {
          const formData = new FormData();
          formData.append('image', blob, 'emotion-capture.jpg');
          
          // Using the API endpoint
          const response = await fetch('https://emotioncnn-satya.onrender.com/detect_emotion', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (!data.emotion) {
            throw new Error('No emotion detected in the response');
          }
          
          console.log('Detected emotion:', data.emotion);
          
          // Handle the detected emotion and navigate
          handleDetectedEmotion(data.emotion);
        } catch (error) {
          console.error('Error detecting mood:', error);
          handleCaptureError("I had trouble analyzing your mood. This could be due to lighting or network issues.");
        } finally {
          cleanupAfterCapture();
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Error capturing image:', err);
      handleCaptureError("I had trouble capturing your image. Please check that your camera is working properly.");
    }
  };

  return (
    <>
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
          </div>
        </motion.div>
        
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-8 text-purple-400">Mood Detector</h1>
      
      {error && (
        <div className="bg-red-900 text-white p-4 rounded-lg mb-6 w-full max-w-2xl">
          {error}
        </div>
      )}
      
      <div className="relative w-full max-w-2xl rounded-xl overflow-hidden bg-gray-800 shadow-lg mb-8">
        {/* Video feed */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="w-full h-64 md:h-96 object-cover"
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-t-purple-500 border-b-purple-500 border-l-transparent border-r-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-purple-400 text-xl">Analyzing your mood...</p>
            </div>
          </div>
        )}
      </div>
      
      <button 
        onClick={captureAndDetectEmotion}
        disabled={isAnalyzing || !permission}
        className={`px-8 py-4 rounded-full font-semibold text-xl mb-6 transition-all ${
          isAnalyzing 
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-500/50'
        }`}
      >
        {isAnalyzing ? 'Analyzing...' : 'Capture My Mood'}
      </button>
      
      {/* CSS for scanning animation */}
      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
        
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
    </>
  );
}