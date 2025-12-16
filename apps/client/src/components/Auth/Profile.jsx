import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './Auth.css'

const Profile = ({ isOpen, onClose }) => {
  const { user, updateProfile, changePassword, logout } = useAuth()
  
  // Edit profile state
  const [newUsername, setNewUsername] = useState(user?.username || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  
  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  if (!isOpen) return null

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setProfileError('')
    setProfileSuccess('')

    if (!newUsername.trim()) {
      setProfileError('Username is required')
      return
    }

    if (newUsername.trim().length < 3) {
      setProfileError('Username must be at least 3 characters')
      return
    }

    if (newUsername.trim().toLowerCase() === user.username) {
      setProfileError('Username is the same as current')
      return
    }

    setProfileLoading(true)
    try {
      await updateProfile(newUsername.trim())
      setProfileSuccess('Profile updated successfully!')
      setTimeout(() => setProfileSuccess(''), 3000)
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setPasswordSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    onClose()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>Profile Settings</h2>
          <button className="profile-close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="profile-content">
          {/* Profile Info */}
          <div className="profile-section">
            <h3>Account</h3>
            <div className="profile-info">
              <div className="profile-avatar">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="profile-details">
                <h4>@{user?.username}</h4>
                <p>Member since {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Edit Profile */}
          <div className="profile-section">
            <h3>Edit Profile</h3>
            <form className="profile-form" onSubmit={handleUpdateProfile}>
              {profileError && <div className="profile-error">{profileError}</div>}
              {profileSuccess && <div className="profile-success">{profileSuccess}</div>}
              
              <div className="form-group">
                <label htmlFor="newUsername">Username</label>
                <input
                  type="text"
                  id="newUsername"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  disabled={profileLoading}
                />
              </div>
              
              <button 
                type="submit" 
                className="profile-button"
                disabled={profileLoading}
              >
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="profile-section">
            <h3>Change Password</h3>
            <form className="profile-form" onSubmit={handleChangePassword}>
              {passwordError && <div className="profile-error">{passwordError}</div>}
              {passwordSuccess && <div className="profile-success">{passwordSuccess}</div>}
              
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={passwordLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={passwordLoading}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={passwordLoading}
                />
              </div>
              
              <button 
                type="submit" 
                className="profile-button"
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Logout */}
          <div className="profile-section">
            <button 
              className="profile-button danger"
              onClick={handleLogout}
              style={{ width: '100%' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
