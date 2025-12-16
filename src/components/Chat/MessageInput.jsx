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
  const [ocrText, setOcrText] = useState('') // Store OCR text separately
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  
  const handleSubmit = (e) => {
    e?.preventDefault()
    if ((!input.trim() && !ocrText) || isGenerating || disabled) return
    
    // Combine user input with OCR text for backend
    let fullContent = input.trim()
    if (ocrText) {
      fullContent = fullContent + (fullContent ? '\n\n' : '') + `[Image text]: ${ocrText}`
    }
    
    // Pass image data along with text for display purposes
    const imageData = uploadedImage ? {
      preview: uploadedImage.preview,
      name: uploadedImage.name,
    } : null
    
    onSend(fullContent, imageData)
    setInput('')
    setUploadedImage(null)
    setOcrText('')
    
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
    
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    setUploadedImage({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    })
    
    // Process OCR
    try {
      const text = await onImageUpload(file)
      if (text) {
        setOcrText(text) // Store OCR text separately, don't show in input
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
    setOcrText('') // Clear OCR text when image is removed
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
