import { useState, useRef } from 'react'
import { SendIcon, ImageIcon, CloseIcon } from '../Icons'
import './MessageInput.css'

const MessageInput = ({ 
  onSend, 
  onImageUpload,
  isGenerating, 
  isProcessingOCR,
  disabled 
}) => {
  const [input, setInput] = useState('')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  
  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!input.trim() || isGenerating || disabled) return
    
    onSend(input)
    setInput('')
    setUploadedImage(null)
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  const handleInputChange = (e) => {
    setInput(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }
  
  const handleFileSelect = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    
    setUploadedImage({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    })
    
    // Process OCR
    try {
      const text = await onImageUpload(file)
      if (text) {
        setInput(prev => prev + (prev ? '\n\n' : '') + `[Image text]: ${text}`)
      }
    } catch (err) {
      console.error('OCR failed:', err)
    }
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files[0]
    handleFileSelect(file)
  }
  
  const handleDragOver = (e) => {
    e.preventDefault()
    setDragActive(true)
  }
  
  const handleDragLeave = () => {
    setDragActive(false)
  }
  
  const removeImage = () => {
    if (uploadedImage?.preview) {
      URL.revokeObjectURL(uploadedImage.preview)
    }
    setUploadedImage(null)
  }

  return (
    <form 
      className={`message-input-container ${dragActive ? 'drag-active' : ''}`}
      onSubmit={handleSubmit}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {uploadedImage && (
        <div className="uploaded-image-preview">
          <img src={uploadedImage.preview} alt={uploadedImage.name} />
          <button type="button" className="remove-image" onClick={removeImage}>
            <CloseIcon />
          </button>
          {isProcessingOCR && (
            <div className="ocr-processing">
              <span>Processing OCR...</span>
            </div>
          )}
        </div>
      )}
      
      <div className="input-wrapper">
        <button 
          type="button" 
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isGenerating}
        >
          <ImageIcon />
        </button>
        
        <textarea
          ref={textareaRef}
          className="message-textarea"
          placeholder="Message..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isGenerating || disabled}
          rows={1}
        />
        
        <button 
          type="submit" 
          className={`send-btn ${input.trim() ? 'active' : ''}`}
          disabled={!input.trim() || isGenerating || disabled}
        >
          <SendIcon />
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files[0])}
        style={{ display: 'none' }}
      />
      
      {dragActive && (
        <div className="drag-overlay">
          <ImageIcon />
          <span>Drop image here</span>
        </div>
      )}
    </form>
  )
}

export default MessageInput
